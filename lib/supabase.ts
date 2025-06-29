import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dsivhrumkuileojbkffm.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzaXZocnVta3VpbGVvamJrZmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MTgxNDUsImV4cCI6MjA2NjI5NDE0NX0.TYkUH-VsG59vHxsGwudmRfWwaSf6QuvCBZfR0sLLV14';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
