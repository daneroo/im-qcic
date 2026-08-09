import { createFileRoute } from "@tanstack/react-router";
// PROTOTYPE — this route dispatches to a design variant.
// See ../prototype/README.md.
import { VariantSwitcher } from "../prototype/VariantSwitcher";
import { validatePrototypeSearch } from "../prototype/variants";
import { TedcheckCircuit } from "../prototype/views/tedcheck/Circuit";
import { useTedcheckFeed } from "../prototype/views/tedcheck/data";
import { TedcheckSheet } from "../prototype/views/tedcheck/Sheet";
import { TedcheckStrata } from "../prototype/views/tedcheck/Strata";

export const Route = createFileRoute("/tedcheck")({
  validateSearch: validatePrototypeSearch,
  component: TedcheckPage,
});

function TedcheckPage() {
  const search = Route.useSearch();
  const feed = useTedcheckFeed();

  return (
    <>
      {search.variant === "circuit" ? (
        <TedcheckCircuit feed={feed} />
      ) : search.variant === "sheet" ? (
        <TedcheckSheet feed={feed} />
      ) : (
        <TedcheckStrata feed={feed} />
      )}
      <VariantSwitcher search={search} />
    </>
  );
}
