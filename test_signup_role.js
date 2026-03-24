import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ufnxhyguehzrpccsolfx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmbnhoeWd1ZWh6cnBjY3NvbGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTk0NDYsImV4cCI6MjA4NjI5NTQ0Nn0.yvfviDZC2A2LniMkmbbwb7ziXPzvhFGE5UJdFc-6YeU';

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
    console.log("Testing auth.signUp() with role...");
    const { data, error } = await supabase.auth.signUp({
        email: 'testbot_with_role_222@example.com',
        password: 'Password123!',
        options: {
            data: {
                full_name: 'Test Bot',
                role: 'user'
            }
        }
    });

    if (error) {
        console.error("SignUp Error:", error.message);
    } else {
        console.log("Success! User created:", data.user?.id);
    }
}

test();
