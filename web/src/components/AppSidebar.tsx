import { Link, useNavigate } from "react-router-dom";
import { useDemoData } from "../hooks/useDemoData";

type AppSidebarProps = {
  brandTo: string;
  className?: string;
};

export default function AppSidebar({ brandTo, className = "app-sidebar" }: AppSidebarProps) {
  const navigate = useNavigate();
  const { logout, resetDemo } = useDemoData();

  function handleLogout() {
    logout();
    navigate("/");
  }

  function handleReset() {
    resetDemo();
    navigate("/");
  }

  return (
    <aside className={className}>
      <Link className="app-brand" to={brandTo}>
        <img src="/assets/dashboard-logo.svg" alt="" />
        <span>
          <strong>DealMaker</strong>
          <small>AI Intelligence</small>
        </span>
      </Link>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <button className="app-logout" type="button" onClick={handleLogout} style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
          <img src="/assets/dashboard-logout.svg" alt="" /> Logout
        </button>
        <button
          type="button"
          onClick={handleReset}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#ba1a1a", fontSize: "0.85rem", textAlign: "left" }}
        >
          ↺ Reset Demo Data
        </button>
      </div>
    </aside>
  );
}
