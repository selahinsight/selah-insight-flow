import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    // Session-only pre-check to redirect obvious unauthenticated visits.
    // Server functions enforce admin authorization independently.
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/auth" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const [status, setStatus] = useState<"checking" | "admin" | "denied">("checking");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) {
        if (!cancelled) setStatus("denied");
        return;
      }
      const { data, error } = await supabase.rpc("is_admin", { _user_id: userRes.user.id });
      if (!cancelled) setStatus(!error && data ? "admin" : "denied");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "checking") {
    return (
      <div style={{ padding: 40, textAlign: "center", opacity: 0.6 }}>
        관리자 권한 확인 중…
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "grid",
          placeItems: "center",
          padding: 40,
          textAlign: "center",
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>접근 권한 없음</h1>
          <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 20 }}>
            이 계정은 관리자로 등록되어 있지 않습니다.
          </p>
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/auth";
            }}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid #ccc",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            다른 계정으로 로그인
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
