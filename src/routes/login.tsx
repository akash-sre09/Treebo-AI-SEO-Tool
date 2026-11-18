import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lightbulb, Loader2, Radar } from "lucide-react";
import { useTreeboAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable";
import { safeReturnPath } from "@/lib/treebo-auth";
import "./login.css";

const RETURN_PATH_KEY = "treebo.auth.return-path";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string; reason?: string } => ({
    ...(typeof search["redirect"] === "string" ? { redirect: search["redirect"] } : {}),
    ...(typeof search["reason"] === "string" ? { reason: search["reason"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Treebo AI Visibility Agent" },
      { name: "description", content: "Sign in with your Treebo Google account to use the AI Visibility Agent." },
      { property: "og:title", content: "Sign in — Treebo AI Visibility Agent" },
      { property: "og:description", content: "Google sign-in for Treebo company accounts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Login,
});

function GoogleLogo() {
  return (
    <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
    </svg>
  );
}

function Login() {
  const { redirect: requestedPath, reason } = Route.useSearch();
  const { user, loading } = useTreeboAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const returnPath = safeReturnPath(requestedPath);

  useEffect(() => {
    if (!user) return;
    const savedPath = window.sessionStorage.getItem(RETURN_PATH_KEY);
    window.sessionStorage.removeItem(RETURN_PATH_KEY);
    void navigate({ to: safeReturnPath(savedPath ?? returnPath), replace: true });
  }, [navigate, returnPath, user]);

  const signIn = async () => {
    setBusy(true);
    setError(null);
    window.sessionStorage.setItem(RETURN_PATH_KEY, returnPath);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/login`,
      extraParams: { hd: "treebo.com", prompt: "select_account" },
    });
    if (result.redirected) return;
    setBusy(false);
    if (result.error) {
      const message = result.error instanceof Error ? result.error.message : String(result.error);
      setError(/treebo\.com|unauthorized/i.test(message)
        ? "Please use your @treebo.com Google account."
        : "Google sign-in could not be completed. Please try again.");
    }
  };

  return (
    <main className="treebo-login">
      <header className="treebo-login-header">
        <div className="treebo-login-brand" aria-label="Treebo AI Visibility">
          <span className="treebo-login-emblem" aria-hidden="true">T</span>
          <span className="treebo-login-wordmark">
            <span className="treebo-login-brand-name">Treebo</span>
            <span className="treebo-login-product-name">AI Visibility</span>
          </span>
        </div>
      </header>

      <div className="treebo-login-content">
        <div className="treebo-login-features" aria-label="Product highlights">
          <section className="treebo-login-feature-card">
            <div className="treebo-login-feature-topline">
              <span className="treebo-login-feature-icon"><Radar aria-hidden="true" /></span>
              <span className="treebo-login-feature-pill">AI insights</span>
            </div>
            <h2>AI Probe</h2>
            <p>See how ChatGPT &amp; Gemini answer real traveller questions</p>
            <span className="treebo-login-feature-line" aria-hidden="true" />
          </section>

          <section className="treebo-login-feature-card">
            <div className="treebo-login-feature-topline">
              <span className="treebo-login-feature-icon"><Lightbulb aria-hidden="true" /></span>
              <span className="treebo-login-feature-pill">Grow smarter</span>
            </div>
            <h2>Win AI Visibility</h2>
            <p>Find missed answers, fix wrong facts, publish better pages</p>
            <span className="treebo-login-feature-line" aria-hidden="true" />
          </section>
        </div>

        <section className="treebo-login-card" aria-labelledby="login-heading">
          <div className="treebo-login-card-accent" aria-hidden="true" />
          <p className="treebo-login-eyebrow">Treebo team workspace</p>
          <h1 id="login-heading">Welcome to <span>Treebo AI Visibility</span></h1>
          <p className="treebo-login-subtitle">Sign in with your Treebo account</p>

          <Button
            type="button"
            onClick={() => void signIn()}
            disabled={busy || loading}
            className="treebo-login-google-button"
            style={{ backgroundColor: "#FFFFFF", border: "1px solid #747775", color: "#1F1F1F", padding: "12px", gap: "10px", fontSize: "14px", lineHeight: "20px" }}
          >
            <span className="treebo-login-google-icon">
              {busy || loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <GoogleLogo />}
            </span>
            {busy ? "Opening Google…" : "Sign in with Google"}
          </Button>

          <p className="treebo-login-note">Only @treebo.com accounts can sign in.</p>
          {(reason === "domain" || error) && (
            <p role="alert" className="treebo-login-alert">
              {error ?? "Please use your @treebo.com Google account."}
            </p>
          )}
          <p className="treebo-login-footer">Internal tool for the Treebo team</p>
        </section>
      </div>
    </main>
  );
}
