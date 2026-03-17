import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://exosmotic-diametrically-seamus.supabase.co';
// Using the same key found in update_style_schema.js or assuming it's the same if they are related
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4b3Ntb3RpYy1kaWFtZXRyaWNhbGx5LXNlYW11cyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzM5MTcwODQ1LCJleHAiOjIwNTQ3NDY4NDV9.8L-9z6L7U5qX_9q9v_9v9v9v9v9v9v9v9v9v9v9v9v8';

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function listAllStyles() {
    console.log(`Fetching all styles from ${supabaseUrl}...`)
    try {
        const { data, error } = await supabase
            .from('styles')
            .select('id, styleNo')
            .limit(10)

        if (error) {
            console.error("Error fetching styles:", error)
        } else {
            console.log(`Found ${data ? data.length : 0} styles:`)
            if (data) data.forEach(s => console.log(`- ${s.styleNo}`))
        }
    } catch (e) {
        console.error("Exception:", e)
    }
}

listAllStyles()
