import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ufnxhyguehzrpccsolfx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmbnhoeWd1ZWh6cnBjY3NvbGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTk0NDYsImV4cCI6MjA4NjI5NTQ0Nn0.yvfviDZC2A2LniMkmbbwb7ziXPzvhFGE5UJdFc-6YeU';

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    
    if (error) {
        console.error("Select Error:", error.message);
    } else {
        if (data && data.length > 0) {
            console.log("Profiles Columns:", Object.keys(data[0]).join(', '));
            console.log("Sample Profile:", JSON.stringify(data[0], null, 2));
        } else {
            console.log("Profiles table is accessible but empty. Cannot infer columns without data.");
        }
    }
}

test();
