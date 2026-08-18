import { createClient } from '@supabase/supabase-js';

// Novas credenciais do Supabase. O usuário deve preencher nas variáveis de ambiente.
export const supabaseUrl = 
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
  'https://vbxhkebuioylkzwtslqj.supabase.co';

export const supabaseAnonKey = 
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZieGhrZWJ1aW95bGt6d3RzbHFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NzkwNjQsImV4cCI6MjA5NzM1NTA2NH0.31qshdj2kUnFpyp0yw5tSKnmx55ZQtuYXYuYT0uV-rU';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Supabase não configurado! Certifique-se de configurar VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas suas variáveis de ambiente.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
