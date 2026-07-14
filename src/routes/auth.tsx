import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled && data.session) {
        navigate({ to: "/admin" });
        return;
      }
      if (!cancelled) setChecking(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        navigate({ to: "/admin" });
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  async function signInWithGoogle() {
    if (signingIn) return;
    setSigningIn(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/auth",
      });
      if (result.error) {
        toast.error("로그인에 실패했습니다.");
        console.error(result.error);
      }
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#0b0b0f",
        color: "#fff",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          padding: 32,
          borderRadius: 16,
          background: "#15151c",
          border: "1px solid #26262f",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>관리자 로그인</h1>
        <p style={{ fontSize: 13, opacity: 0.65, marginBottom: 24 }}>
          Selah Studio 내부 관리자만 접근할 수 있습니다.
        </p>
        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={checking || signingIn}
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: 10,
            border: "1px solid #2f2f39",
            background: "#fff",
            color: "#111",
            fontWeight: 600,
            fontSize: 14,
            cursor: checking || signingIn ? "not-allowed" : "pointer",
            opacity: checking || signingIn ? 0.6 : 1,
          }}
        >
          {signingIn ? "이동 중…" : "Google 계정으로 계속하기"}
        </button>
        <p style={{ fontSize: 11, opacity: 0.4, marginTop: 20 }}>
          권한이 없는 계정은 로그인 후에도 접근이 거부됩니다.
        </p>
      </div>
    </div>
  );
}
