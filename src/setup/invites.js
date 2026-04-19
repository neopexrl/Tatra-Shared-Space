import { supabase } from './supabase';
import { createNotification, createNotifications } from './notifications';

/* ─── helpers ─── */

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }
  return supabase;
}

async function getUserName(userIban) {
  const client = requireSupabase();
  const { data } = await client
    .from('users')
    .select('name')
    .eq('user_iban', userIban)
    .single();
  return data?.name || userIban;
}

async function getRoomName(roomIban) {
  const client = requireSupabase();
  const { data } = await client
    .from('rooms')
    .select('name')
    .eq('room_iban', roomIban)
    .single();
  return data?.name || roomIban;
}

async function isAlreadyMember(roomIban, userIban) {
  const client = requireSupabase();
  const { data } = await client
    .from('room_members')
    .select('user_iban')
    .eq('room_iban', roomIban)
    .eq('user_iban', userIban)
    .maybeSingle();
  return !!data;
}

async function getRoomMemberIbans(roomIban) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('room_members')
    .select('user_iban')
    .eq('room_iban', roomIban);
  if (error) throw error;
  return (data || []).map((m) => m.user_iban);
}

/* ─── Create Invite ─── */

/**
 * Create a room invite with full validation:
 * - No self-invite
 * - No invite if user is already a member
 * - No duplicate pending invite for same (room, user)
 */
export async function createRoomInvite(roomIban, invitedUserIban, invitedByUserIban) {
  const client = requireSupabase();

  // 1. No self-invite
  if (invitedUserIban === invitedByUserIban) {
    throw new Error('Cannot invite yourself to a room.');
  }

  // 2. Check if already a member
  if (await isAlreadyMember(roomIban, invitedUserIban)) {
    throw new Error('User is already a member of this room.');
  }

  // 3. Check for existing pending invite
  const { data: existing } = await client
    .from('room_invites')
    .select('id')
    .eq('room_iban', roomIban)
    .eq('invited_user_iban', invitedUserIban)
    .eq('status', 'pending')
    .maybeSingle();

  if (existing) {
    throw new Error('A pending invite already exists for this user in this room.');
  }

  // 4. Create the invite
  const { data: invite, error } = await client
    .from('room_invites')
    .insert({
      room_iban: roomIban,
      invited_user_iban: invitedUserIban,
      invited_by_user_iban: invitedByUserIban,
      status: 'pending',
    })
    .select()
    .single();
  if (error) throw error;

  // 5. Send notification to the invited user
  const [inviterName, roomName] = await Promise.all([
    getUserName(invitedByUserIban),
    getRoomName(roomIban),
  ]);

  await createNotification(
    invitedUserIban,
    'room_invite',
    'Invitation to room',
    `${inviterName} invited you to ${roomName}`,
    {
      invite_id: invite.id,
      room_iban: roomIban,
      invited_by_user_iban: invitedByUserIban,
    }
  );

  return invite;
}

/* ─── Read Pending Invites ─── */

export async function getPendingInvitesForUser(userIban) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('room_invites')
    .select('*')
    .eq('invited_user_iban', userIban)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;

  // Enrich with room name and inviter name
  const enriched = await Promise.all(
    (data || []).map(async (inv) => {
      const [roomName, inviterName] = await Promise.all([
        getRoomName(inv.room_iban),
        getUserName(inv.invited_by_user_iban),
      ]);
      return { ...inv, room_name: roomName, inviter_name: inviterName };
    })
  );

  return enriched;
}

/* ─── Accept Invite ─── */

/**
 * Robust accept flow:
 * 1. Load invite, verify status = 'pending'
 * 2. Verify user is not already in room_members
 * 3. Insert into room_members FIRST
 * 4. Only after successful membership insert → update invite status
 * 5. Then send joined notifications to existing members (batch)
 *
 * This ordering ensures we never end up with 'accepted' status
 * but the user not actually being in the room.
 */
export async function acceptRoomInvite(inviteId) {
  const client = requireSupabase();

  // 1. Load invite
  const { data: invite, error: loadErr } = await client
    .from('room_invites')
    .select('*')
    .eq('id', inviteId)
    .single();
  if (loadErr) throw loadErr;
  if (!invite) throw new Error('Invite not found.');

  // 2. Verify pending
  if (invite.status !== 'pending') {
    throw new Error(`Invite is not pending (current status: ${invite.status}).`);
  }

  // 3. Verify not already a member
  if (await isAlreadyMember(invite.room_iban, invite.invited_user_iban)) {
    // Fix inconsistent state: mark invite as accepted since user is already in room
    await client
      .from('room_invites')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', inviteId);
    throw new Error('User is already a member of this room.');
  }

  // 4. Get existing members BEFORE inserting the new one (for notifications later)
  const existingMemberIbans = await getRoomMemberIbans(invite.room_iban);

  // 5. Insert into room_members FIRST (before marking accepted)
  const { error: memberErr } = await client
    .from('room_members')
    .insert({ room_iban: invite.room_iban, user_iban: invite.invited_user_iban, role: 'member' })
    .select()
    .single();

  if (memberErr) {
    // Membership insert failed — do NOT update invite status
    throw new Error(`Failed to add member to room: ${memberErr.message}`);
  }

  // 6. Only now mark invite as accepted
  const { error: updateErr } = await client
    .from('room_invites')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', inviteId);
  if (updateErr) {
    // Non-critical: user is in the room, but invite status didn't update
    console.error('Failed to update invite status:', updateErr);
  }

  // 7. Notify existing members (batch) — exclude the new member
  if (existingMemberIbans.length > 0) {
    const [userName, roomName] = await Promise.all([
      getUserName(invite.invited_user_iban),
      getRoomName(invite.room_iban),
    ]);

    const notificationRows = existingMemberIbans.map((memberIban) => ({
      user_iban: memberIban,
      type: 'room_member_joined',
      title: 'New member joined',
      body: `${userName} joined ${roomName}`,
      data: {
        room_iban: invite.room_iban,
        joined_user_iban: invite.invited_user_iban,
      },
    }));

    await createNotifications(notificationRows);
  }

  return invite;
}

/* ─── Decline Invite ─── */

export async function declineRoomInvite(inviteId) {
  const client = requireSupabase();

  // Load invite to verify it exists and is pending
  const { data: invite, error: loadErr } = await client
    .from('room_invites')
    .select('*')
    .eq('id', inviteId)
    .single();
  if (loadErr) throw loadErr;
  if (!invite) throw new Error('Invite not found.');

  if (invite.status !== 'pending') {
    throw new Error(`Invite is not pending (current status: ${invite.status}).`);
  }

  const { data, error } = await client
    .from('room_invites')
    .update({ status: 'declined', responded_at: new Date().toISOString() })
    .eq('id', inviteId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/* ─── Direct Member Add with Notifications ─── */

/**
 * Directly add a user to a room (bypassing invite flow).
 * Only notifies existing members if the user was actually inserted.
 * Silently returns if the user is already a member.
 */
export async function addRoomMemberAndNotify(roomIban, userIban) {
  const client = requireSupabase();

  // Check if already a member — if so, do nothing
  if (await isAlreadyMember(roomIban, userIban)) {
    return null;
  }

  // Get existing members BEFORE inserting
  const existingMemberIbans = await getRoomMemberIbans(roomIban);

  // Insert member
  const { data: member, error } = await client
    .from('room_members')
    .insert({ room_iban: roomIban, user_iban: userIban })
    .select()
    .single();

  if (error) {
    // Could be a race condition duplicate — check if it's a unique violation
    if (error.code === '23505') {
      // Already a member (race condition), do nothing
      return null;
    }
    throw error;
  }

  // Notify existing members (batch)
  if (existingMemberIbans.length > 0) {
    const [userName, roomName] = await Promise.all([
      getUserName(userIban),
      getRoomName(roomIban),
    ]);

    const notificationRows = existingMemberIbans.map((memberIban) => ({
      user_iban: memberIban,
      type: 'room_member_joined',
      title: 'New member joined',
      body: `${userName} joined ${roomName}`,
      data: {
        room_iban: roomIban,
        joined_user_iban: userIban,
      },
    }));

    await createNotifications(notificationRows);
  }

  return member;
}
