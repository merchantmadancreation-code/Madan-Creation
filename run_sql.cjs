const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ufnxhyguehzrpccsolfx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmbnhoeWd1ZWh6cnBjY3NvbGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTk0NDYsImV4cCI6MjA4NjI5NTQ0Nn0.yvfviDZC2A2LniMkmbbwb7ziXPzvhFGE5UJdFc-6YeU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runSql() {
    console.log("Attempting to add grnNo column...");
    const { data, error } = await supabase.rpc('execute_sql', {
        query: 'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "grnNo" TEXT;'
    });

    if (error) {
        console.error("Error executing SQL:", error);
        console.log("\nIf you see 'function execute_sql(text) does not exist', it means you need to run this command in your Supabase SQL Editor manually:");
        console.log('ALTER TABLE invoices ADD COLUMN IF NOT EXISTS "grnNo" TEXT;');
    } else {
        console.log("Column added successfully!");
    }
    process.exit();
}

runSql();
