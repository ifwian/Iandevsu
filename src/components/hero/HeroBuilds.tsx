import { HERO } from "@/content/hero";

/**
 * The information block: two named "files", each a small tree.
 *
 * This replaces a standalone italic quote paragraph and a row of loose numbered
 * pills. The old arrangement asked the eye to read four things that all said the
 * same kind of thing -- who she is, what she is building, how she works, where
 * to find her -- as four unrelated shapes. A tree states that they are the same
 * kind of thing, and states it without adding a box: it is the page's own
 * language, spelled out.
 *
 * Two files rather than one, because the two groups answer different questions
 * and merging them flattened that. STACK.TXT is the inventory and it changes;
 * NOW.TXT is the moment and it changes constantly.
 *
 * `<dl>` rather than a `<ul>` of styled divs: every row really is a term and its
 * description, so a screen reader gets that pairing for free instead of hearing
 * four adjacent strings. The branch glyphs are `aria-hidden` -- the structure is
 * in the markup, the glyphs are the decoration on top of it.
 *
 * Keys are mono and values are the body's sans, which is the same register the
 * rest of the sidebar and hero use: mono for chrome, sans for anything a person
 * wrote.
 */
export default function HeroBuilds() {
  return (
    <div className="hero-tree mt-9">
      {HERO.blocks.map((block) => (
        <div key={block.file} className="hero-tree-block">
          <p className="hero-tree-file">{block.file}</p>
          <dl className="hero-tree-list">
            {/* A `quote` block is one line with no key, so it is rendered as its
                own branch rather than mapped: the connector still comes from the
                same place, and it is `└──` because it is the only -- and
                therefore the last -- line under this header. */}
            {"quote" in block ? (
              <div className="hero-tree-row hero-tree-row--last">
                <span className="hero-tree-branch" aria-hidden="true">
                  └──
                </span>
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
                    <span className="hero-tree-branch" aria-hidden="true">
                      {last ? "└──" : "├──"}
                    </span>
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
