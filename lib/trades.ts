// app/lib/trades.ts
import { supabase } from '../lib/supabase';

export type TradeStatus = 'pending' | 'confirmed' | 'denied' | 'canceled';

type CommonGuard = {
  id: string;
  userId: string;         // current auth user id
};

export async function confirmTrade({ id, userId }: CommonGuard) {
  // receiver-only action; guard with WHERE receiver_id = userId AND status = 'pending'
  const { error, data } = await supabase
    .from('swaps')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('receiver_id', userId)
    .eq('status', 'pending')
    .select('id, status'); // optional select to verify update
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('Trade not found or already resolved.');
  return data[0];
}

export async function denyTrade({ id, userId }: CommonGuard) {
  const { error, data } = await supabase
    .from('swaps')
    .update({ status: 'denied', denied_at: new Date().toISOString() })
    .eq('id', id)
    .eq('receiver_id', userId)
    .eq('status', 'pending')
    .select('id, status');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('Trade not found or already resolved.');
  return data[0];
}

export async function cancelTrade({ id, userId }: CommonGuard) {
  // sender-only action; guard with WHERE sender_id = userId AND status = 'pending'
  const { error, data } = await supabase
    .from('swaps')
    .update({ status: 'canceled', canceled_at: new Date().toISOString() })
    .eq('id', id)
    .eq('sender_id', userId)
    .eq('status', 'pending')
    .select('id, status');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('Trade not found or already resolved.');
  return data[0];
}
