// Leaderboard paging (app/page.tsx); kept apart from the page so lib/pages.test.ts can run it

/** A whole page number the API can parse (a Java-style int) from ?page=; the API clamps anything past the last page itself. */
export const pageNumber = (raw?: string) => Math.min(Math.max(Math.trunc(Number(raw)) || 1, 1), 2 ** 31 - 1);

/**
 * The page links to draw: the first, the last and two either side of `page`, so thousands of players don't make a
 * wall of numbers. null is a gap ("…"); a gap of one page shows that page instead, as "…" would take the same room.
 */
export function pageWindow(page: number, pages: number): (number | null)[] {
  const near = (n: number) => n === 1 || n === pages || Math.abs(n - page) <= 2;
  const shown: (number | null)[] = [];
  for (let n = 1; n <= pages; n++) {
    if (near(n) || (near(n - 1) && near(n + 1))) shown.push(n);
    else if (shown.at(-1) !== null) shown.push(null);
  }
  return shown;
}
