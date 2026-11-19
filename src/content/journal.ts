/**
 * The "Outside the IDE" photo journal: one entry per photo.
 *
 * Every `src` is a photo that already lives in `public/images/` -- nothing here
 * is a stand-in. To add a photo (family and friends, badminton, anything else),
 * drop the file in `public/images/` and add one object to the list; the
 * gallery, the pills and the viewer all follow the list.
 *
 * `caption` describes what is in the frame (it doubles as the image's alt
 * text), so write it as a description, not a slogan.
 */
export interface JournalEntry {
  /** Short category label, shown as a pill and above the caption. */
  category: string;
  src: string;
  caption: string;
}

export const JOURNAL_ENTRIES: JournalEntry[] = [
  {
    category: "Photography",
    src: "/images/photography-600w.webp",
    caption: "Film and instant cameras laid out on a table, lit warm.",
  },
  {
    category: "Hiking",
    src: "/images/hiking-600w.webp",
    caption: "A pause on a forest trail, trekking pole in hand.",
  },
  {
    category: "Gaming",
    src: "/images/gaming-600w.webp",
    caption: "“Welcome to Deponia” on screen: a point-and-click adventure.",
  },
  {
    category: "Music",
    src: "/images/music-600w.webp",
    caption: "A lounge corner with guitars on the wall and warm shelf lighting.",
  },
  {
    category: "Reading",
    src: "/images/reading-600w.webp",
    caption: "Shelves of manga and graphic novels.",
  },
  {
    category: "Nature",
    src: "/images/nature1-600w.webp",
    caption: "A forest road at dusk.",
  },
];
