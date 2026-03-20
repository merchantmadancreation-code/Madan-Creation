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

async function checkData() {
  console.log("Checking dpr_logs...");
  const { data: logs, error: logsError } = await supabase.from('dpr_logs').select('*');
  if (logsError) console.error(logsError);
  console.log("Logs count:", logs ? logs.length : 0);
  console.log(logs.slice(0, 5));

  console.log("\nChecking production_orders...");
  const { data: pos, error: posError } = await supabase.from('production_orders').select('id, order_no');
  if (posError) console.error(posError);
  console.log("POs count:", pos ? pos.length : 0);
  console.log(pos.slice(0, 5));
}
checkData();
