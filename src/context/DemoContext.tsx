import { createContext, useEffect, useState, type ReactNode } from "react";
import type { Deal, DemoState, ExtractedInfo, Email, ChatMessage, Team } from "../data/types";

const STORAGE_KEY = "dealmaker_demo_state";

const EMPTY_STATE: DemoState = { deals: [], currentTeam: undefined };

function loadState(): DemoState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    return JSON.parse(raw) as DemoState;
  } catch {
    return EMPTY_STATE;
  }
}

export type DemoContextValue = {
  deals: Deal[];
  currentTeam?: Team;
  login: (team: Team) => void;
  logout: () => void;
  createDeal: (input: {
    rawConversation: string;
    extracted: ExtractedInfo;
    chatHistory: ChatMessage[];
    email: Email;
  }) => Deal;
  getDeal: (id: string) => Deal | undefined;
  updateDealEmail: (id: string, email: Email) => void;
  submitToBusiness: (id: string) => void;
  approveDeal: (
    id: string,
    evaluation: { riskScore: Deal["riskScore"]; complianceNotes: string[]; contractContent: string },
  ) => void;
  rejectDeal: (
    id: string,
    evaluation: { riskScore: Deal["riskScore"]; complianceNotes: string[]; rejectReason: string },
  ) => void;
  resetDemo: () => void;
};

export const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(loadState);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  function patchDeal(id: string, patch: Partial<Deal>) {
    setState((prev) => ({
      ...prev,
      deals: prev.deals.map((d) =>
        d.id === id ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d,
      ),
    }));
  }

  const value: DemoContextValue = {
    deals: state.deals,
    currentTeam: state.currentTeam,

    login: (team) => setState((prev) => ({ ...prev, currentTeam: team })),
    logout: () => setState((prev) => ({ ...prev, currentTeam: undefined })),

    createDeal: ({ rawConversation, extracted, chatHistory, email }) => {
      const now = new Date().toISOString();
      const deal: Deal = {
        id: `deal-${Date.now()}`,
        status: "draft",
        rawConversation,
        extracted,
        chatHistory,
        email,
        createdAt: now,
        updatedAt: now,
      };
      setState((prev) => ({ ...prev, deals: [...prev.deals, deal] }));
      return deal;
    },

    getDeal: (id) => state.deals.find((d) => d.id === id),

    updateDealEmail: (id, email) => patchDeal(id, { email }),

    submitToBusiness: (id) => patchDeal(id, { status: "pending_business_review", rejectReason: undefined }),

    approveDeal: (id, { riskScore, complianceNotes, contractContent }) =>
      patchDeal(id, { status: "approved", riskScore, complianceNotes, contractContent }),

    rejectDeal: (id, { riskScore, complianceNotes, rejectReason }) =>
      patchDeal(id, { status: "rejected", riskScore, complianceNotes, rejectReason }),

    resetDemo: () => {
      sessionStorage.removeItem(STORAGE_KEY);
      setState(EMPTY_STATE);
    },
  };

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}
