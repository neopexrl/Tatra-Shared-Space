import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wctcuuftrcqrfaqgkoxc.supabase.co';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

if (!SUPABASE_KEY) {
  console.warn('Missing Supabase `.env` variables (KEY). Make sure `.env` is loaded properly.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/* ─── users ─── */
export async function getUsers() {
  const { data, error } = await supabase.from('users').select('*');
  if (error) throw error;
  return data;
}

export async function getUserBalance(userIban) {
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
  const { data, error } = await supabase.from('rooms').select('*');
  if (error) throw error;
  return data;
}

export async function getRoomBalance(roomIban) {
  const { data, error } = await supabase
    .from('rooms')
    .select('balance')
    .eq('room_iban', roomIban)
    .single();
  if (error) throw error;
  return data.balance;
}

export async function createRoom(roomIban, name, balance = 0) {
  const { data, error } = await supabase
    .from('rooms')
    .insert({ room_iban: roomIban, name, balance })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addRoomMember(roomIban, userIban) {
  const { data, error } = await supabase
    .from('room_members')
    .insert({ room_iban: roomIban, user_iban: userIban })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/* ─── room members ─── */
export async function getRoomMembers(roomIban) {
  const { data, error } = await supabase
    .from('room_members')
    .select('*')
    .eq('room_iban', roomIban);
  if (error) throw error;
  return data;
}

export async function getUserRooms(userIban) {
  const { data, error } = await supabase
    .from('room_members')
    .select('*')
    .eq('user_iban', userIban);
  if (error) throw error;
  return data;
}

/* ─── goals ─── */
export async function getGoalsForRoom(roomIban) {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('room_iban', roomIban);
  if (error) throw error;
  return data;
}

export async function createGoal(roomIban, name, amount) {
  const { data, error } = await supabase
    .from('goals')
    .insert({ room_iban: roomIban, name, amount })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/* ─── transactions ─── */
export async function getTransactionsForRoom(roomIban) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .or(`from_iban.eq.${roomIban},to_iban.eq.${roomIban}`);
  if (error) throw error;
  return data;
}

export async function getTransactionsForUser(userIban) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .or(`from_iban.eq.${userIban},to_iban.eq.${userIban}`);
  if (error) throw error;
  return data;
}

export async function addTransaction(fromIban, toIban, amount) {
  const { data, error } = await supabase
    .from('transactions')
    .insert({ from_iban: fromIban, to_iban: toIban, amount })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/* ─── composite: send money to room ─── */
export async function sendToRoom(userIban, roomIban, amount) {
  // insert transaction
  const tx = await addTransaction(userIban, roomIban, amount);

  // decrease user balance
  const userBal = await getUserBalance(userIban);
  await supabase
    .from('users')
    .update({ balance: userBal - amount })
    .eq('user_iban', userIban);

  // increase room balance
  const roomBal = await getRoomBalance(roomIban);
  await supabase
    .from('rooms')
    .update({ balance: roomBal + amount })
    .eq('room_iban', roomIban);

  return tx;
}

/* ─── composite: send from room to user ─── */
export async function sendFromRoom(roomIban, userIban, amount) {
  const tx = await addTransaction(roomIban, userIban, amount);

  const roomBal = await getRoomBalance(roomIban);
  await supabase
    .from('rooms')
    .update({ balance: roomBal - amount })
    .eq('room_iban', roomIban);

  const userBal = await getUserBalance(userIban);
  await supabase
    .from('users')
    .update({ balance: userBal + amount })
    .eq('user_iban', userIban);

  return tx;
}
