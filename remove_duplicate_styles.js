import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ufnxhyguehzrpccsolfx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmbnhoeWd1ZWh6cnBjY3NvbGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTk0NDYsImV4cCI6MjA4NjI5NTQ0Nn0.yvfviDZC2A2LniMkmbbwb7ziXPzvhFGE5UJdFc-6YeU';

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function run() {
    console.log("Fetching all styles to identify duplicates...");
    
    // Fetch all styles (just id, styleNo, and created_at to decide which to keep)
    const { data: styles, error } = await supabase
        .from('styles')
        .select('id, styleNo, created_at')
        .order('created_at', { ascending: false }); // Newest first

    if (error) {
        console.error("Error fetching styles:", error.message);
        return;
    }

    console.log(`Successfully fetched ${styles.length} styles.`);

    // Group by styleNo uppercase & trimmed
    const styleGroups = new Map();
    let nullStyleNoCount = 0;

    styles.forEach(style => {
        if (!style.styleNo) {
            nullStyleNoCount++;
            return;
        }
        
        const key = style.styleNo.trim().toUpperCase();
        if (!styleGroups.has(key)) {
            styleGroups.set(key, []);
        }
        styleGroups.get(key).push(style);
    });

    console.log(`Found ${nullStyleNoCount} styles with empty/null Style No (skipped from deduplication).`);
    console.log(`Found ${styleGroups.size} UNIQUE style numbers.`);

    const idsToDelete = [];

    // For each unique Style No group, keep the newest one (index 0, since we ordered by created_at DESC)
    // Delete the rest.
    for (const [key, group] of styleGroups.entries()) {
        if (group.length > 1) {
            // we have duplicates
            for (let i = 1; i < group.length; i++) {
                idsToDelete.push(group[i].id);
            }
        }
    }

    if (idsToDelete.length === 0) {
        console.log("No duplicates found! Your database is clean.");
        return;
    }

    console.log(`Found ${idsToDelete.length} duplicate records to delete.`);

    // Delete in chunks of 100 to avoid request length limits
    const chunkSize = 100;
    
    for (let i = 0; i < idsToDelete.length; i += chunkSize) {
        const chunk = idsToDelete.slice(i, i + chunkSize);
        console.log(`Deleting chunk ${i / chunkSize + 1} (${chunk.length} items)...`);
        
        const { error: deleteError } = await supabase
            .from('styles')
            .delete()
            .in('id', chunk);

        if (deleteError) {
            console.error(`Error deleting chunk ${i / chunkSize + 1}:`, deleteError.message);
            // Stop process if fatal error
            return;
        }
    }

    console.log("Successfully deleted all duplicates!");
    
    // Final verification
    const { count } = await supabase.from('styles').select('*', { count: 'exact', head: true });
    console.log(`Final total styles in database: ${count}`);
}

run();
