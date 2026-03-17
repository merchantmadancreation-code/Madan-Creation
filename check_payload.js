import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ufnxhyguehzrpccsolfx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmbnhoeWd1ZWh6cnBjY3NvbGZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTk0NDYsImV4cCI6MjA4NjI5NTQ0Nn0.yvfviDZC2A2LniMkmbbwb7ziXPzvhFGE5UJdFc-6YeU';

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkPayloadSize() {
    console.log("Checking Styles payload size...")
    const { data, error } = await supabase.from('styles').select('*')
    if (error) {
        console.error("Error:", error)
        return
    }
    
    const jsonString = JSON.stringify(data)
    const sizeInBytes = Buffer.byteLength(jsonString, 'utf8')
    const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2)
    
    console.log(`Successfully fetched ${data.length} styles.`)
    console.log(`Total payload size: ${sizeInMB} MB`)
    
    if (data.length > 0) {
        const firstStyle = data[0]
        const imageSize = firstStyle.image ? Buffer.byteLength(firstStyle.image, 'utf8') : 0
        console.log(`First style image size: ${(imageSize / 1024).toFixed(2)} KB`)
    }
}

checkPayloadSize()
