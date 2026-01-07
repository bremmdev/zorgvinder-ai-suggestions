import { createFileRoute } from "@tanstack/react-router";

import { SearchTabs } from "@/components/Tabs";
export const Route = createFileRoute("/")({ component: App });

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
