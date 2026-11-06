import { CoverPage, ProductShot, SiteHeader } from "@/components/site/Cover";
import PartFlow from "@/components/site/PartFlow";
import "./site.css";

// The story site. Each part of it is its own component in components/site.
export default function Home() {
  return (
    <div className="site">
      <SiteHeader />
      <main className="column">
        <CoverPage />
        <ProductShot />
        <PartFlow />
      </main>
    </div>
  );
}
