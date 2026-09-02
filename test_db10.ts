import { supabase } from './src/lib/supabase.ts';
async function test() {
  const { data: chats, error: chatsErr } = await supabase.from('chats').select('*');
  console.log('chats error:', chatsErr);
  if (chats && chats.length > 0) {
    const { data: msgs, error: msgErr } = await supabase.from('messages').insert({
      id: crypto.randomUUID(),
      booking_id: chats[0].booking_id,
      sender_id: 'test',
      sender_type: 'user',
      message: 'test message'
    }).select();
    console.log('msg error:', msgErr);
    console.log('msg data:', msgs);
  }
}
test();
