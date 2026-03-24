import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ufnxhyguehzrpccsolfx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmbnhoeWd1ZWh6cnBjY3NvbGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTk0NDYsImV4cCI6MjA4NjI5NTQ0Nn0.yvfviDZC2A2LniMkmbbwb7ziXPzvhFGE5UJdFc-6YeU';

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function test() {
    const { data, error } = await supabase.from('styles').select('id, created_at, styleNo, buyerPO, buyerName, fabricName, fabricContent, fabricWidth, color, season, description, notes, buyerPOReceivedDate, poExpiredDate, category, section, orderType, leadTime, poExtensionDate, stitchingRate, perPcsAvg, sizeWiseDetails, status, buyerPOCopy, pcsPerSet, setDetails, buyerId').order('created_at', { ascending: false }).limit(5000);
    
    if (error) {
        console.error("Error:", error);
    } else {
        console.log(`Frontend query returned: ${data?.length} styles`);
    }
}

test();
