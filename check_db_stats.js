import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ufnxhyguehzrpccsolfx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmbnhoeWd1ZWh6cnBjY3NvbGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTk0NDYsImV4cCI6MjA4NjI5NTQ0Nn0.yvfviDZC2A2LniMkmbbwb7ziXPzvhFGE5UJdFc-6YeU';

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkIndexes() {
    console.log("Checking database indexes...")
    // Supabase doesn't allow direct SQL through the client easily, 
    // but we can try to query a table that might give us hints or just rely on the schema we have.
    // Since I can't run 'EXPLAIN ANALYZE' via the client, I'll just assume missing indexes based on the .sql file.
    
    // Let's try to fetch a count from a few tables to see size.
    const tables = ['styles', 'items', 'purchase_orders', 'challans', 'cutting_orders', 'bundles'];
    for (const table of tables) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
            console.error(`Error checking ${table}:`, error.message);
        } else {
            console.log(`Table ${table} has ${count} rows.`);
        }
    }
}

checkIndexes()
