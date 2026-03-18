import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ufnxhyguehzrpccsolfx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmbnhoeWd1ZWh6cnBjY3NvbGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTk0NDYsImV4cCI6MjA4NjI5NTQ0Nn0.yvfviDZC2A2LniMkmbbwb7ziXPzvhFGE5UJdFc-6YeU';

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function benchmark() {
    const queries = [
        { name: 'suppliers', q: supabase.from('suppliers').select('*').order('created_at', { ascending: true }) },
        { name: 'items', q: supabase.from('items').select('*').order('created_at', { ascending: true }) },
        { name: 'purchase_orders', q: supabase.from('purchase_orders').select('*').order('created_at', { ascending: false }) },
        { name: 'challans', q: supabase.from('challans').select('*').order('created_at', { ascending: false }) },
        { name: 'styles', q: supabase.from('styles').select('id, created_at, styleNo, buyerPO, buyerName, fabricName, fabricContent, fabricWidth, color, season, description, notes, buyerPOReceivedDate, poExpiredDate, category, section, orderType, leadTime, poExtensionDate, stitchingRate, perPcsAvg, status').order('created_at', { ascending: false }) },
        { name: 'material_issues', q: supabase.from('material_issues').select('*, material_issue_items(*), production_orders(styles(styleNo))').order('created_at', { ascending: false }) },
        { name: 'fabric_issues', q: supabase.from('fabric_issues').select('*, fabric_issue_items(*)').order('created_at', { ascending: false }) },
        { name: 'cutting_orders', q: supabase.from('cutting_orders').select('*, bundles(*), production_orders(order_no, styles(styleNo, buyerPO))').order('created_at', { ascending: false }) }
    ];

    for (const item of queries) {
        console.log(`Testing ${item.name}...`);
        const start = Date.now();
        const { data, error } = await item.q;
        const end = Date.now();
        if (error) {
            console.error(`  ${item.name} FAILED: ${error.message} (${end - start}ms)`);
        } else {
            console.log(`  ${item.name} OK: ${data?.length || 0} rows (${end - start}ms)`);
        }
    }
}

benchmark()
