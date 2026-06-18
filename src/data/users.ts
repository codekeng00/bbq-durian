import type { Team } from "./types";

type DemoUserDisplay = {
  name: string;
  email: string;
  team: Team;
};

export const DEMO_USERS: Record<Team, DemoUserDisplay> = {
  sales: {
    name: "alice",
    email: "@dealnaker.com",
    team: "sales",
  },
  business: {
    name: "bob",
    email: "@dealnaker.com",
    team: "business",
  },
};
