import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useDemoData } from "../../hooks/useDemoData";
import type { Deal } from "../../data/types";

export default function ContractReceivedPage() {
  const [params] = useSearchParams();
  const { loadDeal } = useDemoData();
  const dealId = params.get("dealId") ?? "";
  const [deal, setDeal] = useState<Deal>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    loadDeal(dealId)
      .then((loaded) => {
        if (active) setDeal(loaded);
      })
      .catch((caught) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Agreement could not load.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [dealId, loadDeal]);

  if (loading) {
    return <main className="page-message">Loading agreement draft...</main>;
  }

  if (!deal || deal.status !== "approved" || !deal.contractContent) {
    return (
      <main className="received-layout">
        <header className="simple-topbar">DealMaker</header>
        <p className="page-message">
          {error || "Agreement is not available."}{" "}
          <Link to="/active-pipelines-sales">Back to pipelines</Link>
        </p>
      </main>
    );
  }

  function downloadAgreement() {
    if (!deal?.contractContent) return;
    const url = URL.createObjectURL(
      new Blob([deal.contractContent], { type: "text/plain" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${deal.extracted.clientName}-agreement-draft.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="received-layout">
      <header className="simple-topbar">
        DealMaker
        <Link to="/active-pipelines-sales">Back to Pipelines</Link>
      </header>
      {error && <p className="error-banner" role="alert">{error}</p>}
      <div className="received-grid">
        <section className="received-document">
          <article className="document-paper">
            <div className="contract-doc-badge">COMMERCIAL CONTRACT</div>
            {deal.contractContent.split("\n").map((line, i) => {
              const isHeading =
                /^[A-Z][A-Z\s\/&]{4,}[A-Z]$/.test(line.trim()) ||
                /^\d+\.\s+[A-Z]/.test(line.trim());
              return isHeading
                ? <h3 key={i} className="contract-section-heading">{line}</h3>
                : <p key={i} className="contract-line">{line || " "}</p>;
            })}
          </article>
        </section>
        <aside className="received-side">
          <section className="status-card">
            <div className="status-heading">
              <span className="status-check">
                {deal.contractStatus === "signed" ? "✓" : "!"}
              </span>
              <div>
                <h2>
                  {deal.contractStatus === "signed"
                    ? "Internal Signature Recorded"
                    : "Contract Draft Ready"}
                </h2>
                <span className="pill">
                  {deal.contractStatus === "signed" ? "SIGNED INTERNALLY" : "DRAFT"}
                </span>
              </div>
            </div>
            <p>
              {deal.contractStatus === "signed"
                ? "The authenticated internal approval signature is recorded. Any required client counter-signature must still be completed through the approved external process."
                : "Review the generated legal draft. It is not effective until required authorized parties sign it."}
            </p>
            <dl>
              <div className="dl-full">
                <dt>CLIENT</dt>
                <dd>{deal.extracted.clientName}</dd>
              </div>
              <div>
                <dt>TOTAL VALUE</dt>
                <dd>${deal.extracted.value?.toLocaleString()}</dd>
              </div>
              <div>
                <dt>TERMS</dt>
                <dd className="dd-ink">Net 30 draft</dd>
              </div>
              {deal.contractHash && (
                <div className="dl-full">
                  <dt>DOCUMENT HASH</dt>
                  <dd className="hash-value">{deal.contractHash}</dd>
                </div>
              )}
            </dl>
          </section>

          <div className="document-actions">
            <button type="button" onClick={downloadAgreement}>
              Download
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}
