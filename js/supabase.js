const SUPABASE_URL = "https://pucnyegqdiuzscezzugx.supabase.co";

const SUPABASE_ANON_KEY =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1Y255ZWdxZGl1enNjZXp6dWd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzMzU1MjYsImV4cCI6MjA4MTkxMTUyNn0.7LTcIyPOwqX1Z2UeVumAJBP6buWz3du3oNRCpVwvpiY";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
