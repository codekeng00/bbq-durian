export default function ContractReceivedPage() {
  return (
    <main className="received-layout">
      <header className="simple-topbar">DealMaker</header>
      <div className="received-grid">
        <section className="received-document">
          <header>▣ &nbsp; Service Agreement</header>
          <article className="agreement-paper">
            <h1>SERVICE AGREEMENT</h1>
            <p className="subtitle">Ref: DEAL-2024-8842</p>
            <section>
              <h2>1. SCOPE OF SERVICES</h2>
              <p>
                DealMaker shall provide Global Enterprise Tech with automated pipeline integration
                services as detailed in the technical specification document. This includes
                real-time verification, contract generation, and automated follow-up scheduling.
              </p>
            </section>
            <section>
              <h2>2. COMMERCIAL TERMS</h2>
              <p>
                The total contract value is set at $124,500.00 USD. Payment terms are Net 30 from
                the effective date of Oct 24, 2024.
              </p>
            </section>
            <section>
              <h2>3. SIGNATURES</h2>
              <div className="signatures">
                <div className="signature">
                  <strong>DEALMAKER REPRESENTATIVE</strong>
                  <p>Digital Signature Applied</p>
                </div>
                <div className="signature">
                  <strong>GLOBAL ENTERPRISE TECH CLIENT</strong>
                </div>
              </div>
            </section>
          </article>
        </section>
        <aside className="received-side">
          <section className="status-card">
            <div className="status-heading">
              <span className="status-check">✓</span>
              <div>
                <h2>Ready for Signature</h2>
                <span className="pill">APPROVED</span>
              </div>
            </div>
            <p>
              The DealMaker pipeline has generated the final agreement for Global Enterprise Tech.
            </p>
            <dl>
              <div style={{ gridColumn: "1 / -1" }}>
                <dt>CONTRACT ID</dt>
                <dd>#DEAL-2024-8842</dd>
              </div>
              <div>
                <dt>TOTAL VALUE</dt>
                <dd>$124,500.00</dd>
              </div>
              <div>
                <dt>TERMS</dt>
                <dd style={{ color: "#0b1c30" }}>Net 30</dd>
              </div>
            </dl>
          </section>
          <button className="download-button">⇩ Download PDF</button>
        </aside>
      </div>
    </main>
  );
}
