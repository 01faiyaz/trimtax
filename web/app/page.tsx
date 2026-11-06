import { CoverPage, ProductShot, SiteHeader } from "@/components/site/Cover";
import PartAI from "@/components/site/PartAI";
import PartFile from "@/components/site/PartFile";
import PartFlow from "@/components/site/PartFlow";
import PartNumbers from "@/components/site/PartNumbers";
import PartOnTime from "@/components/site/PartOnTime";
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
        <PartFile />
        <PartOnTime />
      </main>
    </div>
  );
}
