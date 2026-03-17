import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ufnxhyguehzrpccsolfx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmbnhoeWd1ZWh6cnBjY3NvbGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTk0NDYsImV4cCI6MjA4NjI5NTQ0Nn0.yvfviDZC2A2LniMkmbbwb7ziXPzvhFGE5UJdFc-6YeU';

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testBulkFetch() {
    console.log("Testing bulk fetch from PurchaseOrderContext...")
    
    const queries = [
        { name: 'suppliers', q: supabase.from('suppliers').select('*').order('created_at', { ascending: true }) },
        { name: 'items', q: supabase.from('items').select('*').order('created_at', { ascending: true }) },
        { name: 'purchase_orders', q: supabase.from('purchase_orders').select('*').order('created_at', { ascending: false }) },
        { name: 'challans', q: supabase.from('challans').select('*').order('created_at', { ascending: false }) },
        { name: 'outward_challans', q: supabase.from('outward_challans').select('*').order('created_at', { ascending: false }) },
        { name: 'invoices', q: supabase.from('invoices').select('*').order('created_at', { ascending: false }) },
        { name: 'styles', q: supabase.from('styles').select('*').order('created_at', { ascending: false }) },
        { name: 'material_issues', q: supabase.from('material_issues').select('*, material_issue_items(*), production_orders(styles(styleNo))').order('created_at', { ascending: false }) },
        { name: 'fabric_issues', q: supabase.from('fabric_issues').select('*, fabric_issue_items(*)').order('created_at', { ascending: false }) },
        { name: 'cutting_orders', q: supabase.from('cutting_orders').select('*, bundles(*), production_orders(order_no, styles(styleNo, buyerPO))').order('created_at', { ascending: false }) }
    ];

    for (const query of queries) {
        process.stdout.write(`Fetching ${query.name}... `);
        const { data, error } = await query.q;
        if (error) {
            console.log(`FAILED: ${error.message}`);
        } else {
            console.log(`SUCCESS (${data.length} rows)`);
        }
    }
}

testBulkFetch()
