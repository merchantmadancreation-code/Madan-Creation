import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ufnxhyguehzrpccsolfx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmbnhoeWd1ZWh6cnBjY3NvbGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTk0NDYsImV4cCI6MjA4NjI5NTQ0Nn0.yvfviDZC2A2LniMkmbbwb7ziXPzvhFGE5UJdFc-6YeU';

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testOptimizedLoad() {
    console.log("Testing optimized sequential load (NO BLOBS)...");
    
    const fetchTasks = [
        { name: 'suppliers', query: supabase.from('suppliers').select('*').order('created_at', { ascending: true }) },
        { 
            name: 'items (VERIFIED)', 
            query: supabase.from('items').select('id, created_at, name, fabricCode, hsnCode, description, materialType, openingStock, fabricType, fabricWidth, color, fabricDesign, unit, rate, rateType, sku, category, brand, status').order('created_at', { ascending: true }) 
        },
        { name: 'purchase_orders', query: supabase.from('purchase_orders').select('*').order('created_at', { ascending: false }) },
        { 
            name: 'challans (NO IMAGE)', 
            query: supabase.from('challans').select('id, created_at, grnNo, date, supplierId, poId, remarks, challanNo, vehicleNo, status').order('created_at', { ascending: false }) 
        },
        { name: 'outward_challans', query: supabase.from('outward_challans').select('*').order('created_at', { ascending: false }) },
        { name: 'invoices', query: supabase.from('invoices').select('*').order('created_at', { ascending: false }) },
        { name: 'styles (NO IMAGE)', query: supabase.from('styles').select('id, created_at, styleNo, buyerPO, buyerName, fabricName, fabricContent, fabricWidth, color, season, description, notes, buyerPOReceivedDate, poExpiredDate, category, section, orderType, leadTime, poExtensionDate, stitchingRate, perPcsAvg, status').order('created_at', { ascending: false }) }
    ];

    const startTotal = Date.now();
    for (const task of fetchTasks) {
        process.stdout.write(`Loading ${task.name}... `);
        const start = Date.now();
        const { data, error } = await task.query;
        const end = Date.now();
        if (error) {
            console.log(`FAILED: ${error.message} (${end - start}ms)`);
        } else {
            const size = JSON.stringify(data).length;
            console.log(`OK: ${data?.length || 0} rows, ~${(size / 1024).toFixed(2)} KB (${end - start}ms)`);
        }
        await new Promise(r => setTimeout(r, 50));
    }
    const endTotal = Date.now();
    console.log(`\nTotal load time: ${endTotal - startTotal}ms`);
}

testOptimizedLoad();
