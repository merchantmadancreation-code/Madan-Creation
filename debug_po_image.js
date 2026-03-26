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

async function investigate() {
    console.log("--- Checking Styles table ---");
    const { data: styles, error: styleErr } = await supabase
        .from('styles')
        .select('*')
        .limit(3);
    
    if (styleErr) console.error("Style Error:", styleErr);
    else console.log("Sample Styles:", JSON.stringify(styles, null, 2));

    console.log("\n--- Checking Purchase Orders ---");
    const { data: pos, error: poErr } = await supabase
        .from('purchase_orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (poErr) console.error("PO Error:", poErr);
    else {
        console.log("Latest PO:", JSON.stringify(pos, null, 2));
        const poId = pos[0].id;
        const { data: items } = await supabase
            .from('purchase_order_items')
            .select('*')
            .eq('purchase_order_id', poId);
        console.log("PO Items:", JSON.stringify(items, null, 2));
    }
}

investigate();
