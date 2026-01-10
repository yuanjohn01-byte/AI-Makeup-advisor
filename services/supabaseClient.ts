import { createClient } from '@supabase/supabase-js';

// Access environment variables with support for both Create React App and Vite
const getEnvVar = (key: string, viteKey: string, fallback: string) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  // @ts-ignore - import.meta is a Vite/ESM feature
  if (import.meta && import.meta.env && import.meta.env[viteKey]) {
    // @ts-ignore
    return import.meta.env[viteKey];
  }
  return fallback;
};

const supabaseUrl = getEnvVar(
  'REACT_APP_SUPABASE_URL', 
  'VITE_SUPABASE_URL', 
  'https://qalhrtqoaqjrbysqjwaw.supabase.co'
);

const supabaseKey = getEnvVar(
  'REACT_APP_SUPABASE_ANON_KEY', 
  'VITE_SUPABASE_ANON_KEY', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhbGhydHFvYXFqcmJ5c3Fqd2F3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0OTUzNTksImV4cCI6MjA4MTA3MTM1OX0.Oo0ZRtJIdZdnMvGluexuFsSoyCg5rqFiiPYWYE2zpxE'
);

export const supabase = createClient(supabaseUrl, supabaseKey);