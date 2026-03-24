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

async function checkSchema() {
   const { data: dpr } = await supabase.from('dpr_logs').select('*').limit(2);
   console.log("DPR LOGS:\n", JSON.stringify(dpr, null, 2));
   
   const { data: cut } = await supabase.from('cutting_orders').select('*').limit(1);
   console.log("CUTTING:\n", JSON.stringify(cut, null, 2));
   
   const { data: cutItems } = await supabase.from('cutting_bundle_sizes').select('*').limit(1);
   console.log("CUTTING BUNDLE SIZES:\n", JSON.stringify(cutItems, null, 2));
   
   const { data: stitch } = await supabase.from('stitching_receive_items').select('*').limit(1);
   console.log("STITCHING ITEMS:\n", JSON.stringify(stitch, null, 2));
}
checkSchema();
