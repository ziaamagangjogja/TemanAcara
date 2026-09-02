import { supabase } from './src/lib/supabase.ts';
async function test() {
  console.log("Checking tables...");
  const { data: chats } = await supabase.from('chats').select('*').limit(1);
  const { data: messages } = await supabase.from('messages').select('*').limit(1);
  console.log('chats:', chats);
  console.log('messages:', messages);
}
test();
