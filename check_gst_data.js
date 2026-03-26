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

async function checkGST() {
    const { data } = await supabase.from('purchase_orders').select('poNumber, items, commercials').eq('poNumber', 'MCPO-00009').single();
    if (data) {
        console.log("Items:", JSON.stringify(data.items, null, 2));
        console.log("Calculations:", JSON.stringify(data.commercials?.calculations, null, 2));
    }
}
checkGST();
