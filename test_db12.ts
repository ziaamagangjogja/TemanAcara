import { supabase } from './src/lib/supabase.ts';
async function test() {
  const { data, error } = await supabase.from('chats').select('*').limit(1);
  console.log('error:', error);
  console.log('data:', data);
}
test();
