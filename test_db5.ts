import { supabase } from './src/lib/supabase.ts';
async function test() {
  const { data, error } = await supabase.rpc('get_schema');
  console.log("schema:", data, error);
}
test();
