import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ADMIN_RETURN_TO_KEY = "selah:admin-return-to";

function adminReturnTo() {
  const value = sessionStorage.getItem(ADMIN_RETURN_TO_KEY);
  sessionStorage.removeItem(ADMIN_RETURN_TO_KEY);
  return value?.startsWith("/admin") ? value : "/admin";
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [sendingLink, setSendingLink] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled && data.session) {
        window.location.assign(adminReturnTo());
        return;
      }
      if (!cancelled) setChecking(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        window.location.assign(adminReturnTo());
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function sendEmailLink() {
    const normalizedEmail = email.trim();
    if (!normalizedEmail || sendingLink) return;
    setSendingLink(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          emailRedirectTo: window.location.origin + "/auth",
          shouldCreateUser: false,
        },
      });
      if (error) {
        toast.error("로그인 링크 발송에 실패했습니다.");
        console.error(error);
        return;
      }
      toast.success("관리자 이메일로 로그인 링크를 보냈습니다.");
    } finally {
      setSendingLink(false);
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
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void sendEmailLink();
          }}
          placeholder="관리자 이메일"
          autoComplete="email"
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid #2f2f39",
            background: "#0f0f14",
            color: "#fff",
            fontSize: 14,
          }}
        />
        <button
          type="button"
          onClick={() => void sendEmailLink()}
          disabled={checking || !email.trim() || sendingLink}
          style={{
            width: "100%",
            marginTop: 10,
            padding: "12px 16px",
            borderRadius: 10,
            border: "1px solid #2f2f39",
            background: "#24242d",
            color: "#fff",
            fontWeight: 600,
            fontSize: 14,
            cursor: checking || !email.trim() || sendingLink ? "not-allowed" : "pointer",
            opacity: checking || !email.trim() || sendingLink ? 0.6 : 1,
          }}
        >
          {sendingLink ? "발송 중…" : "이메일로 로그인 링크 받기"}
        </button>
        <p style={{ fontSize: 11, opacity: 0.4, marginTop: 20 }}>
          권한이 없는 계정은 로그인 후에도 접근이 거부됩니다.
        </p>
      </div>
    </div>
  );
}
