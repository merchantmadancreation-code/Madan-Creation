const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkAttachments() {
    const { data: pos, error } = await supabase
        .from('purchase_orders')
        .select('id, po_number, item_details, commercial_info');

    if (error) {
        console.error("Error:", error);
        return;
    }

    pos.forEach(po => {
        const comm = po.commercial_info || {};
        const att = comm.attachment;
        if (att) {
            console.log(`PO ${po.po_number} has attachment. Type: ${typeof att}. Starts: ${att.substring(0, 30)}...Length: ${att.length}`);
        } else {
            console.log(`PO ${po.po_number} - NO ATTACHMENT`);
        }
    });

    console.log("Checking styles for images just in case...");
    const { data: styles } = await supabase.from('styles').select('style_no, image').not('image', 'is', null).limit(3);
    if (styles) {
         styles.forEach(s => {
             console.log(`Style ${s.style_no} has image. Length: ${s.image?.length}, Starts: ${s.image?.substring(0,30)}...`);
         });
    }
}

checkAttachments();
