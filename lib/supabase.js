import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://ijwswszfdsucjizzndvj.supabase.co';
const supabaseAnonKey = 'sb_publishable_sqvzi1HHD68vssd7kXZzTg_UovMFFxK';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});