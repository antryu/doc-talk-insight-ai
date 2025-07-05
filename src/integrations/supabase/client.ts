import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const supabaseUrl = 'https://esnrwamfmjiwwftdiign.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzbnJ3YW1mbWppd3dmdGRpaWduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3MDA1OTEsImV4cCI6MjA2NzI3NjU5MX0.htyMOWBqQhDYUmJarMxqtwo391IEMLY1YwXBccMAacQ'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)