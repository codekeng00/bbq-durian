import { Link } from "react-router-dom";

type AppSidebarProps = {
  brandTo: string;
  className?: string;
};

export default function AppSidebar({ brandTo, className = "app-sidebar" }: AppSidebarProps) {
  return (
    <aside className={className}>
      <Link className="app-brand" to={brandTo}>
        <img src="/assets/dashboard-logo.svg" alt="" />
        <span>
          <strong>DealMaker</strong>
          <small>AI Intelligence</small>
        </span>
      </Link>
      <Link className="app-logout" to="/">
        <img src="/assets/dashboard-logout.svg" alt="" /> Logout
      </Link>
    </aside>
  );
}
