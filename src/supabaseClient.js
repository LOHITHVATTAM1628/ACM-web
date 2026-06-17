import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kyjahrdaygiukanomvoz.supabase.co'
const supabaseKey = 'sb_publishable_nJWLrqCzB5rmR2vv3k-Hmg_ReHUF6AI'

export const supabase = createClient(supabaseUrl, supabaseKey)