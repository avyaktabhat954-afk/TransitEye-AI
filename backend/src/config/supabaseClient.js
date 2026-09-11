/**
 * Supabase Client Configuration
 *
 * Initializes a Supabase client for backend server-side use.
 * Uses SUPABASE_SERVICE_ROLE_KEY (not the anon key) because the
 * backend is a trusted server that requires full database access.
 *
 * Environment variables consumed (from .env):
 *   SUPABASE_URL             — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — Service-role secret key (server-only)
 *
 * If either variable is missing, the client is NOT created and
 * supabaseEnabled is set to false. This allows the rest of the
 * application to fall back to in-memory repositories gracefully.
 *
 * SECURITY: Credentials are read exclusively from process.env.
 *           They are never logged, printed, or hardcoded.
 */

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
// Modern Supabase API key name: SUPABASE_SECRET_KEY (server-side secret)
// Legacy fallback: SUPABASE_SERVICE_ROLE_KEY
const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
let supabaseEnabled = false;

if (supabaseUrl && supabaseSecretKey) {
  supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  supabaseEnabled = true;
} else {
  const missing = [];
  if (!supabaseUrl) missing.push("SUPABASE_URL");
  if (!supabaseSecretKey) missing.push("SUPABASE_SECRET_KEY");
  console.warn(
    `[Supabase] Client NOT initialized — missing env var(s): ${missing.join(", ")}. ` +
      `Backend will use in-memory repositories.`
  );
}

/**
 * Performs a lightweight connectivity check against Supabase.
 * Does NOT create or modify any data.
 *
 * @returns {Promise<{connected: boolean, error?: string}>}
 */
async function checkSupabaseConnection() {
  if (!supabase) {
    return { connected: false, error: "Supabase client not initialized" };
  }
  try {
    // A minimal RPC-free query: fetch zero rows from a dummy table.
    // This validates that the URL is reachable and the secret key is accepted.
    const { error } = await supabase.from("_dummy_connectivity_check").select("*").limit(0);

    if (error) {
      const msg = error.message || "";
      // These errors indicate successful authentication with PostgREST/PostgreSQL,
      // confirming the project is reachable and the secret key is valid:
      if (
        msg.includes("does not exist") ||
        msg.includes("relation") ||
        msg.includes("schema cache") ||
        msg.includes("Could not find the table") ||
        error.code === "PGRST205" || // PostgREST: table not in schema cache
        error.code === "PGRST116" || // PostgREST: relation not found
        error.code === "42P01"       // PostgreSQL: undefined_table
      ) {
        return { connected: true };
      }
      return { connected: false, error: `Supabase responded with error: ${error.code || error.message || "UNKNOWN"}` };
    }

    return { connected: true };
  } catch (err) {
    return { connected: false, error: `Connection failed: ${err.message}` };
  }
}

module.exports = {
  supabase,
  supabaseEnabled,
  checkSupabaseConnection,
};
