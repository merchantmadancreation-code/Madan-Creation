import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ufnxhyguehzrpccsolfx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmbnhoeWd1ZWh6cnBjY3NvbGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTk0NDYsImV4cCI6MjA4NjI5NTQ0Nn0.yvfviDZC2A2LniMkmbbwb7ziXPzvhFGE5UJdFc-6YeU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    console.log("--- STYLES TABLE ---");
    const { data: styleData, error: styleError } = await supabase.from('styles').select('*').limit(1);
    if (styleError) {
        console.error("Style Error:", styleError.message);
    } else if (styleData && styleData.length > 0) {
        console.log("Columns:", Object.keys(styleData[0]).join(', '));
    }

    console.log("\n--- ITEMS TABLE ---");
    const { data: itemData, error: itemError } = await supabase.from('items').select('*').limit(1);
    if (itemError) {
        console.error("Item Error:", itemError.message);
    } else if (itemData && itemData.length > 0) {
        console.log("Columns:", Object.keys(itemData[0]).join(', '));
    }
}

checkColumns();
