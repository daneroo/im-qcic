import { createFileRoute } from "@tanstack/react-router";
import { NATS_WS_URL } from "../config";
import { ScastPage } from "../scast/ScastPage";
import { useScastFeed } from "../scast/useScastFeed";

export const Route = createFileRoute("/scast")({
  component: ScastRoute,
});

function ScastRoute() {
  return <ScastPage feed={useScastFeed(NATS_WS_URL)} />;
}
