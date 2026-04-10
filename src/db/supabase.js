/**
 * SUPABASE DATABASE CONNECTION
 * 
 * This file initializes and exports the Supabase client
 * for use throughout the backend.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Get credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Check if credentials are present (helpful for debugging)
if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ ERROR: Missing Supabase credentials in .env file');
    console.error('Please check SUPABASE_URL and SUPABASE_ANON_KEY');
}

// Create and export the Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

module.exports = supabase;