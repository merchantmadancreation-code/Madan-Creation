import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ufnxhyguehzrpccsolfx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmbnhoeWd1ZWh6cnBjY3NvbGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTk0NDYsImV4cCI6MjA4NjI5NTQ0Nn0.yvfviDZC2A2LniMkmbbwb7ziXPzvhFGE5UJdFc-6YeU';

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
    const { data, error } = await supabase
        .from('styles')
        .select('id, styleNo')
        .limit(10);
    
    if (error) {
        console.error("Error:", error);
    } else {
        const missing = data.filter(s => !s.styleNo).length;
        console.log(`PO Form query fetched 10 styles. Missing styleNo: ${missing}`);
        console.log("First 5 styles:", data.slice(0, 5));
    }
}

test();
