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

async function testLength() {
    const hugeString = JSON.stringify({ XS: 100, S: 200, M: 300, L: 400, XL: 500, XXL: 600 });
    const { data, error } = await supabase.from('dpr_logs').insert([{
        report_date: new Date().toISOString().split('T')[0],
        actual_produced: 0,
        bundle_start: hugeString,
        production_stage: 'Test'
    }]).select();
    
    if (error) {
        console.error("Error inserting:", error);
    } else {
        console.log("Success! Inserted data:", data[0].bundle_start);
        await supabase.from('dpr_logs').delete().eq('id', data[0].id);
    }
}
testLength();
