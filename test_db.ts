import { supabase } from './src/lib/supabase.ts';
async function test() {
  console.log("Fetching chats...");
  const { data: chats, error: chatsError } = await supabase.from('chats').select('*');
  console.log('chats:', chats, chatsError);

  console.log("Fetching messages...");
  const { data: messages, error: messagesError } = await supabase.from('messages').select('*');
  console.log('messages:', messages, messagesError);
}
test();
