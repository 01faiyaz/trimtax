import { CoverPage, ProductShot, SiteHeader } from "@/components/site/Cover";
import "./site.css";

// The story site. Each part of it is its own component in components/site.
export default function Home() {
  return (
    <div className="site">
      <SiteHeader />
      <main className="column">
        <CoverPage />
        <ProductShot />
      </main>
    </div>
  );
}
