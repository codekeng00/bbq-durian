import { useContext } from "react";
import { DemoContext, type DemoContextValue } from "../context/DemoContext";

export function useDemoData(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) {
    throw new Error("useDemoData must be used within a DemoProvider");
  }
  return ctx;
}
