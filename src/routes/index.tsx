import { createFileRoute } from "@tanstack/react-router";
import { SearchTabs } from "@/components/Tabs";

type SearchParams = {
  explanations: string;
};

export const Route = createFileRoute("/")({
  validateSearch: (search: SearchParams) => search,
  component: App,
});

function App() {
  return (
    <>
      <section className="hero">
        <div className="hero-container">
          <h2 className="hero-title">Vind een zorgverlener</h2>

          <SearchTabs />
        </div>
      </section>
    </>
  );
}
