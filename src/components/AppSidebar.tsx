import { Link, useNavigate } from "react-router-dom";
import { useDemoData } from "../hooks/useDemoData";

type AppSidebarProps = {
  brandTo: string;
  className?: string;
};

export default function AppSidebar({
  brandTo,
  className = "app-sidebar",
}: AppSidebarProps) {
  const navigate = useNavigate();
  const { logout, currentUser } = useDemoData();

  async function handleLogout() {
    await logout();
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
        <div className="sidebar-user">
          <strong>{currentUser?.name}</strong>
          <small>{currentUser?.organizationName}</small>
        </div>
        <button className="app-logout" type="button" onClick={handleLogout}>
          <img src="/assets/dashboard-logout.svg" alt="" /> Logout
        </button>
      </div>
    </aside>
  );
}
