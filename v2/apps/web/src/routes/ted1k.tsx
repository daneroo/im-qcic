import { createFileRoute } from "@tanstack/react-router";
import { Ted1kPage } from "../ted1k/Ted1kPage";

export const Route = createFileRoute("/ted1k")({
  component: Ted1kPage,
});
