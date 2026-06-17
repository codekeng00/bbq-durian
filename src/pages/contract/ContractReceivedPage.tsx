import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useDemoData } from "../../hooks/useDemoData";
import type { Deal } from "../../data/types";

export default function ContractReceivedPage() {
  const [params] = useSearchParams();
  const { currentUser, loadDeal, signAgreement } = useDemoData();
  const dealId = params.get("dealId") ?? "";
  const [deal, setDeal] = useState<Deal>();
  const [typedName, setTypedName] = useState(currentUser?.name ?? "");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
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

  async function handleSign() {
    if (!deal || busy) return;
    setBusy(true);
    setError("");
    try {
      const updated = await signAgreement(deal.id, deal.version, typedName);
      setDeal(updated);
      setConsent(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Signature failed.");
    } finally {
      setBusy(false);
    }
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
              Download Draft
            </button>
            <button type="button" onClick={() => window.print()}>
              Print / Save PDF
            </button>
          </div>

          {deal.contractStatus === "draft" && (
            <section className="signature-card">
              <h3>Record Internal Electronic Signature</h3>
              <p>
                This records your authenticated internal approval. It does not
                replace a required client counter-signature.
              </p>
              <label className="form-field">
                <span>Type your full legal name</span>
                <input
                  value={typedName}
                  onChange={(event) => setTypedName(event.target.value)}
                />
              </label>
              <label className="acknowledge-option">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                />
                I consent to this electronic signature record.
              </label>
              <button
                className="primary-button"
                type="button"
                disabled={busy || typedName.trim().length < 2 || !consent}
                onClick={handleSign}
              >
                {busy ? "Recording..." : "Record Signature"}
              </button>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
