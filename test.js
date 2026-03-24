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
    const { data: st, error } = await supabase
        .from('styles')
        .select('id, styleNo, buyerId, buyerName, buyerPO, color, sizeWiseDetails, season');
    
    if (error) {
        console.error("Error fetching styles:", error);
    } else {
        console.log("Found styles count:", st?.length);
        const badStyles = st.filter(s => !s.styleNo || s.styleNo.trim() === '');
        console.log("Empty or missing styleNo count:", badStyles.length);
        
        // Let's log all styleNos to see if they are valid
        console.log("All StyleNos:", st.map(s => s.styleNo));
    }
}

checkStyles().catch(console.error);
