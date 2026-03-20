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

async function checkLatestLogs() {
  console.log("Checking latest dpr_logs...");
  const { data: dprData, error } = await supabase.from('dpr_logs').select('*').order('report_date', { ascending: false }).limit(20);
  if (error) {
    console.error("Error fetching logs:", error);
  } else {
     console.log(`Found ${dprData.length} logs.`);
     if (dprData.length > 0) {
        console.log("Latest logs:");
        dprData.slice(0, 5).forEach(log => console.log(log.order_no, log.production_stage, log.actual_produced, log.created_at || "no-created_at"));
     }
  }
}
checkLatestLogs();
