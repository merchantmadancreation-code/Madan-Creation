import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';
envFile.split('\n').forEach(line => {
    if (line.trim().startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim().replace(/"/g, '');
    if (line.trim().startsWith('VITE_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim().replace(/"/g, '');
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    const { data: fi } = await supabase.from('fabric_issues').select('*, fabric_issue_items(*)').limit(1);
    const { data: mi } = await supabase.from('material_issues').select('*, material_issue_items(*)').limit(1);
    const { data: ch } = await supabase.from('challans').select('*').limit(1);
    const { data: oc } = await supabase.from('outward_challans').select('*').limit(1);
    
    console.log('Fabric Issue Sample:', JSON.stringify(fi, null, 2));
    console.log('Material Issue Sample:', JSON.stringify(mi, null, 2));
    console.log('Challan Sample:', JSON.stringify(ch, null, 2));
    console.log('Outward Challan Sample:', JSON.stringify(oc, null, 2));
}
checkSchema();
