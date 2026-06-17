import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDemoData } from "../hooks/useDemoData";

type AppSidebarProps = {
  brandTo: string;
  className?: string;
};

const COMING_SOON = "This feature is coming soon in a future release.";

function IconGrid() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
    </svg>
  );
}
function IconChart() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  );
}
function IconBook() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  );
}
function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}
function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}

export default function AppSidebar({
  brandTo,
  className = "app-sidebar",
}: AppSidebarProps) {
  const navigate = useNavigate();
  const { logout, currentUser } = useDemoData();
  const [toast, setToast] = useState(false);

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  function showToast() {
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  }

  return (
    <aside className={className}>
      <Link className="app-brand" to={brandTo}>
        <img src="/assets/logo.svg" alt="" />
        <span>
          <strong>DealMaker</strong>
          <small>AI Intelligence</small>
        </span>
      </Link>
      <nav className="sidebar-nav">
        <Link className="sidebar-nav-item" to={brandTo}>
          <IconGrid />
          Dashboard
        </Link>
        <button className="sidebar-nav-item" type="button" onClick={showToast}>
          <IconChart />
          Analytics
        </button>
        <button className="sidebar-nav-item" type="button" onClick={showToast}>
          <IconBook />
          Knowledge Base
        </button>
        <button className="sidebar-nav-item" type="button" onClick={showToast}>
          <IconUsers />
          Team
        </button>
      </nav>
      <div className="sidebar-buttons">
        <button className="sidebar-nav-item sidebar-settings" type="button" onClick={showToast}>
          <IconSettings />
          Settings
        </button>
        <div className="sidebar-user">
          <strong>{currentUser?.name}</strong>
          <small>{currentUser?.organizationName}</small>
        </div>
        <button className="app-logout" type="button" onClick={handleLogout}>
          <img src="/assets/dashboard-logout.svg" alt="" /> Logout
        </button>
      </div>
      {toast && (
        <div className="sidebar-toast" role="status">{COMING_SOON}</div>
      )}
    </aside>
  );
}
