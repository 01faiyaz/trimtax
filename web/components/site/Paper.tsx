// Pieces every page of the site shares: the binder holes and the "Part I · Page 2 of 8" header.

export function Holes() {
  return (
    <div aria-hidden="true" className="holes">
      <span className="hole" />
      <span className="hole" />
      <span className="hole" />
    </div>
  );
}

export function PartHead({ part, name, page, nameId }: { part: string; name: string; page: number; nameId?: string }) {
  return (
    <div className="part-head">
      <span className="part">
        <span className="part-chip">{part}</span>
        <span id={nameId} className="part-name">{name}</span>
      </span>
      <span className="mono muted" style={{ whiteSpace: "nowrap" }}>Page {page} of 8</span>
    </div>
  );
}
