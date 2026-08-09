import { createFileRoute } from "@tanstack/react-router";
// PROTOTYPE — the aggregate home. See ../prototype/README.md.
import { VariantSwitcher } from "../prototype/VariantSwitcher";
import { validatePrototypeSearch } from "../prototype/variants";
import {
  HomeCircuit,
  HomeSheet,
  HomeStrata,
} from "../prototype/views/home/variants";
import { useRichScastFeed } from "../prototype/views/scast/data";
import { useTedcheckFeed } from "../prototype/views/tedcheck/data";

export const Route = createFileRoute("/")({
  validateSearch: validatePrototypeSearch,
  component: Home,
});

function Home() {
  const search = Route.useSearch();
  const ted = useTedcheckFeed();
  const scast = useRichScastFeed();

  const props = { ted, scast, search };

  return (
    <>
      {search.variant === "circuit" ? (
        <HomeCircuit {...props} />
      ) : search.variant === "sheet" ? (
        <HomeSheet {...props} />
      ) : (
        <HomeStrata {...props} />
      )}
      <VariantSwitcher search={search} />
    </>
  );
}
