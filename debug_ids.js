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

async function checkIds() {
    const styleNo = 'JNE4033';
    const itemId = 'd9383964-c1e9-4213-9754-4e52ac6810cd';
    
    const { data: style } = await supabase.from('styles').select('id, styleNo').eq('styleNo', styleNo).single();
    console.log("Style from styleNo:", JSON.stringify(style, null, 2));
    
    const { data: item } = await supabase.from('styles').select('id, styleNo').eq('id', itemId).maybeSingle();
    console.log("Style from itemId:", JSON.stringify(item, null, 2));
}
checkIds();
