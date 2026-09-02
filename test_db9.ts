import { supabase } from './src/lib/supabase';
async function test() {
  const { data: chatRows } = await supabase.from('chats').select('*');
  console.log('chats:', chatRows?.length);
  if (chatRows && chatRows.length > 0) {
    const bookingIds = chatRows.map(r => r.booking_id);
    const { data: messageRows, error } = await supabase.from('messages').select('*').in('booking_id', bookingIds);
    console.log('messages error:', error);
    console.log('messages count:', messageRows?.length);
    console.log('messages sample:', messageRows?.[0]);
  }
}
test();
