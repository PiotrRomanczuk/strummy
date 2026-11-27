import fs from 'node:fs';
import path from 'node:path';

/**
 * Every API route the app serves, read from `app/api` on disk, so a spec that
 * walks them covers a new route the day it is added.
 */

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

export type ApiRoute = {
  /** Path under `app/api`, as written on disk: `lessons/[id]`. */
  route: string;
  /** Methods the route file exports. */
  methods: HttpMethod[];
};

const API_ROOT = path.join(process.cwd(), 'app', 'api');
const DYNAMIC_SEGMENT = /^\[\[?(\.\.\.)?([^\]]+)\]\]?$/;
const DUMMY_ID = '00000000-0000-4000-8000-000000000000';
const EXPORTED_METHOD = /export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE)\b/g;
const REEXPORTED_METHODS = /export\s*\{([^}]*)\}/g;

function exportedMethods(source: string): HttpMethod[] {
  const found = new Set<string>();
  for (const match of source.matchAll(EXPORTED_METHOD)) found.add(match[1]);
  for (const match of source.matchAll(REEXPORTED_METHODS)) {
    for (const name of match[1].split(',')) {
      const exported = name
        .split(/\s+as\s+/)
        .pop()
        ?.trim();
      if (exported) found.add(exported);
    }
  }
  return HTTP_METHODS.filter((method) => found.has(method));
}

export function listApiRoutes(): ApiRoute[] {
  const routes: ApiRoute[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === 'route.ts') {
        routes.push({
          route: path.relative(API_ROOT, dir).split(path.sep).join('/'),
          methods: exportedMethods(fs.readFileSync(full, 'utf8')),
        });
      }
    }
  };
  walk(API_ROOT);
  return routes.sort((a, b) => a.route.localeCompare(b.route));
}

/** The URL path a route answers on, with `[id]` → a uuid and `[...x]` → one segment. */
export function apiPathFor(route: string): string {
  const concrete = route.split('/').map((segment) => {
    const match = segment.match(DYNAMIC_SEGMENT);
    if (!match) return segment;
    return match[1] ? 'contract' : DUMMY_ID;
  });
  return `/api/${concrete.join('/')}`;
}
