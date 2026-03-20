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

async function checkStyles() {
  console.log("Fetching styles directly via Supabase...");
  const { data: st, error } = await supabase.from('styles').select('*').limit(5);
  
  if (error) {
    console.error("Error fetching styles:", error);
  } else {
    console.log(`Successfully fetched ${st.length} styles.`);
    if (st.length > 0) {
      console.log("Sample style:", Object.keys(st[0]));
      console.log("Sample style details:", st[0]);
    }
  }
}
checkStyles();
