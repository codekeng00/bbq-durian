import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

type Role = "sales" | "business";

export default function LoginPage() {
  const [role, setRole] = useState<Role>("sales");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    navigate("/dashboard");
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
            <h1 id="hero-title">Know More. Move Faster. Sell Better.</h1>
            <p>
              DealMaker synchronizes your entire revenue pipeline, from initial CRM lead intake
              to AI-driven proposal generation and final human verification.
            </p>
          </div>
          <figure className="hero-visual">
            <img
              src="/assets/collaboration.png"
              alt="Business and sales teams connected through an AI-enabled digital network"
            />
          </figure>
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
                onClick={() => setRole("sales")}
              >
                <img src="/assets/sales-role.svg" alt="" aria-hidden="true" />
                Sales Executive
              </button>
              <button
                className={`role-button ${role === "business" ? "is-active" : ""}`}
                type="button"
                aria-pressed={role === "business"}
                onClick={() => setRole("business")}
              >
                <img src="/assets/business-role.svg" alt="" aria-hidden="true" />
                Business Admin
              </button>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <label className="form-field">
                <span>Organization Email</span>
                <input type="email" name="email" placeholder="name@company.com" required />
              </label>
              <div className="form-field">
                <span className="label-row">
                  <label htmlFor="password">Password</label>
                  <a href="#">Forgot?</a>
                </span>
                <span className="password-control">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="••••••••"
                    required
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
              <label className="remember-option">
                <input type="checkbox" name="remember" />
                Remember this session for 30 days
              </label>
              <button className="authenticate-button" type="submit">
                Authenticate
                <img src="/assets/arrow-right.svg" alt="" aria-hidden="true" />
              </button>
            </form>

            <p className="account-access">
              New to DealMaker? <a href="#">Request Account Access</a>
            </p>
          </div>
        </section>
      </main>

      <footer className="login-footer">
        <span>
          <img src="/assets/agent.svg" alt="" aria-hidden="true" />
          Powered by DealMaker AI Agent Orchestration
        </span>
        <i aria-hidden="true">|</i>
        <span>v2.4.0-Enterprise</span>
      </footer>
    </div>
  );
}
