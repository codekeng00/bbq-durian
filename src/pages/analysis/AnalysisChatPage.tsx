import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useDemoData } from "../../hooks/useDemoData";

export default function AnalysisChatPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { getDeal, updateDealEmail, submitToBusiness } = useDemoData();

  const dealId = params.get("dealId") ?? "";
  const deal = getDeal(dealId);

  const [subject, setSubject] = useState(deal?.email?.subject ?? "");
  const [body, setBody] = useState(deal?.email?.body ?? "");

  if (!deal || !deal.email) {
    return (
      <main className="email-chat-layout">
        <section className="email-editor">
          <header className="mini-brand">DealMaker</header>
          <p style={{ padding: "2rem" }}>
            Deal not found. <Link to="/active-pipelines-sales">Back to pipelines</Link>
          </p>
        </section>
      </main>
    );
  }

  function handleSubmit() {
    updateDealEmail(deal!.id, { to: deal!.email!.to, subject, body });
    submitToBusiness(deal!.id);
    navigate("/active-pipelines-sales");
  }

  return (
    <main className="email-chat-layout">
      <section className="email-editor">
        <header className="mini-brand">DealMaker</header>

        {deal.status === "rejected" && deal.rejectReason && (
          <div
            style={{
              margin: "16px 24px 0",
              padding: "12px 16px",
              background: "#fff0ef",
              border: "1px solid #ffd5d2",
              borderRadius: "8px",
              color: "#ba1a1a",
            }}
          >
            <strong>Returned by Business:</strong> {deal.rejectReason}. Please revise and resubmit.
          </div>
        )}

        <article className="email-paper">
          <header className="email-head">
            <div className="email-head-row">
              <div>
                <h1>
                  {deal.extracted.clientName ?? "Client"}{" "}
                  <span className="pill" style={{ color: "#712ae2" }}>
                    CLIENT
                  </span>
                </h1>
                <p>{deal.extracted.description ?? ""}</p>
              </div>
              <span className="pill" style={{ color: "#ba1a1a", background: "#fff0ef" }}>
                {deal.status === "rejected" ? "Rejected" : "Draft"}
              </span>
            </div>
          </header>
          <div className="email-body">
            <p>
              <strong>To:</strong> {deal.email.to}
            </p>
            <p>
              <strong>Subject:</strong>
            </p>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={{ width: "100%", padding: "8px", marginBottom: "12px", border: "1px solid #d6dee8", borderRadius: "6px" }}
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              style={{ width: "100%", padding: "12px", border: "1px solid #d6dee8", borderRadius: "6px", fontFamily: "inherit" }}
            />
          </div>
          <div className="send-row">
            <button className="primary-button" type="button" onClick={handleSubmit}>
              {deal.status === "rejected" ? "Resubmit to Business ↗" : "Submit to Business ↗"}
            </button>
          </div>
        </article>
      </section>
    </main>
  );
}
