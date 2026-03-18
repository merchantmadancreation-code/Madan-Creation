import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ufnxhyguehzrpccsolfx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmbnhoeWd1ZWh6cnBjY3NvbGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTk0NDYsImV4cCI6MjA4NjI5NTQ0Nn0.yvfviDZC2A2LniMkmbbwb7ziXPzvhFGE5UJdFc-6YeU';

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function detailedBenchmark() {
    const queries = [
        { name: 'suppliers', q: supabase.from('suppliers').select('*') },
        { name: 'items (FULL)', q: supabase.from('items').select('*') },
        { name: 'items (NO IMAGE)', q: supabase.from('items').select('id, name, status') },
        { name: 'styles (NO IMAGE)', q: supabase.from('styles').select('id, styleNo, status') },
        { name: 'styles (FULL)', q: supabase.from('styles').select('*') },
        { name: 'invoices (FULL)', q: supabase.from('invoices').select('*') },
        { name: 'material_issues', q: supabase.from('material_issues').select('*') },
        { name: 'cutting_orders (NO JOINS)', q: supabase.from('cutting_orders').select('*') },
        { name: 'cutting_orders (WITH JOINS)', q: supabase.from('cutting_orders').select('*, bundles(*), production_orders(order_no)') }
    ];

    for (const item of queries) {
        console.log(`Testing ${item.name}...`);
        const start = Date.now();
        const { data, error } = await item.q;
        const end = Date.now();
        
        if (error) {
            console.error(`  ${item.name} FAILED: ${error.message} (${end - start}ms)`);
        } else {
            const size = JSON.stringify(data).length;
            console.log(`  ${item.name} OK: ${data?.length || 0} rows, ~${(size / 1024).toFixed(2)} KB (${end - start}ms)`);
        }
    }
}

detailedBenchmark()
