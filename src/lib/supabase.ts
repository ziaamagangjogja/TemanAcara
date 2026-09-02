import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://mykgtcpeemlpdcxlffbs.supabase.co"
const supabaseAnonKey = "sb_publishable_eLN0d2JJj8ahnO6MSYg3JQ_6z3S14bv"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)