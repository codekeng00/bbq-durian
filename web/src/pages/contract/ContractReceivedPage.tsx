import { Link, useSearchParams } from "react-router-dom";
import { useDemoData } from "../../hooks/useDemoData";

export default function ContractReceivedPage() {
  const [params] = useSearchParams();
  const { getDeal } = useDemoData();

  const dealId = params.get("dealId") ?? "";
  const deal = getDeal(dealId);

  if (!deal || deal.status !== "approved" || !deal.contractContent) {
    return (
      <main className="received-layout">
        <header className="simple-topbar">DealMaker</header>
        <p style={{ padding: "2rem" }}>
          Contract not available. <Link to="/active-pipelines-sales">Back to pipelines</Link>
        </p>
      </main>
    );
  }

  return (
    <main className="received-layout">
      <header className="simple-topbar">DealMaker</header>
      <div className="received-grid">
        <section className="received-document">
          <header>▣ &nbsp; Service Agreement</header>
          <article className="agreement-paper">
            {deal.contractContent.split("\n").map((line, i) => (
              <p key={i} style={{ margin: "4px 0" }}>{line || " "}</p>
            ))}
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
            <p>The DealMaker pipeline has generated the final agreement.</p>
            <dl>
              <div style={{ gridColumn: "1 / -1" }}>
                <dt>CLIENT</dt>
                <dd>{deal.extracted.clientName ?? "Client"}</dd>
              </div>
              <div>
                <dt>TOTAL VALUE</dt>
                <dd>${(deal.extracted.value ?? 0).toLocaleString()}</dd>
              </div>
              <div>
                <dt>TERMS</dt>
                <dd style={{ color: "#0b1c30" }}>Net 30</dd>
              </div>
            </dl>
          </section>
          <Link className="download-button" to="/active-pipelines-sales">
            ← Back to Pipelines
          </Link>
        </aside>
      </div>
    </main>
  );
}
