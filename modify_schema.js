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

async function addSizeDataColumn() {
    // Attempting to select size_data to see if it already exists
    const { error: checkError } = await supabase.from('dpr_logs').select('size_data').limit(1);
    if (!checkError) {
        console.log("size_data column already exists in dpr_logs!");
        return;
    }

    // Since we can't easily run ALTER TABLE over REST using anon key, 
    // we'll check if there's any JSON column we can hijack, or if we can use 'remarks' if it exists.
    const { data } = await supabase.from('dpr_logs').select('*').limit(1);
    console.log("Current dpr_logs columns:", Object.keys(data[0] || {}));
}
addSizeDataColumn();
