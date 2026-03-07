const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ufnxhyguehzrpccsolfx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmbnhoeWd1ZWh6cnBjY3NvbGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTk0NDYsImV4cCI6MjA4NjI5NTQ0Nn0.yvfviDZC2A2LniMkmbbwb7ziXPzvhFGE5UJdFc-6YeU';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function backfill() {
    console.log("Fetching invoices...");
    const { data: invoices, error } = await supabase
        .from('invoices')
        .select('*')
        .order('date', { ascending: true })
        .order('created_at', { ascending: true });

    if (error) {
        console.error("Error fetching invoices:", error);
        return;
    }

    console.log(`Found ${invoices.length} invoices.`);

    const dateSequences = {};

    for (const inv of invoices) {
        if (inv.grnNo) {
            console.log(`Skipping Invoice ID ${inv.id} (already has grnNo: ${inv.grnNo})`);
            continue;
        }

        // Parse date DDMMYY
        const dateObj = new Date(inv.date);
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const yy = String(dateObj.getFullYear()).slice(-2);
        const datePart = `${dd}${mm}${yy}`;
        const prefix = `GRN-${datePart}`;

        if (!dateSequences[datePart]) {
            dateSequences[datePart] = 1;
        } else {
            dateSequences[datePart]++;
        }

        const grnNo = `${prefix}${String(dateSequences[datePart]).padStart(2, '0')}`;

        console.log(`Updating Invoice ID ${inv.id} (Date: ${inv.date}) -> ${grnNo}`);

        const { error: updateError } = await supabase
            .from('invoices')
            .update({ grnNo })
            .eq('id', inv.id);

        if (updateError) {
            console.error(`Error updating Invoice ID ${inv.id}:`, updateError);
        }
    }

    console.log("Backfill complete.");
}

backfill();
