import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Hardcoded for now as per previous troubleshooting
const supabaseUrl = 'https://exosmotic-diametrically-seamus.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4b3Ntb3RpYy1kaWFtZXRyaWNhbGx5LXNlYW11cyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzM5MTcwODQ1LCJleHAiOjIwNTQ3NDY4NDV9.8L-9z6L7U5qX_9q9v_9v9v9v9v9v9v9v9v9v9v9v9v8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createMaterialIssueTables() {
    console.log("Creating material issue tables...");

    // We'll use the rpc('execute_sql') if available, or just log what needs to be done.
    // Given previous errors, I'll try to check if tables exist.

    const { error: checkError } = await supabase.from('material_issues').select('id').limit(1);

    if (checkError && checkError.code === '42P01') { // Table does not exist
        console.log("Tables do not exist. Please run the following SQL in Supabase SQL Editor:");
        console.log(`
            CREATE TABLE IF NOT EXISTS material_issues (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                issue_no TEXT NOT NULL UNIQUE,
                worker_id UUID REFERENCES workers(id),
                production_order_id UUID REFERENCES production_orders(id),
                issue_date DATE DEFAULT CURRENT_DATE,
                remarks TEXT,
                status TEXT DEFAULT 'Active'
            );

            CREATE TABLE IF NOT EXISTS material_issue_items (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                material_issue_id UUID REFERENCES material_issues(id) ON DELETE CASCADE,
                item_name TEXT NOT NULL,
                qty NUMERIC NOT NULL,
                unit TEXT
            );
            
            GRANT ALL ON material_issues TO anon, authenticated, service_role;
            GRANT ALL ON material_issue_items TO anon, authenticated, service_role;
        `);
    } else if (!checkError) {
        console.log("Tables already exist.");
    } else {
        console.error("Error checking tables:", checkError);
    }
}

createMaterialIssueTables();
