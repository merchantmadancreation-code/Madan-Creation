import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://exosmotic-diametrically-seamus.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4b3Ntb3RpYy1kaWFtZXRyaWNhbGx5LXNlYW11cyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzM5MTcwODQ1LCJleHAiOjIwNTQ3NDY4NDV9.8L-9z6L7U5qX_9q9v_9v9v9v9v9v9v9v9v9v9v9v9v8';

const supabase = createClient(supabaseUrl, supabaseAnonKey)

supabase.from('styles').select('id, styleNo').limit(5)
    .then(({data, error}) => {
        if (error) console.error("Error:", error);
        else console.log("Data from Alt Project:", data);
    })
    .catch(err => console.error("Exception:", err));
