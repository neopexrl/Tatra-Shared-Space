import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://wctcuuftrcqrfaqgkoxc.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  '';
const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!SUPABASE_ANON_KEY) {
  console.warn('Missing Supabase public `.env` variable (ANON KEY). Make sure `.env` is loaded properly.');
}

export const supabase = hasSupabaseConfig ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }

  return supabase;
}

/* ─── users ─── */
export async function getUsers() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('users').select('*');
  if (error) throw error;
  return data;
}

export async function getUserBalance(userIban) {
  if (!supabase) return 0;
  const { data, error } = await supabase
    .from('users')
    .select('balance')
    .eq('user_iban', userIban)
    .single();
  if (error) throw error;
  return data.balance;
}

/* ─── rooms ─── */
export async function getRooms() {
  if (!supabase) return [];
  const { data, error } = await supabase.from('rooms').select('*');
  if (error) throw error;
  return data;
}

export async function getRoomBalance(roomIban) {
  if (!supabase) return 0;
  const { data, error } = await supabase
    .from('rooms')
    .select('balance')
    .eq('room_iban', roomIban)
    .single();
  if (error) throw error;
  return data.balance;
}

export async function createRoom(roomIban, name, balance = 0, createdByUserIban = null, mode = null) {
  const client = requireSupabase();
  const row = { room_iban: roomIban, name, balance };
  if (createdByUserIban) {
    row.created_by_user_iban = createdByUserIban;
  }
  if (mode) {
    row.mode = mode;
  }
  const { data, error } = await client
    .from('rooms')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addRoomMember(roomIban, userIban, role = 'member') {
  const client = requireSupabase();
  // Try with role first, fallback without if column doesn't exist
  try {
    const { data, error } = await client
      .from('room_members')
      .insert({ room_iban: roomIban, user_iban: userIban, role })
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    // Fallback if role column doesn't exist yet
    if (err.message?.includes('role')) {
      const { data, error } = await client
        .from('room_members')
        .insert({ room_iban: roomIban, user_iban: userIban })
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    throw err;
  }
}

export async function removeRoomMember(roomIban, userIban) {
  const client = requireSupabase();
  const { error } = await client
    .from('room_members')
    .delete()
    .eq('room_iban', roomIban)
    .eq('user_iban', userIban);
  if (error) throw error;
}

/* ─── room members ─── */
export async function getRoomMembers(roomIban) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('room_members')
    .select('*')
    .eq('room_iban', roomIban);
  if (error) throw error;
  return data;
}

export async function getUserRooms(userIban) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('room_members')
    .select('*')
    .eq('user_iban', userIban);
  if (error) throw error;
  return data;
}

export async function getRoomSpending(roomIban) {
  if (!supabase) return {};
  const { data: checks, error: checksError } = await supabase
    .from('checks')
    .select('*')
    .eq('room_iban', roomIban);
  if (checksError) throw checksError;

  const spending = {};
  
  for (const check of checks || []) {
    const { data: items, error: itemsError } = await supabase
      .from('check_list')
      .select('*')
      .eq('check_id', check.id);
    if (itemsError) throw itemsError;

    for (const item of items || []) {
      if (item.user_iban) {
        spending[item.user_iban] = (spending[item.user_iban] || 0) + Number(item.amount || 0);
      }
    }
  }

  return spending;
}

export async function closeRoom(roomIban, closedAt = null) {
  const client = requireSupabase();
  const { error } = await client
    .from('rooms')
    .update({ 
      status: 'closed',
      closed_at: closedAt || new Date().toISOString()
    })
    .eq('room_iban', roomIban);
  if (error) throw error;
}

export async function updateRoomName(roomIban, name) {
  const client = requireSupabase();
  const { error } = await client
    .from('rooms')
    .update({ name })
    .eq('room_iban', roomIban);
  if (error) throw error;
}

/* ─── goals ─── */
export async function getGoalsForRoom(roomIban) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('room_iban', roomIban);
  if (error) throw error;
  return data;
}

export async function createGoal(roomIban, name, amount) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('goals')
    .insert({ room_iban: roomIban, name, amount })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/* ─── transactions ─── */
export async function getTransactionsForRoom(roomIban) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .or(`from_iban.eq.${roomIban},to_iban.eq.${roomIban}`);
  if (error) throw error;
  return data;
}

export async function getTransactionsForUser(userIban) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .or(`from_iban.eq.${userIban},to_iban.eq.${userIban}`);
  if (error) throw error;
  return data;
}

export async function addTransaction(fromIban, toIban, amount) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('transactions')
    .insert({ from_iban: fromIban, to_iban: toIban, amount })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/* ─── composite: send money to room ─── */
export async function sendToRoom(userIban, roomIban, amount) {
  const client = requireSupabase();
  // insert transaction
  const tx = await addTransaction(userIban, roomIban, amount);

  // decrease user balance
  const userBal = await getUserBalance(userIban);
  await client
    .from('users')
    .update({ balance: userBal - amount })
    .eq('user_iban', userIban);

  // increase room balance
  const roomBal = await getRoomBalance(roomIban);
  await client
    .from('rooms')
    .update({ balance: roomBal + amount })
    .eq('room_iban', roomIban);

  return tx;
}

/* ─── composite: send from room to user ─── */
export async function sendFromRoom(roomIban, userIban, amount) {
  const client = requireSupabase();
  const tx = await addTransaction(roomIban, userIban, amount);

  const roomBal = await getRoomBalance(roomIban);
  await client
    .from('rooms')
    .update({ balance: roomBal - amount })
    .eq('room_iban', roomIban);

  const userBal = await getUserBalance(userIban);
  await client
    .from('users')
    .update({ balance: userBal + amount })
    .eq('user_iban', userIban);

  return tx;
}

/* ─── check lists (shopping trips) ─── */
export async function getChecks(roomIban) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('checks')
    .select('*')
    .eq('room_iban', roomIban)
    .order('id', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createCheck(roomIban, amount, location, photo = null) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('checks')
    .insert({ room_iban: roomIban, amount, location, photo })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getCheckListItems(checkId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('check_list')
    .select('*')
    .eq('check_id', checkId)
    .order('id', { ascending: true });
  if (error) throw error;
  return data;
}

export async function addCheckItem(checkId, name, amount, userIban) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('check_list')
    .insert({ check_id: checkId, name, amount, user_iban: userIban })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function batchAddCheckItems(checkId, itemsJson = []) {
  const client = requireSupabase();
  const rows = itemsJson.map(item => ({
    check_id: checkId,
    name: item.name || 'Unknown',
    amount: item.price || item.qty * (item.price || 0) || 0,
    user_iban: null // initially unclaimed
  }));
  if (rows.length === 0) return [];

  const { data, error } = await client
    .from('check_list')
    .insert(rows)
    .select();
  if (error) throw error;
  return data;
}

export async function toggleCheckItemClaim(itemId, currentUserIban, itemCurrentUserIban) {
  const client = requireSupabase();
  // if it's already claimed by me, unclaim it. If claimed by someone else, overwrite it.
  const newOwner = (itemCurrentUserIban === currentUserIban) ? null : currentUserIban;
  
  const { data, error } = await client
    .from('check_list')
    .update({ user_iban: newOwner })
    .eq('id', itemId)
    .select()
    .single();
  if (error) throw error;
  return data;
}


/* ─── reminders ─── */
export async function getReminders(roomIban) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('room_iban', roomIban)
    .order('created_at', { ascending: false });
    
  if (error && error.code !== '42P01') throw error;
  return data || [];
}

export async function createReminder(roomIban, userIban, message) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('reminders')
    .insert({ room_iban: roomIban, user_iban: userIban, message })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleReminder(reminderId, isCompleted) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('reminders')
    .update({ is_completed: isCompleted })
    .eq('id', reminderId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
