import type { Project } from "@/content/projects";

export interface ProjectStats {
  /** Every entry in the list, templates included. */
  total: number;
  /** tone "live": built, reachable or about to be. */
  live: number;
  /** tone "active": being built right now. */
  active: number;
  /** tone "template": practice exercises, not real projects. */
  template: number;
  /**
   * What the strip's status cell names: the first entry with tone "active", in
   * list order. `null` when nothing is being built.
   *
   * `anchor` is where that cell sends the visitor -- the project's own link
   * when it has one, otherwise the section its card lives in.
   */
  building: { title: string; anchor: string } | null;
}

/**
 * Derive the hero stat strip's project figures from the projects list itself,
 * so the strip cannot contradict the projects section: the counts move when a
 * project is added, retired or re-toned, and the status cell names a real entry
 * instead of a hand-typed title.
 *
 * Templates are deliberately not in the headline count: they are practice
 * exercises rather than projects, so the strip counts what a visitor could
 * actually open or watch being built.
 */
export function getProjectStats(projects: Project[]): ProjectStats {
  let live = 0;
  let active = 0;
  let template = 0;

  for (const project of projects) {
    if (project.tone === "live") live += 1;
    else if (project.tone === "active") active += 1;
    else if (project.tone === "template") template += 1;
  }

  const current = projects.find((project) => project.tone === "active");

  return {
    total: projects.length,
    live,
    active,
    template,
    building: current ? { title: current.title, anchor: current.href ?? "#projects" } : null,
  };
}
