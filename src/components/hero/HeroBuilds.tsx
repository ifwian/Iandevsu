import { HERO } from "@/content/hero";

/**
 * The information block: two headed little trees.
 *
 * This replaces a standalone italic quote paragraph and a row of loose numbered
 * pills. The old arrangement asked the eye to read four things that all said
 * the same kind of thing -- who she is, what she is building, how she works,
 * where to find her -- as four unrelated shapes. A tree states that they are
 * the same kind of thing, and states it without adding a box: it is the page's
 * own language, spelled out.
 *
 * Each block opens with a human heading ("What I make", "In my words") rather
 * than a fake file name: the headings say in words what the old `builds.sys` /
 * `quote.txt` labels only gestured at. The rows under them stay in the listing
 * register -- mono keys, prose values -- so a block still reads as a listing
 * under a sentence.
 *
 * `<dl>` rather than a `<ul>` of styled divs: every row really is a term and
 * its description, so a screen reader gets that pairing for free instead of
 * hearing adjacent strings. The branch column is an empty `aria-hidden` span
 * and the connector is drawn on it in hero.css -- the glyphs used to be text,
 * and as drawn borders there is nothing in the tree that can be read mid-row,
 * selected, or copied into a message by accident.
 *
 * Keys are mono and values are the body's sans, which is the same register the
 * rest of the sidebar and hero use: mono for chrome, sans for anything a
 * person wrote.
 */
export default function HeroBuilds() {
  return (
    <div className="hero-tree mt-9">
      {HERO.blocks.map((block) => (
        <div key={block.heading} className="hero-tree-block">
          <p className="hero-tree-heading">{block.heading}</p>
          <dl className="hero-tree-list">
            {/* A `quote` block is one line with no key, so it is rendered as
                its own branch rather than mapped: the connector still comes
                from the same place, and the row closes the tree because it is
                the only -- and therefore the last -- line under this header. */}
            {"quote" in block ? (
              <div className="hero-tree-row hero-tree-row--last">
                <span className="hero-tree-branch" aria-hidden="true" />
                <dd className="hero-tree-quote">{block.quote}</dd>
              </div>
            ) : (
              block.rows.map((row, index) => {
                const last = index === block.rows.length - 1;
                return (
                  <div
                    key={row.key}
                    className={last ? "hero-tree-row hero-tree-row--last" : "hero-tree-row"}
                  >
                    <span className="hero-tree-branch" aria-hidden="true" />
                    <dt className="hero-tree-key">{row.key}</dt>
                    <dd className="hero-tree-value">{row.value}</dd>
                  </div>
                );
              })
            )}
          </dl>
        </div>
      ))}
    </div>
  );
}
