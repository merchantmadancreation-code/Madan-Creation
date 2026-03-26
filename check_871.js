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

async function checkDoc() {
    const { data: inv } = await supabase.from('invoices').select('*').or('invoiceNo.eq.871,grnNo.eq.871');
    const { data: ch } = await supabase.from('challans').select('*').or('challanNo.eq.871,grnNo.eq.871');
    console.log('Invoices:', JSON.stringify(inv, null, 2));
    console.log('Challans:', JSON.stringify(ch, null, 2));
}
checkDoc();
