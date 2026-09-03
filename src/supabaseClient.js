import { createClient } from '@supabase/supabase-js';

// Reemplaza con tus datos reales de Supabase
const supabaseUrl = 'https://dfpmapcyvbdrblpmayrr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRmcG1hcGN5dmJkcmJscG1heXJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNTU2MzYsImV4cCI6MjEwMzgzMTYzNn0.HEAKuniplNLJMgIEkbWh_MG1o_buuNXAjkff3TJ7A_s';

export const supabase = createClient(supabaseUrl, supabaseKey);