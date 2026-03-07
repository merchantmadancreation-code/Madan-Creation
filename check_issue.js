import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ufnxhyguehzrpccsolfx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmbnhoeWd1ZWh6cnBjY3NvbGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTk0NDYsImV4cCI6MjA4NjI5NTQ0Nn0.yvfviDZC2A2LniMkmbbwb7ziXPzvhFGE5UJdFc-6YeU';

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkIssueDetails() {
    console.log("Checking issue ISS-260217-001...")
    const { data: issue, error } = await supabase
        .from('stitching_issues')
        .select(`
        *,
        production_orders (
            order_no,
            styles (styleNo, buyerPO, season, stitchingRate)
        )
    `)
        .eq('issue_no', 'ISS-260217-001')
        .single()

    if (error) {
        console.error("Error fetching issue:", error)
    } else {
        console.log("Full Issue Data:", JSON.stringify(issue, null, 2))

        const po = Array.isArray(issue.production_orders) ? issue.production_orders[0] : issue.production_orders;
        const style = Array.isArray(po?.styles) ? po.styles[0] : po?.styles;

        console.log("Po structure:", po)
        console.log("Style structure:", style)
        console.log("Rate found:", style?.stitchingRate)
    }
}

checkIssueDetails()
