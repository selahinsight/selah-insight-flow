import { createFileRoute, Navigate } from "@tanstack/react-router";

// Legacy "result editor" route is no longer part of Studio.
// Redirect to the edit screen so existing links keep working.
export const Route = createFileRoute("/admin/surveys/$id/result")({
  component: Redirect,
});

function Redirect() {
  const { id } = Route.useParams();
  return <Navigate to="/admin/surveys/$id/edit" params={{ id }} replace />;
}
