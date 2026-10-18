import { ArrowUpRight } from "lucide-react";
import { SOCIAL_ITEMS } from "@/lib/socials";

/**
 * The social links row.
 *
 * The email now lives in the sidebar footer, so it is not repeated here. The
 * social links stay, since the sidebar no longer has them.
 *
 * `justify-center` below md so a wrapped row of links centres too; `w-fit`
 * means the block itself is only as wide as its content, which is what lets the
 * `items-center` on the parent column centre the whole group as one unit.
 * `mt-8` rather than the `mt-6` it carried beside the old pill row: the tree
 * above is taller, and 24px of air under it read as crowding rather than as a
 * seam.
 */
export default function HeroSocials() {
  return (
    <div className="mt-8 flex w-fit max-w-full flex-wrap items-start justify-center gap-2 text-left md:justify-start">
      {SOCIAL_ITEMS.map(({ label, href, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          /* `group` stays for the arrow's `group-hover:`; the chip's own box is
             `.terminal-pill`, shared with the build items above so the two
             cannot drift apart. The inline `fontFamily` these buttons used to
             carry is now part of that rule. */
          className="group terminal-pill"
        >
          <Icon size={13} />
          <span>{label}</span>
          <ArrowUpRight
            size={11}
            strokeWidth={1.7}
            className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </a>
      ))}
    </div>
  );
}
