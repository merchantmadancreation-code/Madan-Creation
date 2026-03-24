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

async function checkMoreSchema() {
   const { data: b } = await supabase.from('bundles').select('size, quantity').limit(1);
   console.log("BUNDLES:\n", JSON.stringify(b, null, 2));

   const { data: f } = await supabase.from('finishing_receive_items').select('*').limit(1);
   console.log("FINISHING ITEMS:\n", JSON.stringify(f, null, 2));

   const { data: p } = await supabase.from('carton_items').select('*').limit(1);
   console.log("CARTON ITEMS:\n", JSON.stringify(p, null, 2));
}
checkMoreSchema();
