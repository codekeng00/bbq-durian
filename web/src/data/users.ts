import type { DemoUser, Team } from "./types";

export const DEMO_USERS: Record<Team, DemoUser> = {
  sales: {
    id: "user-sales-alice",
    name: "Alice Chen",
    email: "alice@dealmaker.com",
    team: "sales",
  },
  business: {
    id: "user-business-bob",
    name: "Bob Wilson",
    email: "bob@dealmaker.com",
    team: "business",
  },
};
