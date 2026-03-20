import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';

envFile.split('\n').forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim().replace(/"/g, '');
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim().replace(/"/g, '');
});

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  console.log("Testing insert to dpr_logs...");
  const formData = {
    order_no: 'TEST-PO',
    style_id: '',
    buyer_id: '',
    production_stage: 'Cutting',
    line_id: '',
    responsible_staff: 'TEST-USER',
    machine_group: '',
    bundle_start: '',
    planned_target: 100,
    actual_produced: 50,
    defects_count: 0,
    efficiency: 50,
    report_date: new Date().toISOString().split('T')[0],
  };

  const { data, error } = await supabase.from('dpr_logs').insert([formData]).select();
  
  if (error) {
    console.error("Insert failed with error:", error);
  } else {
    console.log("Insert succeeded!", data);
    
    // Clean up
    console.log("Cleaning up test data...");
    await supabase.from('dpr_logs').delete().eq('order_no', 'TEST-PO');
  }
}

testInsert();
