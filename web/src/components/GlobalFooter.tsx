import Link from "next/link";

export function GlobalFooter() {
  return (
    <>
      <section className="knob-cta-section reveal">
        <div className="knob-cta-card">
          <div className="knob-copyright">
            Copyright © 2026 /{" "}
            <Link href="/" target="_blank" rel="noopener noreferrer">
              tickr.id
            </Link>
          </div>
          <h2 className="knob-cta-headline">The market doesn’t wait.</h2>
        </div>
      </section>

      <div className="knob-press-bar">
        Support & press // hello@tickr.id
      </div>
    </>
  );
}
