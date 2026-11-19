/**
 * Education entries for the Education section.
 *
 * Only what the site already states about her is here: she studies Computer
 * Science. `school` and `period` are optional and the section simply omits what
 * is not set -- add them here and they appear, no markup change. Nothing is
 * invented to fill the card.
 *
 * Set `EDUCATION` to `[]` to hide the section and its nav link's target.
 */
export interface EducationEntry {
  program: string;
  /** Short status tag, e.g. "currently studying". */
  status?: string;
  school?: string;
  period?: string;
  note?: string;
}

export const EDUCATION: EducationEntry[] = [
  {
    program: "Computer Science",
    status: "currently studying",
  },
];
