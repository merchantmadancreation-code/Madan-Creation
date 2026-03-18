import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ufnxhyguehzrpccsolfx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmbnhoeWd1ZWh6cnBjY3NvbGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTk0NDYsImV4cCI6MjA4NjI5NTQ0Nn0.yvfviDZC2A2LniMkmbbwb7ziXPzvhFGE5UJdFc-6YeU';

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testSequentialLoad() {
    console.log("Testing sequential load pattern...");
    
    const fetchTasks = [
        { name: 'suppliers', query: supabase.from('suppliers').select('*').order('created_at', { ascending: true }) },
        { name: 'items', query: supabase.from('items').select('id, created_at, name, fabricCode, hsnCode, description, materialType, openingStock, fabricType, fabricWidth, color, fabricDesign, unit, rate, rateType, image, category, brand, status').order('created_at', { ascending: true }) },
        { name: 'purchase_orders', query: supabase.from('purchase_orders').select('*').order('created_at', { ascending: false }) },
        { name: 'challans', query: supabase.from('challans').select('*').order('created_at', { ascending: false }) },
        { name: 'outward_challans', query: supabase.from('outward_challans').select('*').order('created_at', { ascending: false }) },
        { name: 'invoices', query: supabase.from('invoices').select('*').order('created_at', { ascending: false }) },
        { name: 'styles', query: supabase.from('styles').select('id, created_at, styleNo, buyerPO, buyerName, fabricName, fabricContent, fabricWidth, color, season, description, notes, buyerPOReceivedDate, poExpiredDate, category, section, orderType, leadTime, poExtensionDate, stitchingRate, perPcsAvg, status').order('created_at', { ascending: false }) },
        { name: 'material_issues', query: supabase.from('material_issues').select('*, material_issue_items(*), production_orders(styles(styleNo))').order('created_at', { ascending: false }) },
        { name: 'fabric_issues', query: supabase.from('fabric_issues').select('*, fabric_issue_items(*)').order('created_at', { ascending: false }) },
        { name: 'cutting_orders', query: supabase.from('cutting_orders').select('*, bundles(*), production_orders(order_no, styles(styleNo, buyerPO))').order('created_at', { ascending: false }) }
    ];

    const startTotal = Date.now();
    for (const task of fetchTasks) {
        console.log(`Loading ${task.name}...`);
        const start = Date.now();
        const { data, error } = await task.query;
        const end = Date.now();
        if (error) {
            console.log(`  ${task.name} LOADED with EXPECTED ERROR: ${error.message} (${end - start}ms)`);
        } else {
            console.log(`  ${task.name} OK: ${data?.length || 0} rows (${end - start}ms)`);
        }
        await new Promise(r => setTimeout(r, 100));
    }
    const endTotal = Date.now();
    console.log(`Total load time: ${endTotal - startTotal}ms`);
}

testSequentialLoad();
