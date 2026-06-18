import { useNavigate } from "react-router-dom";
import { useDemoData } from "../hooks/useDemoData";

type DashboardSidebarProps = {
  brandTo: string;
};

export default function DashboardSidebar({ brandTo }: DashboardSidebarProps) {
  const navigate = useNavigate();
  const { logout } = useDemoData();

  async function handleLogout() {
    try { await logout(); } catch {}
    navigate("/");
  }

  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <a className="product-brand" href={brandTo} onClick={(e) => { e.preventDefault(); navigate(brandTo); }}>
        <span className="product-mark">
          <img src="/assets/dashboard-logo.svg" alt="" aria-hidden="true" />
        </span>
        <span className="product-name">
          <strong>DealMaker</strong>
          <small>AI Intelligence</small>
        </span>
      </a>
      <nav className="sidebar-actions">
        <button className="logout-link" type="button" onClick={handleLogout}>
          <img src="/assets/dashboard-logout.svg" alt="" aria-hidden="true" />
          <span>Logout</span>
        </button>
      </nav>
    </aside>
  );
}
