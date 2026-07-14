// Server-only middleware that enforces authenticated + admin access for
// createServerFn handlers. Chains on top of `requireSupabaseAuth` so the
// caller's bearer token is validated first, then checks the `admin_users`
// table (via the security-definer `is_admin(uuid)` RPC).

import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { data, error } = await context.supabase.rpc("is_admin", {
      _user_id: context.userId,
    });
    if (error) throw new Error(`Forbidden: ${error.message}`);
    if (!data) throw new Error("Forbidden: admin access required");
    return next({ context });
  });
