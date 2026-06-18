import type { Team } from "./types";

type DemoUserDisplay = {
  name: string;
  email: string;
  team: Team;
};

export const DEMO_USERS: Record<Team, DemoUserDisplay> = {
  sales: {
    name: "alicheng",
    email: "@dealnaker.com",
    team: "sales",
  },
  business: {
    name: "bobwilson",
    email: "@dealnaker.com",
    team: "business",
  },
};
