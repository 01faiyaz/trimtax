import Link from "next/link";

// Placeholder home page. The full story site from the design canvas replaces this.
export default function Home() {
  return (
    <main className="desk">
      <div className="sheet">
        <h1 className="page-title">
          See your taxes while you can still change them.
        </h1>
        <p className="lead">
          TrimTax files every purchase into your tax file as it happens. The AI reads receipts and asks when it isn&apos;t
          sure. Plain code does the math. You decide.
        </p>
        <p style={{ marginTop: 24 }}>
          <Link className="button" href="/app" style={{ textDecoration: "none" }}>Open the demo</Link>
        </p>
        <p className="footer-note">Synthetic demo data. Federal and California only. TrimTax never files anything.</p>
      </div>
    </main>
  );
}
