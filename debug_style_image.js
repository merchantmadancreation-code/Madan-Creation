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

async function checkStyle() {
    const styleNo = 'JNE4033';
    console.log(`Checking style ${styleNo}...`);
    const { data, error } = await supabase
        .from('styles')
        .select('styleNo, image')
        .eq('styleNo', styleNo);
    
    if (error) {
        console.error(error);
    } else {
        console.log("Result:", JSON.stringify(data, null, 2));
    }
}
checkStyle();
