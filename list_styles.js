import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ufnxhyguehzrpccsolfx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmbnhoeWd1ZWh6cnBjY3NvbGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTk0NDYsImV4cCI6MjA4NjI5NTQ0Nn0.yvfviDZC2A2LniMkmbbwb7ziXPzvhFGE5UJdFc-6YeU';

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function listAllStyles() {
    console.log("Fetching all styles...")
    const { data, error } = await supabase
        .from('styles')
        .select('id, styleNo, buyerName')
        .limit(10)

    if (error) {
        console.error("Error fetching styles:", error)
    } else {
        console.log(`Found ${data.length} styles:`)
        data.forEach(s => console.log(`- ${s.styleNo} (${s.buyerName})`))
    }
}

listAllStyles()
