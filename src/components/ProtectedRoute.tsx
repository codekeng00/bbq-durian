import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import type { Team } from "../data/types";
import { useDemoData } from "../hooks/useDemoData";

export default function ProtectedRoute({
  team,
  children,
}: {
  team: Team;
  children: ReactNode;
}) {
  const { currentUser, sessionLoading } = useDemoData();

  if (sessionLoading) {
    return <main className="page-message">Loading secure session...</main>;
  }
  if (!currentUser) return <Navigate to="/" replace />;
  if (currentUser.team !== team) {
    return (
      <Navigate
        to={
          currentUser.team === "sales"
            ? "/active-pipelines-sales"
            : "/active-pipelines-business"
        }
        replace
      />
    );
  }
  return children;
}
