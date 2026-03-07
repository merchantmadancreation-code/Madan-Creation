import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ufnxhyguehzrpccsolfx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmbnhoeWd1ZWh6cnBjY3NvbGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTk0NDYsImV4cCI6MjA4NjI5NTQ0Nn0.yvfviDZC2A2LniMkmbbwb7ziXPzvhFGE5UJdFc-6YeU';

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkTNAPlan() {
    console.log("Checking T&A plan for order 01394/RDPOR/JP...")

    // First find the order ID
    const { data: order, error: orderError } = await supabase
        .from('production_orders')
        .select('id, order_no')
        .eq('order_no', '01394/RDPOR/JP')
        .single()

    if (orderError) {
        console.error("Error finding order:", orderError)
        return
    }

    console.log("Found order:", order)

    // Find T&A plans for this order (using order_id)
    const { data: plans, error: planError } = await supabase
        .from('tna_plans')
        .select('*, tna_plan_tasks(*)')
        .eq('order_id', order.id)

    if (planError) {
        console.error("Error fetching T&A plans:", planError)
    } else {
        console.log("Plans found:", plans.length)
        if (plans.length > 0) {
            plans.forEach((p, i) => {
                console.log(`Plan ${i + 1}: ID ${p.id}, Tasks: ${p.tna_plan_tasks?.length || 0}`)
                if (p.tna_plan_tasks && p.tna_plan_tasks.length > 0) {
                    console.log("Tasks samples:", p.tna_plan_tasks.slice(0, 3).map(t => ({ name: t.task_name, status: t.status, stage: t.stage })))
                }
            })
        } else {
            console.log("No T&A plan exists for this order. This is why the Phase View is blank.")
        }
    }
}

checkTNAPlan()
