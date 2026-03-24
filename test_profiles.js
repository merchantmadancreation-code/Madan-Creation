import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ufnxhyguehzrpccsolfx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmbnhoeWd1ZWh6cnBjY3NvbGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTk0NDYsImV4cCI6MjA4NjI5NTQ0Nn0.yvfviDZC2A2LniMkmbbwb7ziXPzvhFGE5UJdFc-6YeU';

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
    // Attempt an insert to see what fails
    console.log("Testing insert into profiles...");
    const { data, error } = await supabase.from('profiles').insert([{ id: '11111111-1111-1111-1111-111111111111', email: 'test@example.com' }]);
    if (error) {
        console.error("Profiles insert error:", error);
    } else {
        console.log("Success");
    }
}

test();
