import { createFileRoute } from "@tanstack/react-router";
// PROTOTYPE — hosts and network: identity, tailnet, bus, endpoints.
// Fixture-backed, clearly marked as such on the page itself.
// Renamed from /prototype/qcic: QCIC is the whole project's name, and this is
// one slice of it. See ../prototype/README.md.
//
// A leading `__` (as in the brief's /__prototype/...) collides with TanStack's
// pathless-layout convention for file routes, so it is one underscore fewer.
import { VariantSwitcher } from "../prototype/VariantSwitcher";
import { validatePrototypeSearch } from "../prototype/variants";
import {
  NetworkCircuit,
  NetworkSheet,
  NetworkStrata,
  useSimulated,
} from "../prototype/views/network/variants";

export const Route = createFileRoute("/prototype/network")({
  validateSearch: validatePrototypeSearch,
  component: QcicPage,
});

function QcicPage() {
  const search = Route.useSearch();
  const [sim, setSim] = useSimulated();

  return (
    <>
      {search.variant === "circuit" ? (
        <NetworkCircuit sim={sim} setSim={setSim} />
      ) : search.variant === "sheet" ? (
        <NetworkSheet sim={sim} setSim={setSim} />
      ) : (
        <NetworkStrata sim={sim} setSim={setSim} />
      )}
      <VariantSwitcher search={search} />
    </>
  );
}
