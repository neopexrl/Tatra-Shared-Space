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

export async function createRoom(roomIban, name, balance = 0) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('rooms')
    .insert({ room_iban: roomIban, name, balance })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addRoomMember(roomIban, userIban) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('room_members')
    .insert({ room_iban: roomIban, user_iban: userIban })
    .select()
    .single();
  if (error) throw error;
  return data;
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
