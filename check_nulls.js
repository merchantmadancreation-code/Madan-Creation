import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ufnxhyguehzrpccsolfx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmbnhoeWd1ZWh6cnBjY3NvbGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTk0NDYsImV4cCI6MjA4NjI5NTQ0Nn0.yvfviDZC2A2LniMkmbbwb7ziXPzvhFGE5UJdFc-6YeU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkNulls() {
    const { data, error } = await supabase.from('styles').select('styleNo, buyerName, fabricName');
    if (error) {
        console.error(error);
        return;
    }

    console.log(`Checking ${data.length} styles...`);
    data.forEach((s, i) => {
        if (!s.styleNo || !s.buyerName || !s.fabricName) {
            console.log(`Style ${i} has missing fields:`, s);
        }
    });
}

checkNulls();
