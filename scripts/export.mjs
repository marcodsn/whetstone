#!/usr/bin/env node
/**
 * Whetstone data export.
 *
 * Flattens every reviewed exercise pack into a single `static/exercises.json`
 * (a plain array of exercises). This is the artifact the published `/whetstone`
 * route on marcodsn.me fetches; it falls back to its own bundled core packs if
 * the fetch fails.
 *
 * Gating mirrors the in-app loader (src/lib/exercises/index.ts): duplicate ids,
 * unknown domains, choice answers not among the choices, and anything still
 * tagged "unreviewed" are dropped — so unverified generated items never ship.
 *
 * Usage:
 *   node scripts/export.mjs            # writes static/exercises.json
 *   npm run export-data
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACKS_DIR = join(ROOT, 'src', 'lib', 'exercises', 'packs');
const DOMAINS_DIR = join(ROOT, 'prompts', 'domains');
const OUT_FILE = join(ROOT, 'static', 'exercises.json');

// Domains, discovered the same way the generator does — from the per-domain
// guidance files — so there's no second list to keep in sync.
const DOMAINS = new Set(
	readdirSync(DOMAINS_DIR)
		.filter((f) => f.endsWith('.md'))
		.map((f) => f.replace(/\.md$/, ''))
);

const exercises = [];
const seen = new Set();
let skipped = 0;

for (const file of readdirSync(PACKS_DIR).filter((f) => f.endsWith('.json')).sort()) {
	const pack = JSON.parse(readFileSync(join(PACKS_DIR, file), 'utf8'));
	for (const ex of pack.exercises ?? []) {
		if (seen.has(ex.id)) {
			console.warn(`[export] duplicate id "${ex.id}" in ${file} — skipped`);
			skipped++;
			continue;
		}
		if (!DOMAINS.has(ex.domain)) {
			console.warn(`[export] unknown domain "${ex.domain}" for ${ex.id} — skipped`);
			skipped++;
			continue;
		}
		if (ex.type === 'choice' && !(ex.choices ?? []).includes(ex.answer)) {
			console.warn(`[export] answer not among choices for ${ex.id} — skipped`);
			skipped++;
			continue;
		}
		if ((ex.tags ?? []).includes('unreviewed')) {
			skipped++;
			continue; // never ship unverified items
		}
		seen.add(ex.id);
		exercises.push(ex);
	}
}

if (!existsSync(dirname(OUT_FILE))) mkdirSync(dirname(OUT_FILE), { recursive: true });
writeFileSync(OUT_FILE, JSON.stringify(exercises, null, '\t') + '\n');

console.log(
	`Wrote ${exercises.length} reviewed exercise(s) → ${OUT_FILE}` +
		(skipped ? ` (${skipped} skipped: unreviewed/invalid/duplicate)` : '')
);
