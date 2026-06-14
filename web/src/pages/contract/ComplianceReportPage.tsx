export default function ComplianceReportPage() {
  return (
    <main className="report-layout">
      <header className="simple-topbar">DealMaker</header>
      <div className="report-grid">
        <section className="report-main">
          <h1>Compliance Summary Report</h1>
          <p>
            Detailed analysis of contract #DEAL-2024-8842 against Global Enterprise Tech
            standards.
          </p>
          <section className="report-card">
            <header className="issue-title">
              <span>◉</span>
              <h2>Critical Failure: Liability Terms</h2>
            </header>
          </section>
          <section className="report-card">
            <header className="issue-title warning">
              <span>△</span>
              <h2>High Risk: Payment Terms</h2>
            </header>
            <div className="issue-body">
              <small>FOUND IN SECTION 2.1</small>
              <p>
                The requested upfront deposit of 45% is flagged as high-risk for a new vendor
                engagement.
              </p>
              <p className="recommendation">
                Recommendation: Adjust the upfront payment to 15% or provide a performance bond
                for the requested amount.
              </p>
            </div>
          </section>
          <section className="next-step">
            <span>ⓘ</span>
            <div>
              <strong>Next Steps</strong>
              <p>
                The findings above can be addressed before contract generation. You can submit a
                revised document or initiate manual legal review.
              </p>
            </div>
          </section>
        </section>
        <aside className="report-side">
          <section className="failure-card">
            <strong>◉ &nbsp; Review Failed</strong>
            <p>
              Critical commercial clauses fall outside approved Global Enterprise Tech standards.
            </p>
          </section>
          <section className="report-details">
            <h3>CONTRACT DETAILS</h3>
            <dl>
              <div>
                <dt>ID</dt>
                <dd>#DEAL-8842</dd>
              </div>
              <div>
                <dt>Value</dt>
                <dd>$124,500.00</dd>
              </div>
              <div>
                <dt>Agent</dt>
                <dd>Review Agent 4</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </main>
  );
}
