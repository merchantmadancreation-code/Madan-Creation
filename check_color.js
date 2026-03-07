import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ufnxhyguehzrpccsolfx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmbnhoeWd1ZWh6cnBjY3NvbGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTk0NDYsImV4cCI6MjA4NjI5NTQ0Nn0.yvfviDZC2A2LniMkmbbwb7ziXPzvhFGE5UJdFc-6YeU';

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkColor() {
    console.log("Checking receipt items for REC-392972...")
    const { data: receive } = await supabase
        .from('stitching_receives')
        .select('id')
        .eq('receipt_no', 'REC-392972')
        .single()

    if (receive) {
        const { data: items } = await supabase
            .from('stitching_receive_items')
            .select('*')
            .eq('receive_id', receive.id)

        console.log("Items for REC-392972:", items)
    } else {
        console.log("Receipt REC-392972 not found")
    }
}

checkColor()
