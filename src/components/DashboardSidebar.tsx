import { Link } from "react-router-dom";

type DashboardSidebarProps = {
  brandTo: string;
};

export default function DashboardSidebar({ brandTo }: DashboardSidebarProps) {
  return (
    <aside className="sidebar" aria-label="Primary navigation">
      <Link className="product-brand" to={brandTo}>
        <span className="product-mark">
          <img src="/assets/dashboard-logo.svg" alt="" aria-hidden="true" />
        </span>
        <span className="product-name">
          <strong>DealMaker</strong>
          <small>AI Intelligence</small>
        </span>
      </Link>
      <nav className="sidebar-actions">
        <Link className="logout-link" to="/">
          <img src="/assets/dashboard-logout.svg" alt="" aria-hidden="true" />
          <span>Logout</span>
        </Link>
      </nav>
    </aside>
  );
}
