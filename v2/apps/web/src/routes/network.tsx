import { createFileRoute } from "@tanstack/react-router";
import { NetworkPage } from "../network/NetworkPage";

export const Route = createFileRoute("/network")({
  component: NetworkPage,
});
