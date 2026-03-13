import { createClient } from '@supabase/supabase-js';

// Sử dụng biến môi trường (Environment Variables)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Thiếu cấu hình Supabase trong file .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);