import type { Team } from "./types";

// Display-only demo accounts used to prefill the login form's email field.
// Real identity/roles are established by the backend dev-login (see DemoContext.login).
type DemoUserDisplay = {
  name: string;
  email: string;
  team: Team;
};

export const DEMO_USERS: Record<Team, DemoUserDisplay> = {
  sales: {
    name: "Alice Chen",
    email: "@dealnaker.com",
    team: "sales",
  },
  business: {
    name: "Bob Wilson",
    email: "@dealnaker.com",
    team: "business",
  },
};
