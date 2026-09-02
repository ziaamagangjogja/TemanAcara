import { supabase } from './src/lib/supabase.ts';
async function test() {
  const { data, error } = await supabase.from('chats').insert({}).select();
  console.log('insert chats result:', data, error);
}
test();
