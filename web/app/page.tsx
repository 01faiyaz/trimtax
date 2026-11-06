import { CoverPage, ProductShot, SiteHeader } from "@/components/site/Cover";
import PartAI from "@/components/site/PartAI";
import PartFlow from "@/components/site/PartFlow";
import PartNumbers from "@/components/site/PartNumbers";
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
        <PartAI />
        <PartNumbers />
      </main>
    </div>
  );
}
