import { useEffect, useState, useSyncExternalStore } from "react";
import { listSurveys, getSurvey, type Survey } from "./survey-store";

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("selah:surveys-changed", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("selah:surveys-changed", cb);
    window.removeEventListener("storage", cb);
  };
}

export function useSurveys(): Survey[] {
  // Avoid SSR mismatch by returning [] on server, then hydrate.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const list = useSyncExternalStore(
    subscribe,
    () => JSON.stringify(listSurveys()),
    () => "[]",
  );
  if (!hydrated) return [];
  return JSON.parse(list) as Survey[];
}

export function useSurvey(id: string | undefined): Survey | undefined {
  const all = useSurveys();
  if (!id) return undefined;
  return all.find((s) => s.id === id) ?? getSurvey(id);
}

import { listCustomers, getCustomer, type Customer } from "./survey-store";

function subscribeCustomers(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("selah:customers-changed", cb);
  window.addEventListener("selah:surveys-changed", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("selah:customers-changed", cb);
    window.removeEventListener("selah:surveys-changed", cb);
    window.removeEventListener("storage", cb);
  };
}

export function useCustomers(): Customer[] {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const list = useSyncExternalStore(
    subscribeCustomers,
    () => JSON.stringify(listCustomers()),
    () => "[]",
  );
  if (!hydrated) return [];
  return JSON.parse(list) as Customer[];
}

export function useCustomer(id: string | undefined): Customer | undefined {
  const all = useCustomers();
  if (!id) return undefined;
  return all.find((c) => c.id === id) ?? getCustomer(id);
}
