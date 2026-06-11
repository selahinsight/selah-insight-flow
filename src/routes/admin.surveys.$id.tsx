import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/surveys/$id")({
  component: () => <Outlet />,
});

// (Sub-routes provide their own AdminShell + SurveyTabs.)
export { useNavigate };
