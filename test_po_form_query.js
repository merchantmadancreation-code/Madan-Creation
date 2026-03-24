import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ufnxhyguehzrpccsolfx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmbnhoeWd1ZWh6cnBjY3NvbGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTk0NDYsImV4cCI6MjA4NjI5NTQ0Nn0.yvfviDZC2A2LniMkmbbwb7ziXPzvhFGE5UJdFc-6YeU';

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
    console.log("Fetching styles from ProductionOrderForm query...");
    const { data, error } = await supabase
        .from('styles')
        .select('id, styleNo, buyerId, buyerName, buyerPO, color, sizeWiseDetails, season');
    
    if (error) {
        console.error("Error:", error);
    } else {
        console.log(`PO Form query fetched: ${data?.length} styles`);
    }
}

test();
