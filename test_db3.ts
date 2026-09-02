import { supabase } from './src/lib/supabase.ts';
async function test() {
  console.log("Checking messages columns...");
  const { data, error } = await supabase.from('messages').insert({
    chat_id: 'test-chat-id',
    sender_id: 'test-user-id',
    sender_type: 'user',
    message: 'test',
    status: 'sent'
  }).select();
  console.log('insert messages result:', data, error);
}
test();
