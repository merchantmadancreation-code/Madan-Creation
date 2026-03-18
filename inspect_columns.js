import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ufnxhyguehzrpccsolfx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmbnhoeWd1ZWh6cnBjY3NvbGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTk0NDYsImV4cCI6MjA4NjI5NTQ0Nn0.yvfviDZC2A2LniMkmbbwb7ziXPzvhFGE5UJdFc-6YeU';

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function inspectColumns() {
    console.log("Inspecting columns for items and styles...");
    
    // Get one row of items
    const { data: itemData } = await supabase.from('items').select('*').limit(1);
    if (itemData && itemData[0]) {
        console.log("Items columns:", Object.keys(itemData[0]).join(', '));
    }
    
    // Get one row of styles
    const { data: styleData } = await supabase.from('styles').select('*').limit(1);
    if (styleData && styleData[0]) {
        console.log("Styles columns:", Object.keys(styleData[0]).join(', '));
    }
}

inspectColumns();
