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

async function testSingleFetch() {
  const { data: po } = await supabase.from('production_orders').select('id').limit(1).single();
  if (po) {
    console.log(`PO ID: ${po.id}`);
    const { data: detail, error } = await supabase.from('production_orders').select('*').eq('id', po.id).single();
    if (error) console.error("Error fetching detail:", error);
    else console.log("Detail fetch SUCCESS");
  } else {
    console.log("No PO found to test.");
  }
}
testSingleFetch();
