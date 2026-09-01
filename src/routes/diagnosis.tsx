import { createFileRoute } from "@tanstack/react-router";
import { RespondentSurvey } from "./s.$slug";

export const Route = createFileRoute("/diagnosis")({
  component: DiagnosisRoute,
});

function DiagnosisRoute() {
  return <RespondentSurvey slug="selah-money-diagnosis" />;
}
