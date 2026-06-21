#!/usr/bin/env node
/**
 * Whetstone audit helper — lists every exercise still tagged "unreviewed".
 *
 * Generated packs (gen-*.json) land tagged "generated" + "unreviewed". A human
 * (or the monthly Claude audit, see prompts/claude-update.md) verifies each
 * answer and drops the "unreviewed" tag. Until then the app hides them in
 * builds. This prints the work queue compactly so the reviewer reads one
 * command's output instead of opening every pack — then only edits the files
 * that actually need a fix.
 *
 * Usage:
 *   node scripts/audit.mjs          # human-readable list
 *   node scripts/audit.mjs --json   # machine-readable, one object per line
 */

import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACKS_DIR = join(ROOT, 'src', 'lib', 'exercises', 'packs');

const asJson = process.argv.includes('--json');

const files = readdirSync(PACKS_DIR)
	.filter((f) => f.startsWith('gen-') && f.endsWith('.json'))
	.sort();

let total = 0;
for (const file of files) {
	let pack;
	try {
		pack = JSON.parse(readFileSync(join(PACKS_DIR, file), 'utf8'));
	} catch (err) {
		console.error(`✗ ${file}: ${err.message}`);
		continue;
	}
	const pending = (pack.exercises ?? []).filter((e) => (e.tags ?? []).includes('unreviewed'));
	if (!pending.length) continue;

	if (!asJson) console.log(`\n${file} — ${pending.length} unreviewed`);
	for (const ex of pending) {
		total++;
		if (asJson) {
			console.log(JSON.stringify({ file, ...ex }));
			continue;
		}
		const prompt = ex.prompt.replace(/\s+/g, ' ').trim();
		const accepted = (ex.accepted ?? []).join(' | ');
		console.log(`  ${ex.id}  [${ex.domain} d${ex.difficulty} ${ex.type}]`);
		console.log(`    Q: ${prompt}`);
		console.log(`    A: ${ex.answer}${accepted && accepted !== ex.answer ? `   (accepted: ${accepted})` : ''}`);
	}
}

if (!asJson) {
	console.log(
		total
			? `\n${total} exercise(s) await review across ${files.length} generated pack(s).`
			: '\nNothing to review — all generated exercises are verified. ✓'
	);
}
