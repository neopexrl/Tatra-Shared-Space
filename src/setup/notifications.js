import { supabase } from './supabase';

/* ─── helpers ─── */

function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }
  return supabase;
}

/* ─── single notification ─── */

export async function createNotification(userIban, type, title, body, data = {}) {
  const client = requireSupabase();
  const { data: row, error } = await client
    .from('notifications')
    .insert({ user_iban: userIban, type, title, body, data })
    .select()
    .single();
  if (error) throw error;
  return row;
}

/* ─── batch notification (preferred for multi-user) ─── */

/**
 * Insert multiple notifications in a single Supabase call.
 * @param {Array<{user_iban: string, type: string, title: string, body: string, data?: object}>} rows
 * @returns {Promise<Array>} inserted rows
 */
export async function createNotifications(rows) {
  if (!rows || rows.length === 0) return [];
  const client = requireSupabase();

  // Ensure every row has a data field defaulting to {}
  const prepared = rows.map((r) => ({
    user_iban: r.user_iban,
    type: r.type,
    title: r.title,
    body: r.body,
    data: r.data || {},
  }));

  const { data, error } = await client
    .from('notifications')
    .insert(prepared)
    .select();
  if (error) throw error;
  return data;
}

/* ─── read ─── */

export async function getNotificationsForUser(userIban) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('notifications')
    .select('*')
    .eq('user_iban', userIban)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/* ─── mark read ─── */

export async function markNotificationRead(notificationId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markAllNotificationsRead(userIban) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('notifications')
    .update({ is_read: true })
    .eq('user_iban', userIban)
    .eq('is_read', false)
    .select();
  if (error) throw error;
  return data;
}
