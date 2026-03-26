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
        .select('id, styleNo, articleCode, image')
        .not('image', 'is', null)
        .limit(5);
    
    if (styleErr) fs.appendFileSync('debug_output.txt', `Style Error: ${JSON.stringify(styleErr)}\n`);
    else fs.appendFileSync('debug_output.txt', `Sample Styles with Images: ${JSON.stringify(styles, null, 2)}\n`);

    console.log("\n--- Checking Latest Purchase Order ---");
    const { data: pos, error: poErr } = await supabase
        .from('purchase_orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (poErr) fs.appendFileSync('debug_output.txt', `PO Error: ${JSON.stringify(poErr)}\n`);
    else if (pos.length > 0) {
        fs.appendFileSync('debug_output.txt', `Latest PO: ${JSON.stringify(pos[0], null, 2)}\n`);
        const poId = pos[0].id;
        const { data: items, error: itemErr } = await supabase
            .from('purchase_order_items')
            .select('*')
            .eq('purchase_order_id', poId);
        
        if (itemErr) fs.appendFileSync('debug_output.txt', `Item Error: ${JSON.stringify(itemErr)}\n`);
        else fs.appendFileSync('debug_output.txt', `PO Items: ${JSON.stringify(items, null, 2)}\n`);
    } else {
        fs.appendFileSync('debug_output.txt', "No Purchase Orders found.\n");
    }
}

fs.writeFileSync('debug_output.txt', '--- Investigation Start ---\n');
investigate().then(() => console.log("Done. Check debug_output.txt"));
