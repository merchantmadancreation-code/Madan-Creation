import { createClient } from '@supabase/supabase-js';

// These should ideally be in a .env file
// process.env.VITE_SUPABASE_URL
// process.env.VITE_SUPABASE_ANON_KEY

// FOR NOW: Replace these strings with your actual Project URL and Anon Key
const supabaseUrl = 'https://ufnxhyguehzrpccsolfx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmbnhoeWd1ZWh6cnBjY3NvbGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTk0NDYsImV4cCI6MjA4NjI5NTQ0Nn0.yvfviDZC2A2LniMkmbbwb7ziXPzvhFGE5UJdFc-6YeU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
