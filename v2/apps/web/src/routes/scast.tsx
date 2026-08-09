import { createFileRoute } from "@tanstack/react-router";
// PROTOTYPE — this route dispatches to a design variant.
// See ../prototype/README.md.
import { VariantSwitcher } from "../prototype/VariantSwitcher";
import { validatePrototypeSearch } from "../prototype/variants";
import { useRichScastFeed } from "../prototype/views/scast/data";
import {
  ScastCircuit,
  ScastSheet,
  ScastStrata,
} from "../prototype/views/scast/variants";

export const Route = createFileRoute("/scast")({
  validateSearch: validatePrototypeSearch,
  component: ScastPage,
});

function ScastPage() {
  const search = Route.useSearch();
  const feed = useRichScastFeed();

  return (
    <>
      {search.variant === "circuit" ? (
        <ScastCircuit feed={feed} />
      ) : search.variant === "sheet" ? (
        <ScastSheet feed={feed} />
      ) : (
        <ScastStrata feed={feed} />
      )}
      <VariantSwitcher search={search} />
    </>
  );
}
