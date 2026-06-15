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
      <div className="sidebar-buttons">
        <button className="app-logout" type="button" onClick={handleLogout}>
          <img src="/assets/dashboard-logout.svg" alt="" /> Logout
        </button>
        <button type="button" onClick={handleReset} className="reset-button">
          ↺ Reset Demo Data
        </button>
      </div>
    </aside>
  );
}
