import { supabase } from './src/lib/supabase.ts';
async function test() {
  console.log("Inserting test chat...");
  const { data, error } = await supabase.from('chats').upsert({
    booking_id: 'test-booking-id',
    user_id: 'test-user-id',
    talent_id: 'test-talent-id',
    messages: [],
    last_message: 'test',
    last_message_time: new Date().toISOString()
  }, { onConflict: 'booking_id' }).select();
  console.log('insert result:', data, error);
}
test();
