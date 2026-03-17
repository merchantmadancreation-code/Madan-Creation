import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ufnxhyguehzrpccsolfx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmbnhoeWd1ZWh6cnBjY3NvbGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTk0NDYsImV4cCI6MjA4NjI5NTQ0Nn0.yvfviDZC2A2LniMkmbbwb7ziXPzvhFGE5UJdFc-6YeU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function measureSize() {
    console.log("Fetching all styles to measure size...");
    const { data, error } = await supabase.from('styles').select('*');
    if (error) {
        console.error("Fetch failed:", error.message);
        return;
    }

    const size = JSON.stringify(data).length;
    console.log(`Total styles: ${data.length}`);
    console.log(`Total payload size: ${(size / 1024 / 1024).toFixed(2)} MB`);
    
    const withImage = data.filter(s => s.image).length;
    console.log(`Styles with images: ${withImage}`);
    
    if (withImage > 0) {
        const avgImageSize = data.reduce((acc, s) => acc + (s.image ? s.image.length : 0), 0) / withImage;
        console.log(`Average image size: ${(avgImageSize / 1024).toFixed(2)} KB`);
    }
}

measureSize();
