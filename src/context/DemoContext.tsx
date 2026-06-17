import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  ChatMessage,
  Deal,
  Email,
  Evaluation,
  ExtractedInfo,
  SessionResponse,
  Team,
  User,
} from "../data/types";
import { apiFetch } from "../services/api";

export type DemoContextValue = {
  deals: Deal[];
  currentUser?: User;
  devMode: boolean;
  sessionLoading: boolean;
  loading: boolean;
  login: (team: Team) => Promise<User>;
  logout: () => Promise<void>;
  refreshDeals: () => Promise<void>;
  loadDeal: (id: string) => Promise<Deal>;
  createDeal: (input: {
    rawConversation: string;
    extracted: ExtractedInfo;
    chatHistory: ChatMessage[];
    email: Email;
    validationIssues: string[];
    validationMode: "live_ai" | "rules_only";
    validationFailure?: string;
    bandRoomId?: string;
  }) => Promise<Deal>;
  getDeal: (id: string) => Deal | undefined;
  updateDealEmail: (id: string, email: Email, expectedVersion: number) => Promise<Deal>;
  submitToBusiness: (
    id: string,
    expectedVersion: number,
    acknowledgeWarnings: boolean,
  ) => Promise<Deal>;
  withdrawForRevision: (id: string, expectedVersion: number) => Promise<Deal>;
  evaluateDeal: (id: string) => Promise<Evaluation>;
  approveDeal: (
    id: string,
    expectedVersion: number,
    evaluationId: string,
    overrideReason?: string,
  ) => Promise<Deal>;
  rejectDeal: (
    id: string,
    expectedVersion: number,
    evaluationId: string,
    category: string,
    details: string,
  ) => Promise<Deal>;
  archiveDeal: (id: string, expectedVersion: number) => Promise<void>;
  clearAllDeals: () => Promise<void>;
  signAgreement: (
    id: string,
    expectedVersion: number,
    typedName: string,
  ) => Promise<Deal>;
};

// Context and provider stay together to preserve the existing import boundary.
// eslint-disable-next-line react-refresh/only-export-components
export const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [currentUser, setCurrentUser] = useState<User>();
  const [devMode, setDevMode] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [loading, setLoading] = useState(false);

  const replaceDeal = useCallback((deal: Deal) => {
    setDeals((current) => {
      const exists = current.some((item) => item.id === deal.id);
      return exists
        ? current.map((item) => (item.id === deal.id ? deal : item))
        : [deal, ...current];
    });
  }, []);

  const refreshDeals = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiFetch<{ deals: Deal[] }>("/api/deals");
      setDeals(result.deals);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDeal = useCallback(async (id: string) => {
    const result = await apiFetch<{ deal: Deal }>(`/api/deals/${id}`);
    replaceDeal(result.deal);
    return result.deal;
  }, [replaceDeal]);

  const evaluateDealAction = useCallback(async (id: string) => {
    const result = await apiFetch<{ evaluation: Evaluation }>(
      `/api/deals/${id}/evaluate`,
      { method: "POST" },
    );
    await loadDeal(id);
    return result.evaluation;
  }, [loadDeal]);

  useEffect(() => {
    let active = true;
    apiFetch<SessionResponse>("/api/auth/session")
      .then(async (session) => {
        if (!active) return;
        setDevMode(session.devMode);
        setCurrentUser(session.user);
        if (session.user) await refreshDeals();
      })
      .finally(() => {
        if (active) setSessionLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshDeals]);

  const value = useMemo<DemoContextValue>(
    () => ({
      deals,
      currentUser,
      devMode,
      sessionLoading,
      loading,

      login: async (team) => {
        const session = await apiFetch<SessionResponse>("/api/auth/session", {
          method: "POST",
          body: JSON.stringify({ team }),
        });
        if (!session.user) throw new Error("Login did not return a user.");
        setCurrentUser(session.user);
        setDevMode(session.devMode);
        await refreshDeals();
        return session.user;
      },

      logout: async () => {
        await apiFetch("/api/auth/session", { method: "DELETE" });
        setCurrentUser(undefined);
        setDeals([]);
      },

      refreshDeals,

      loadDeal,

      createDeal: async (input) => {
        const result = await apiFetch<{ deal: Deal }>("/api/deals", {
          method: "POST",
          body: JSON.stringify(input),
        });
        replaceDeal(result.deal);
        return result.deal;
      },

      getDeal: (id) => deals.find((deal) => deal.id === id),

      updateDealEmail: async (id, email, expectedVersion) => {
        const result = await apiFetch<{ deal: Deal }>(`/api/deals/${id}/email`, {
          method: "PATCH",
          body: JSON.stringify({ email, expectedVersion }),
        });
        replaceDeal(result.deal);
        return result.deal;
      },

      submitToBusiness: async (id, expectedVersion, acknowledgeWarnings) => {
        const result = await apiFetch<{ deal: Deal }>(`/api/deals/${id}/submit`, {
          method: "POST",
          body: JSON.stringify({ expectedVersion, acknowledgeWarnings }),
        });
        replaceDeal(result.deal);
        return result.deal;
      },

      withdrawForRevision: async (id, expectedVersion) => {
        const result = await apiFetch<{ deal: Deal }>(`/api/deals/${id}/withdraw`, {
          method: "POST",
          body: JSON.stringify({ expectedVersion }),
        });
        replaceDeal(result.deal);
        return result.deal;
      },

      evaluateDeal: evaluateDealAction,

      approveDeal: async (
        id,
        expectedVersion,
        evaluationId,
        overrideReason,
      ) => {
        const result = await apiFetch<{ deal: Deal }>(`/api/deals/${id}/approve`, {
          method: "POST",
          body: JSON.stringify({
            expectedVersion,
            evaluationId,
            overrideReason: overrideReason || undefined,
          }),
        });
        replaceDeal(result.deal);
        return result.deal;
      },

      rejectDeal: async (
        id,
        expectedVersion,
        evaluationId,
        category,
        details,
      ) => {
        const result = await apiFetch<{ deal: Deal }>(`/api/deals/${id}/reject`, {
          method: "POST",
          body: JSON.stringify({
            expectedVersion,
            evaluationId,
            category,
            details,
          }),
        });
        replaceDeal(result.deal);
        return result.deal;
      },

      archiveDeal: async (id, expectedVersion) => {
        await apiFetch(`/api/deals/${id}/archive`, {
          method: "POST",
          body: JSON.stringify({ expectedVersion }),
        });
        setDeals((current) => current.filter((deal) => deal.id !== id));
      },

      clearAllDeals: async () => {
        await apiFetch("/api/deals", { method: "DELETE" });
        setDeals([]);
      },

      signAgreement: async (id, expectedVersion, typedName) => {
        const result = await apiFetch<{ deal: Deal }>(`/api/deals/${id}/sign`, {
          method: "POST",
          body: JSON.stringify({ expectedVersion, typedName, consent: true }),
        });
        replaceDeal(result.deal);
        return result.deal;
      },
    }),
    [
      currentUser,
      deals,
      devMode,
      evaluateDealAction,
      loading,
      loadDeal,
      refreshDeals,
      replaceDeal,
      sessionLoading,
    ],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}
