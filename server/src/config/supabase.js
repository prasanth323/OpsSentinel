import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import WebSocket from 'ws';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bopuniqqtnsvlmehbmxo.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

export let supabase = null;

if (SUPABASE_KEY && SUPABASE_KEY.trim() !== '' && SUPABASE_KEY !== 'YOUR_SUPABASE_ANON_KEY') {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false },
      realtime: { transport: WebSocket }
    });
    console.log(`[OpsSentinel DB] Connected to Supabase Project: ${SUPABASE_URL}`);
  } catch (err) {
    console.warn('[OpsSentinel DB] Failed to initialize Supabase client:', err.message);
  }
} else {
  console.log(`[OpsSentinel DB] Supabase URL set to ${SUPABASE_URL}. Awaiting SUPABASE_KEY in .env.`);
}

export default supabase;
