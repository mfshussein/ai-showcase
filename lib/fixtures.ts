import { readFile } from "node:fs/promises";
import path from "node:path";

export function makeFixtureLoader(slug: string) {
  const dir = path.join(process.cwd(), "demos", slug, "fixtures");
  return {
    fixture: (name: string) => readFile(path.join(dir, name), "utf8"),
    fixtureBuffer: (name: string) => readFile(path.join(dir, name)),
  };
}
