import { Link } from "react-router-dom";
import AppSidebar from "../components/AppSidebar";

export default function ClientEmailReviewPage() {
  return (
    <main className="review-shell">
      <AppSidebar className="review-side" brandTo="/active-pipelines-keng" />
      <section className="review-content">
        <header className="review-top">
          <div>
            <p className="back-label">← BACK TO PIPELINE</p>
            <h1>Review Client Communication</h1>
          </div>
          <Link className="primary-button" to="/analysis-workspace">
            ◉ Open in Analysis
          </Link>
        </header>
        <article className="email-review-card">
          <header className="review-meta">
            <div>
              <small>FROM</small>
              <strong>Marcus Thames</strong>
              <small>TO</small>
              <strong>Nexus Sales Team</strong>
            </div>
            <div>
              <small>SUBJECT</small>
              <strong>Re: Revised Master Service Agreement - Q4 Expansion</strong>
              <small>DATE</small>
              <strong>October 14, 2023 • 10:42 AM</strong>
            </div>
          </header>
          <div className="review-letter">
            <p>Dear Nexus Team,</p>
            <p>
              Thank you for the quick turnaround on the revised terms. After reviewing the latest
              draft with our legal and operations teams, we are generally aligned with the service
              structure included in the amended proposal.
            </p>
            <p>
              However, we would like the final agreement to retain the{" "}
              <mark>NET-30 PAYMENT TERMS</mark> and clarify the implementation schedule. The
              current language should explicitly reference our Q4 expansion timeline and the
              required regional support coverage.
            </p>
            <p>
              Additionally, please include a{" "}
              <mark className="purple">STANDARD TERMINATION CLAUSE</mark> and confirm that
              liability remains capped at the contracted value. Once those points are
              incorporated, I should be able to secure approval from our executive team.
            </p>
            <p>Please let me know when your revised draft is available for a final review.</p>
            <p>
              Best regards,
              <br />
              Marcus Thames
              <br />
              VP of Operations, GlobalEdge Corp
            </p>
          </div>
        </article>
      </section>
    </main>
  );
}
