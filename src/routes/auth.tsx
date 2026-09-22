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

function hasRecoveryIntent() {
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return params.get("reset") === "1" || hash.get("type") === "recovery";
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [view, setView] = useState<"login" | "request-reset" | "set-password">(
    "login",
  );

  useEffect(() => {
    let cancelled = false;
    const recoveryIntent = hasRecoveryIntent();
    if (recoveryIntent) setView("set-password");

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session && !recoveryIntent) {
        window.location.assign(adminReturnTo());
        return;
      }
      setChecking(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setView("set-password");
        setChecking(false);
        return;
      }
      if (event === "SIGNED_IN" && session && !hasRecoveryIntent()) {
        window.location.assign(adminReturnTo());
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signIn() {
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password || submitting) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (error) {
        toast.error("이메일 또는 비밀번호를 확인해 주세요.");
        return;
      }
      window.location.assign(adminReturnTo());
    } finally {
      setSubmitting(false);
    }
  }

  async function sendResetLink() {
    const normalizedEmail = email.trim();
    if (!normalizedEmail || submitting) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/auth?reset=1`,
      });
      if (error) {
        toast.error("재설정 링크 발송에 실패했습니다.");
        console.error(error);
        return;
      }
      toast.success("관리자 이메일로 비밀번호 재설정 링크를 보냈습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function updatePassword() {
    if (password.length < 8) {
      toast.error("새 비밀번호는 8자 이상으로 입력해 주세요.");
      return;
    }
    if (password !== passwordConfirm) {
      toast.error("새 비밀번호가 서로 일치하지 않습니다.");
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error("비밀번호 변경에 실패했습니다. 재설정 링크를 다시 받아주세요.");
        console.error(error);
        return;
      }
      toast.success("비밀번호를 변경했습니다.");
      window.history.replaceState({}, "", "/auth");
      window.location.assign(adminReturnTo());
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box" as const,
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid #2f2f39",
    background: "#0f0f14",
    color: "#fff",
    fontSize: 14,
  };

  const buttonStyle = {
    width: "100%",
    marginTop: 10,
    padding: "12px 16px",
    borderRadius: 10,
    border: "1px solid #2f2f39",
    background: "#24242d",
    color: "#fff",
    fontWeight: 600,
    fontSize: 14,
  };

  const disabled = checking || submitting;

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
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>
          {view === "set-password" ? "새 비밀번호 설정" : "관리자 로그인"}
        </h1>
        <p style={{ fontSize: 13, opacity: 0.65, marginBottom: 24 }}>
          {view === "login" && "Selah Studio 내부 관리자만 접근할 수 있습니다."}
          {view === "request-reset" && "등록된 관리자 이메일로 재설정 링크를 보내드립니다."}
          {view === "set-password" && "앞으로 사용할 새 비밀번호를 입력해 주세요."}
        </p>

        {view !== "set-password" && (
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void (view === "login" ? signIn() : sendResetLink());
              }
            }}
            placeholder="관리자 이메일"
            autoComplete="email"
            style={inputStyle}
          />
        )}

        {view === "login" && (
          <>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void signIn();
              }}
              placeholder="비밀번호"
              autoComplete="current-password"
              style={{ ...inputStyle, marginTop: 10 }}
            />
            <button
              type="button"
              onClick={() => void signIn()}
              disabled={disabled || !email.trim() || !password}
              style={{ ...buttonStyle, cursor: disabled ? "not-allowed" : "pointer" }}
            >
              {submitting ? "로그인 중…" : "로그인"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPassword("");
                setView("request-reset");
              }}
              disabled={disabled}
              style={{
                marginTop: 16,
                border: 0,
                background: "transparent",
                color: "#c8c8d0",
                fontSize: 13,
                textDecoration: "underline",
                cursor: disabled ? "not-allowed" : "pointer",
              }}
            >
              비밀번호를 잊으셨나요?
            </button>
          </>
        )}

        {view === "request-reset" && (
          <>
            <button
              type="button"
              onClick={() => void sendResetLink()}
              disabled={disabled || !email.trim()}
              style={{ ...buttonStyle, cursor: disabled ? "not-allowed" : "pointer" }}
            >
              {submitting ? "발송 중…" : "비밀번호 재설정 링크 받기"}
            </button>
            <button
              type="button"
              onClick={() => setView("login")}
              disabled={disabled}
              style={{
                marginTop: 16,
                border: 0,
                background: "transparent",
                color: "#c8c8d0",
                fontSize: 13,
                textDecoration: "underline",
                cursor: disabled ? "not-allowed" : "pointer",
              }}
            >
              로그인으로 돌아가기
            </button>
          </>
        )}

        {view === "set-password" && (
          <>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="새 비밀번호 (8자 이상)"
              autoComplete="new-password"
              style={inputStyle}
            />
            <input
              type="password"
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void updatePassword();
              }}
              placeholder="새 비밀번호 확인"
              autoComplete="new-password"
              style={{ ...inputStyle, marginTop: 10 }}
            />
            <button
              type="button"
              onClick={() => void updatePassword()}
              disabled={disabled || !password || !passwordConfirm}
              style={{ ...buttonStyle, cursor: disabled ? "not-allowed" : "pointer" }}
            >
              {submitting ? "변경 중…" : "새 비밀번호 저장"}
            </button>
          </>
        )}

        <p style={{ fontSize: 11, opacity: 0.4, marginTop: 20 }}>
          권한이 없는 계정은 로그인 후에도 접근이 거부됩니다.
        </p>
      </div>
    </div>
  );
}
