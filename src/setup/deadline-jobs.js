import { supabase } from './supabase';
import { createNotifications } from './notifications';

/* ─── helpers ─── */

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }
  return supabase;
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

async function getRoomName(roomIban) {
  const client = requireSupabase();
  const { data } = await client
    .from('rooms')
    .select('name')
    .eq('room_iban', roomIban)
    .single();
  return data?.name || roomIban;
}

/* ─── Process Expiring Goals (1 hour) ─── */

/**
 * Find goals expiring within 1 hour that haven't been notified yet.
 * For each goal, create a notification for every room member (batch).
 * Then mark the goal as notified.
 *
 * This is a callable function — invoke manually or via Supabase Edge Function / cron.
 */
export async function processExpiringGoals1h() {
  const client = requireSupabase();

  // Find goals expiring within 1 hour, not yet notified
  const now = new Date().toISOString();
  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const { data: goals, error } = await client
    .from('goals')
    .select('*')
    .not('date', 'is', null)
    .gt('date', now)
    .lte('date', oneHourFromNow)
    .eq('notified_expiring_1h', false);

  if (error) throw error;
  if (!goals || goals.length === 0) return { processed: 0 };

  let totalNotified = 0;

  for (const goal of goals) {
    // Get room name and members
    const [roomName, memberIbans] = await Promise.all([
      getRoomName(goal.room_iban),
      getRoomMemberIbans(goal.room_iban),
    ]);

    if (memberIbans.length > 0) {
      // Build batch notification rows
      const notificationRows = memberIbans.map((userIban) => ({
        user_iban: userIban,
        type: 'goal_expiring_1h',
        title: 'Goal ending soon',
        body: `Goal "${goal.name}" in room "${roomName}" ends in less than 1 hour`,
        data: {
          goal_id: goal.id,
          room_iban: goal.room_iban,
          expires_at: goal.date,
        },
      }));

      await createNotifications(notificationRows);
      totalNotified += memberIbans.length;
    }

    // Mark goal as notified only after notifications sent successfully
    const { error: updateErr } = await client
      .from('goals')
      .update({ notified_expiring_1h: true })
      .eq('id', goal.id);

    if (updateErr) {
      console.error(`Failed to mark goal ${goal.id} as notified:`, updateErr);
    }
  }

  return { processed: goals.length, notifications_sent: totalNotified };
}

/* ─── Process Expiring Rooms (1 hour) ─── */

/**
 * Find rooms expiring within 1 hour that haven't been notified yet.
 * For each room, create a notification for every room member (batch).
 * Then mark the room as notified.
 *
 * This is a callable function — invoke manually or via Supabase Edge Function / cron.
 */
export async function processExpiringRooms1h() {
  const client = requireSupabase();

  const now = new Date().toISOString();
  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const { data: rooms, error } = await client
    .from('rooms')
    .select('*')
    .not('expiration_date', 'is', null)
    .gt('expiration_date', now)
    .lte('expiration_date', oneHourFromNow)
    .eq('notified_expiring_1h', false);

  if (error) throw error;
  if (!rooms || rooms.length === 0) return { processed: 0 };

  let totalNotified = 0;

  for (const room of rooms) {
    const memberIbans = await getRoomMemberIbans(room.room_iban);

    if (memberIbans.length > 0) {
      const notificationRows = memberIbans.map((userIban) => ({
        user_iban: userIban,
        type: 'room_expiring_1h',
        title: 'Room ending soon',
        body: `Room "${room.name}" ends in less than 1 hour`,
        data: {
          room_iban: room.room_iban,
          expires_at: room.expiration_date,
        },
      }));

      await createNotifications(notificationRows);
      totalNotified += memberIbans.length;
    }

    // Mark room as notified only after notifications sent successfully
    const { error: updateErr } = await client
      .from('rooms')
      .update({ notified_expiring_1h: true })
      .eq('room_iban', room.room_iban);

    if (updateErr) {
      console.error(`Failed to mark room ${room.room_iban} as notified:`, updateErr);
    }
  }

  return { processed: rooms.length, notifications_sent: totalNotified };
}

/* ─── Combined: Process All Deadline Notifications ─── */

/**
 * Calls both deadline processors sequentially.
 * Returns summary of what was processed.
 */
export async function processDeadlineNotifications() {
  const goalsResult = await processExpiringGoals1h();
  const roomsResult = await processExpiringRooms1h();

  return {
    goals: goalsResult,
    rooms: roomsResult,
  };
}
