import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDemoData } from "../../hooks/useDemoData";
import type { Team } from "../../data/types";

export default function LoginPage() {
  const [submitting, setSubmitting] = useState<Team>();
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const {
    currentUser,
    devMode,
    sessionLoading,
    login,
  } = useDemoData();

  useEffect(() => {
    if (!currentUser) return;
    navigate(
      currentUser.team === "sales"
        ? "/active-pipelines-sales"
        : "/active-pipelines-business",
      { replace: true },
    );
  }, [currentUser, navigate]);

  async function handleDevLogin(team: Team) {
    setSubmitting(team);
    setError("");
    try {
      const user = await login(team);
      navigate(
        user.team === "sales"
          ? "/active-pipelines-sales"
          : "/active-pipelines-business",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Login failed.");
    } finally {
      setSubmitting(undefined);
    }
  }

  return (
    <div className="login-shell">
      <header className="login-topbar">
        <Link className="login-brand" to="/">
          DealMaker
        </Link>
        <nav className="support-nav" aria-label="Support">
          <span>Need assistance?</span>
          <a href="mailto:support@dealmaker.example">Contact Support</a>
        </nav>
      </header>

      <main className="login-layout">
        <section className="login-hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <h1 id="hero-title">Secure deal review from proposal to agreement.</h1>
            <p>
              Versioned proposals, policy-aware review, human approvals, and
              auditable agreement records for sales and business teams.
            </p>
          </div>
          <figure className="hero-visual">
            <img
              src="/assets/collaboration.png"
              alt="Business and sales teams connected through a secure digital workflow"
            />
          </figure>
        </section>

        <section className="login-panel" aria-labelledby="login-title">
          <div className="login-card">
            <header className="login-heading">
              <h2 id="login-title">Organization access</h2>
              <p>
                Production identity is verified by Cloudflare Access. Roles are
                assigned by your organization and cannot be selected in the browser.
              </p>
            </header>

            {sessionLoading ? (
              <p className="muted-note">Checking secure session...</p>
            ) : devMode ? (
              <>
                <div className="dev-mode-note">
                  Local development mode. Choose a seeded user to test the workflow.
                </div>
                <div className="role-selector" aria-label="Development user">
                  <button
                    className="role-button"
                    type="button"
                    disabled={Boolean(submitting)}
                    onClick={() => handleDevLogin("sales")}
                  >
                    <img src="/assets/sales-role.svg" alt="" aria-hidden="true" />
                    {submitting === "sales" ? "Signing in..." : "Alice - Sales"}
                  </button>
                  <button
                    className="role-button"
                    type="button"
                    disabled={Boolean(submitting)}
                    onClick={() => handleDevLogin("business")}
                  >
                    <img src="/assets/business-role.svg" alt="" aria-hidden="true" />
                    {submitting === "business" ? "Signing in..." : "Bob - Business"}
                  </button>
                </div>
              </>
            ) : (
              <div className="access-required">
                <strong>Access session not found</strong>
                <p>
                  Open this application through your organization&apos;s protected
                  DealMaker URL and complete the emailed one-time PIN or SSO prompt.
                </p>
                <button
                  className="authenticate-button"
                  type="button"
                  onClick={() => window.location.reload()}
                >
                  Check Access Session
                </button>
              </div>
            )}

            {error && <p className="error-banner" role="alert">{error}</p>}

            <p className="account-access">
              Need access?{" "}
              <a href="mailto:support@dealmaker.example?subject=DealMaker%20access%20request">
                Request organization access
              </a>
            </p>
          </div>
        </section>
      </main>

      <footer className="login-footer">
        <span>
          <img src="/assets/agent.svg" alt="" aria-hidden="true" />
          Identity and roles enforced by the server
        </span>
        <i aria-hidden="true">|</i>
        <span>Production workflow</span>
      </footer>
    </div>
  );
}
