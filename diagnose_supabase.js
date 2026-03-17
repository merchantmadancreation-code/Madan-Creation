import { createClient } from '@supabase/supabase-js'

const projects = [
    {
        name: "ufnxhyguehzrpccsolfx",
        url: "https://ufnxhyguehzrpccsolfx.supabase.co",
        key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmbnhoeWd1ZWh6cnBjY3NvbGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTk0NDYsImV4cCI6MjA4NjI5NTQ0Nn0.yvfviDZC2A2LniMkmbbwb7ziXPzvhFGE5UJdFc-6YeU"
    },
    {
        name: "exosmotic-diametrically-seamus",
        url: "https://exosmotic-diametrically-seamus.supabase.co",
        key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4b3Ntb3RpYy1kaWFtZXRyaWNhbGx5LXNlYW11cyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzM5MTcwODQ1LCJleHAiOjIwNTQ3NDY4NDV9.8L-9z6L7U5qX_9q9v_9v9v9v9v9v9v9v9v9v9v9v9v8"
    }
];

async function diagnose() {
    for (const project of projects) {
        console.log(`Checking project: ${project.name} (${project.url})...`);
        const supabase = createClient(project.url, project.key);
        try {
            const { data, error, count } = await supabase
                .from('styles')
                .select('*', { count: 'exact', head: true });

            if (error) {
                console.error(`  Error: ${error.message}`);
            } else {
                console.log(`  Success! Found ${count} styles.`);
                if (count > 0) {
                    const { data: samples } = await supabase.from('styles').select('styleNo').limit(3);
                    console.log(`  Samples: ${samples.map(s => s.styleNo).join(', ')}`);
                }
            }
        } catch (e) {
            console.error(`  Exception: ${e.message}`);
        }
    }
}

diagnose();
