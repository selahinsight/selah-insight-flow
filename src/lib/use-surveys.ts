import { useEffect, useState, useSyncExternalStore } from "react";
import {
  listSurveys,
  getSurvey,
  listCustomers,
  getCustomer,
  hydrateStore,
  type Survey,
  type Customer,
} from "./survey-store";

// Trigger Supabase hydration once, from any component that reads the store.
let hydrateStarted = false;
function ensureHydrated() {
  if (hydrateStarted) return;
  hydrateStarted = true;
  hydrateStore().catch((err) => console.error("[selah] hydrateStore failed", err));
}

function subscribeSurveys(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("selah:surveys-changed", cb);
  return () => window.removeEventListener("selah:surveys-changed", cb);
}

function subscribeCustomers(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("selah:customers-changed", cb);
  window.addEventListener("selah:surveys-changed", cb);
  return () => {
    window.removeEventListener("selah:customers-changed", cb);
    window.removeEventListener("selah:surveys-changed", cb);
  };
}

export function useSurveys(): Survey[] {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
    ensureHydrated();
  }, []);
  const snapshot = useSyncExternalStore(
    subscribeSurveys,
    () => JSON.stringify(listSurveys()),
    () => "[]",
  );
  if (!hydrated) return [];
  return JSON.parse(snapshot) as Survey[];
}

export function useSurvey(id: string | undefined): Survey | undefined {
  const all = useSurveys();
  if (!id) return undefined;
  return all.find((s) => s.id === id) ?? getSurvey(id);
}

export function useCustomers(): Customer[] {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
    ensureHydrated();
  }, []);
  const snapshot = useSyncExternalStore(
    subscribeCustomers,
    () => JSON.stringify(listCustomers()),
    () => "[]",
  );
  if (!hydrated) return [];
  return JSON.parse(snapshot) as Customer[];
}

export function useCustomer(id: string | undefined): Customer | undefined {
  const all = useCustomers();
  if (!id) return undefined;
  return all.find((c) => c.id === id) ?? getCustomer(id);
}
