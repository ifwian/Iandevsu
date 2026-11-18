/** Joins class names, skipping anything falsy. Supports both variadic and object-spread patterns (like clsx). */
export function cn(classes: Record<string, boolean>): string;
export function cn(classes: string, ...additional: Array<string | false | null | undefined>): string;
export function cn(...classes: Array<string | false | null | undefined | Record<string, boolean>>): string;
export function cn(classes: any, ...additional: any[]): string {
  // Helper: extract class names from a possibly-conditional object
  const extractClasses = (obj: Record<string, boolean>): string[] =>
    Object.entries(obj)
      .filter(([, v]) => v)
      .map(([k]) => k);
  // Helper: collect all string class names from arguments
  const collectStrings = (args: any[]): string[] => {
    const result: string[] = [];
    for (const arg of args) {
      if (typeof arg === "string") result.push(arg);
      else if (typeof arg === "object" && arg !== null && !Array.isArray(arg)) {
        result.push(...extractClasses(arg));
      }
    }
    return result;
  };

  // If first argument is a pure object (no strings mixed in), use object mode
  if (classes && typeof classes === "object" && classes !== null && !Array.isArray(classes)) {
    return extractClasses(classes).join(" ");
  }

  // Variadic mode: collect all strings and objects
  const allArgs: any[] = [classes, ...additional];
  const strings: string[] = collectStrings(allArgs);
  return strings.join(" ");
}