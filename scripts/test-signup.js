import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const [,, email, password] = process.argv;
if (!email || !password) {
  console.log('Usage: node scripts/test-signup.js email password');
  process.exit(1);
}

(async () => {
  try {
    console.log('Trying signUp for', email);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: 'script-test' } },
    });

    console.log('=== RESULT ===');
    console.log('data:', JSON.stringify(data, null, 2));
    console.log('error:', JSON.stringify(error, null, 2));
  } catch (e) {
    console.error('Exception while calling supabase:', e);
  }
})();
