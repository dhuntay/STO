import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Server-only client using the service-role key, which bypasses RLS
// entirely. Use this ONLY from trusted server contexts (API routes) and
// ONLY for the handful of operations that genuinely need to cross a
// customer/truck-owner boundary or write a table that has no client policy
// at all -- truck_pos_connections (never client-writable/readable, see its
// migration) and payments/orders status transitions that don't belong to
// either party's own RLS-granted write (see 0005 migration's comment on
// payments: "a payment's status should only ever be written by a trusted
// server context"). Never import this from a "use client" component or
// expose SUPABASE_SERVICE_ROLE_KEY to the browser.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured -- required for Square payment/webhook handling."
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
