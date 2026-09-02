import { supabase } from './src/lib/supabase.ts';
async function test() {
  const { data, error } = await supabase.from('messages').insert({}).select();
  console.log('insert messages result:', data, error);
}
test();
