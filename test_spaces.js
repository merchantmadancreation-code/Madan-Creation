import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';

envFile.split('\n').forEach(line => {
    if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim().replace(/"/g, '');
    if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim().replace(/"/g, '');
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSpaces() {
  console.log("Checking DPR Logs for spaces...");
  const { data: logs } = await supabase.from('dpr_logs').select('order_no, actual_produced');
  logs?.forEach(l => console.log(`LOG: [${l.order_no}] Qty: ${l.actual_produced}`));

  console.log("\nChecking Production Orders for spaces...");
  const { data: pos } = await supabase.from('production_orders').select('order_no');
  pos?.forEach(p => console.log(`PO: [${p.order_no}]`));
}
checkSpaces();
