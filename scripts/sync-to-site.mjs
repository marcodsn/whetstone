#!/usr/bin/env node
/**
 * Sync shared Whetstone code into the marcodsn.me `/whetstone` route.
 *
 * This repo is the source of truth; the site route is a *port* of it. This copies
 * the shared library + components + core packs into `<site>/src/lib/whetstone/`,
 * rewriting `$lib/…` imports to `$lib/whetstone/…` so they resolve there.
 *
 * What it does NOT touch (these are bespoke to the site and hand-maintained):
 *   - src/lib/whetstone/exercises.ts   (remote-fetch + bundled-fallback loader)
 *   - src/lib/whetstone/whetstone.css  (design atoms, scoped under `.whetstone`)
 *   - src/routes/whetstone/**          (route glue: layout, pages, NOTES.md)
 * Design changes made in this repo's `src/app.css` must be mirrored into
 * `whetstone.css` by hand — the two are structured differently (global vs scoped).
 *
 * Exercise *content* does not need syncing through here: the site fetches a
 * published exercises.json at runtime (see `npm run export-data`). This only
 * refreshes the bundled fallback packs.
 *
 * Usage:
 *   node scripts/sync-to-site.mjs [--site <path>] [--dry]
 *   npm run sync:site -- --site ../marcodsn.me
 *
 * --site defaults to ../marcodsn.me (sibling dir) or $WHETSTONE_SITE_DIR.
 */

import { readFileSync, writeFileSync, copyFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function arg(name) {
	const i = process.argv.indexOf(name);
	return i !== -1 ? process.argv[i + 1] : undefined;
}
const DRY = process.argv.includes('--dry');
const SITE = resolve(
	ROOT,
	arg('--site') ?? process.env.WHETSTONE_SITE_DIR ?? join('..', 'marcodsn.me')
);
const DEST = join(SITE, 'src', 'lib', 'whetstone');

if (!existsSync(DEST)) {
	console.error(
		`Destination not found: ${DEST}\n` +
			`Pass the site repo with --site <path> or set WHETSTONE_SITE_DIR. The ` +
			`/whetstone route must already exist there.`
	);
	process.exit(1);
}

// Shared modules + components: copied with the $lib import rewrite.
const REWRITE = [
	['src/lib/types.ts', 'types.ts'],
	['src/lib/scoring.ts', 'scoring.ts'],
	['src/lib/session.ts', 'session.ts'],
	['src/lib/prefs.ts', 'prefs.ts'],
	['src/lib/rich.ts', 'rich.ts'],
	['src/lib/components/Dots.svelte', 'components/Dots.svelte'],
	['src/lib/components/Rich.svelte', 'components/Rich.svelte'],
	['src/lib/components/Sparkline.svelte', 'components/Sparkline.svelte'],
	['src/lib/components/ExerciseCard.svelte', 'components/ExerciseCard.svelte']
];

// Core packs: copied verbatim (JSON has no imports). gen-*.json is never synced —
// it can hold unreviewed items, and content ships via exercises.json instead.
const PACKS_DIR = join(ROOT, 'src', 'lib', 'exercises', 'packs');
const corePacks = readdirSync(PACKS_DIR)
	.filter((f) => f.endsWith('-core.json'))
	.map((f) => [`src/lib/exercises/packs/${f}`, `packs/${f}`]);

function ensureDir(file) {
	const dir = dirname(file);
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

let copied = 0;

for (const [from, to] of REWRITE) {
	const src = join(ROOT, from);
	const dst = join(DEST, to);
	const out = readFileSync(src, 'utf8').replace(/(['"])\$lib\//g, '$1$lib/whetstone/');
	if (DRY) {
		console.log(`rewrite  ${from} → ${to}`);
	} else {
		ensureDir(dst);
		writeFileSync(dst, out);
	}
	copied++;
}

for (const [from, to] of corePacks) {
	const dst = join(DEST, to);
	if (DRY) {
		console.log(`copy     ${from} → ${to}`);
	} else {
		ensureDir(dst);
		copyFileSync(join(ROOT, from), dst);
	}
	copied++;
}

console.log(
	`${DRY ? '[dry] ' : ''}Synced ${copied} file(s) (${REWRITE.length} rewritten, ` +
		`${corePacks.length} core pack(s)) → ${DEST}`
);
if (!DRY) {
	console.log(
		'Note: exercises.ts, whetstone.css and the route files were left untouched. ' +
			'Review the diff in the site repo before committing.'
	);
}
