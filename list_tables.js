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

async function checkTables() {
    // get all tables using the rest endpoint or pg_tables
    const { data } = await supabase.from('stitching_receives').select('id').limit(1);
    console.log("Stitching receives:", !!data);
    
    const req = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`);
    const swagger = await req.json();
    console.log("TABLES:", Object.keys(swagger.definitions));
}
checkTables().catch(console.error);
