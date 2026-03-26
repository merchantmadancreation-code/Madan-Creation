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

async function checkStyles() {
    console.log("Fetching styles with images...");
    const { data, error } = await supabase
        .from('styles')
        .select('styleNo, image')
        .not('image', 'is', null)
        .limit(10);
    
    if (error) {
        console.error(error);
    } else {
        const result = data.map(s => ({
            styleNo: s.styleNo,
            hasImage: !!s.image,
            imgPreview: s.image ? s.image.substring(0, 50) + "..." : "null"
        }));
        console.log("Sample Styles:", JSON.stringify(result, null, 2));
    }
}
checkStyles();
