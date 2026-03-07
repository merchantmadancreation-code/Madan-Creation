import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ufnxhyguehzrpccsolfx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmbnhoeWd1ZWh6cnBjY3NvbGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTk0NDYsImV4cCI6MjA4NjI5NTQ0Nn0.yvfviDZC2A2LniMkmbbwb7ziXPzvhFGE5UJdFc-6YeU';

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkTemplates() {
    console.log("Checking T&A templates...")
    const { data: templates, error } = await supabase
        .from('tna_templates')
        .select('*, tna_template_tasks(*)')

    if (error) {
        console.error("Error fetching templates:", error)
    } else {
        console.log("Templates found:", templates.length)
        templates.forEach(t => {
            console.log(`Template: ${t.name}, Tasks: ${t.tna_template_tasks?.length || 0}`)
            if (t.tna_template_tasks) {
                console.log("Tasks:", t.tna_template_tasks.map(task => task.name))
            }
        })
    }
}

checkTemplates()
