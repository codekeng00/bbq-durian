import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DEMO_USERS } from "../../data/users";
import { useDemoData } from "../../hooks/useDemoData";
import type { Team } from "../../data/types";

const DEMO_TOAST = "This feature is not available in the demo version.";

export default function LoginPage() {
  const [role, setRole] = useState<Team>("sales");
  const [email, setEmail] = useState(DEMO_USERS[role].email);
  const [password, setPassword] = useState("demo1234");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const navigate = useNavigate();
  const { login } = useDemoData();

  function showToast() {
    setToast(DEMO_TOAST);
    setTimeout(() => setToast(""), 3000);
  }

  function handleRoleChange(newRole: Team) {
    setRole(newRole);
    setEmail(DEMO_USERS[newRole].email);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const user = await login(email, password);
      navigate(
        user.team === "sales" ? "/active-pipelines-sales" : "/active-pipelines-business",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-shell">
      <header className="login-topbar">
        <Link className="login-brand" to="/">
          <img src="/assets/logo.svg" alt="" aria-hidden="true" />
          DealMaker
        </Link>
        <nav className="support-nav" aria-label="Support">
          <a href="mailto:robinhoo990512@gmail.com">Need assistance?</a>
          <a href="mailto:robinhoo990512@gmail.com">Contact Support</a>
        </nav>
      </header>

      <main className="login-layout">
        <section className="login-hero" aria-labelledby="hero-title">
          <img
            className="hero-bg"
            src="/assets/collaboration.png"
            alt=""
            aria-hidden="true"
          />
          <div className="hero-overlay" />
          <div className="hero-copy">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              AI-Powered Revenue Intelligence
            </div>
            <h1 id="hero-title">
              Know More. Move Faster.<br /><em>Sell Better.</em>
            </h1>
            <p>
              Turn sales conversations into signed contracts — DealMaker's AI agents
              extract deal intent, build proposals, and generate formal contracts ready
              for business review and approval.
            </p>
            <div className="hero-stats">
              <div>
                <span className="hero-stat-value">4×</span>
                <span className="hero-stat-label">Faster Proposals</span>
              </div>
              <div>
                <span className="hero-stat-value">98%</span>
                <span className="hero-stat-label">Compliance Rate</span>
              </div>
              <div>
                <span className="hero-stat-value">7 AI</span>
                <span className="hero-stat-label">Agents On-Duty</span>
              </div>
            </div>
          </div>
        </section>

        <section className="login-panel" aria-labelledby="login-title">
          <div className="login-card">
            <header className="login-heading">
              <h2 id="login-title">Welcome back</h2>
              <p>Access your AI-augmented sales environment.</p>
            </header>

            <div className="role-selector" aria-label="Select your role">
              <button
                className={`role-button ${role === "sales" ? "is-active" : ""}`}
                type="button"
                aria-pressed={role === "sales"}
                onClick={() => handleRoleChange("sales")}
              >
                <span className="role-button-icon">
                  <img src="/assets/sales-role.svg" alt="" aria-hidden="true" />
                </span>
                <span className="role-button-name">Sales Executive</span>
                <span className="role-button-desc">Proposals & pipelines</span>
              </button>
              <button
                className={`role-button ${role === "business" ? "is-active" : ""}`}
                type="button"
                aria-pressed={role === "business"}
                onClick={() => handleRoleChange("business")}
              >
                <span className="role-button-icon">
                  <img src="/assets/business-role.svg" alt="" aria-hidden="true" />
                </span>
                <span className="role-button-name">Business Admin</span>
                <span className="role-button-desc">Reviews & approvals</span>
              </button>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <label className="form-field">
                <span>Organization Email</span>
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                />
              </label>
              <div className="form-field">
                <span className="label-row">
                  <label htmlFor="password">Password</label>
                  <a href="#" onClick={(e) => { e.preventDefault(); showToast(); }}>Forgot?</a>
                </span>
                <span className="password-control">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <button
                    className="visibility-toggle"
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((value) => !value)}
                  >
                    <img src="/assets/eye.svg" alt="" aria-hidden="true" />
                  </button>
                </span>
              </div>
              <label className="remember-option" onClick={(e) => { e.preventDefault(); showToast(); }} style={{ cursor: "pointer" }}>
                <input type="checkbox" name="remember" readOnly checked={false} onChange={() => {}} />
                Remember this session for 30 days
              </label>
              <button className="authenticate-button" type="submit" disabled={submitting}>
                {submitting ? "Signing in..." : "Sign In"}
                <img src="/assets/arrow-right.svg" alt="" aria-hidden="true" />
              </button>
              {error && (
                <p className="error-banner" role="alert">
                  {error}
                </p>
              )}
            </form>

            <p className="account-access">
              New to DealMaker? <a href="#" onClick={(e) => { e.preventDefault(); showToast(); }}>Request Account Access</a>
            </p>
          </div>
        </section>
      </main>

      {toast && (
        <div className="login-toast" role="status">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="7.5" stroke="currentColor" strokeOpacity="0.4"/>
            <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {toast}
        </div>
      )}

      <footer className="login-footer">
        <span>
          <img src="/assets/agent.svg" alt="" aria-hidden="true" />
          Powered by bbq-durian
        </span>
        <i aria-hidden="true">|</i>
        <span>v1.0.0</span>
      </footer>
    </div>
  );
}
