import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
}

export interface Room {
  id: string;
  name: string;
  is_private: boolean;
  password?: string;
  created_at: string;
  created_by: string;
}

export interface Message {
  id: string;
  user_id: string;
  room_id: string;
  content: string;
  created_at: string;
  profiles?: Profile;
}
