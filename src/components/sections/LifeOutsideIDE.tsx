"use client";

import PhotoJournal from "@/components/journal/PhotoJournal";
import { JOURNAL_ENTRIES } from "@/content/journal";

/**
 * Outside the IDE: the photo journal. The photos, categories and captions are
 * `content/journal.ts`; the strip and the viewer are `components/journal`.
 */
export default function LifeOutsideIDE() {
  return (
    <section id="life" className="section-frame px-5 py-16 lg:px-6">
      <div className="w-full max-w-4xl mx-auto">
        <div className="section-shell">
          <div className="section-shell-bar">
            <p className="section-eyebrow">05 &mdash; outside the IDE</p>
          </div>

          <div className="section-shell-body" data-reveal-group>
            <h2 className="section-title">Outside the IDE</h2>

            <p className="section-lede">
              When I step away from the tech world, I recharge through physical activity and creative hobbies, returning to my projects with fresh energy and perspective.
            </p>

            <PhotoJournal entries={JOURNAL_ENTRIES} />
          </div>
        </div>
      </div>
    </section>
  );
}
