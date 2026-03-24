import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs';

const supabaseUrl = 'https://ufnxhyguehzrpccsolfx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmbnhoeWd1ZWh6cnBjY3NvbGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTk0NDYsImV4cCI6MjA4NjI5NTQ0Nn0.yvfviDZC2A2LniMkmbbwb7ziXPzvhFGE5UJdFc-6YeU';

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
    const { data, error } = await supabase.from('styles').select('*').limit(1);
    
    if (error) {
        console.error("Error:", error);
    } else if (data && data.length > 0) {
        const columns = Object.keys(data[0]).filter(k => k !== 'image').join(', ');
        fs.writeFileSync('columns.txt', columns);
        console.log("Wrote columns to columns.txt");
    }
}

test();
