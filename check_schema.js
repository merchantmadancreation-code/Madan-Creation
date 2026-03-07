import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ufnxhyguehzrpccsolfx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmbnhoeWd1ZWh6cnBjY3NvbGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTk0NDYsImV4cCI6MjA4NjI5NTQ0Nn0.yvfviDZC2A2LniMkmbbwb7ziXPzvhFGE5UJdFc-6YeU';

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkData() {
    console.log("Checking style ZAC26TP04357...")
    const { data, error } = await supabase
        .from('styles')
        .select('*')
        .eq('styleNo', 'ZAC26TP04357')
        .single()

    if (error) {
        console.error("Error fetching style:", error)
    } else {
        console.log("Style Data:", data)
        console.log("stitchingRate value:", data.stitchingRate)
    }

    console.log("\nChecking recent receives...")
    const { data: receives, error: rError } = await supabase
        .from('stitching_receives')
        .select(`
        *,
        production_orders(order_no, styles(styleNo, stitchingRate))
    `)
        .order('created_at', { ascending: false })
        .limit(1)

    if (rError) {
        console.error("Error fetching receives:", rError)
    } else {
        console.log("Recent Receive Data:", JSON.stringify(receives, null, 2))
    }
}

checkData()
