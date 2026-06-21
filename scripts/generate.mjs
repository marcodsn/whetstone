#!/usr/bin/env node
/**
 * SCOPE exercise generator.
 *
 * Talks to any OpenAI-compatible chat completions endpoint (ollama, llama.cpp,
 * LM Studio, vLLM, or the real thing) and writes a new exercise pack JSON that
 * the app picks up automatically on next build.
 *
 * Usage:
 *   node scripts/generate.mjs --domain math --count 5 --difficulty 2-4
 *
 * Environment (all optional):
 *   SCOPE_BASE_URL  default http://localhost:11434/v1   (ollama)
 *   SCOPE_API_KEY   default "local"
 *   SCOPE_MODEL     default "qwen2.5:32b"
 *
 * Generated exercises are tagged "generated" and "unreviewed". Review them —
 * small models confidently write wrong answers. See prompts/claude-update.md
 * for a ready-made audit prompt.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACKS_DIR = join(ROOT, 'src', 'lib', 'exercises', 'packs');
const PROMPTS_DIR = join(ROOT, 'prompts');

// ── .env (optional, no dependency) ────────────────────────────────
// Loads KEY=VALUE lines from a .env file at the project root so the model and
// endpoint can be configured without exporting shell vars. Real environment
// variables and --flags still win. Supports comments, quotes, and an optional
// `export ` prefix. See .env.example.
function loadEnv(file) {
	if (!existsSync(file)) return;
	for (let line of readFileSync(file, 'utf8').split('\n')) {
		line = line.trim();
		if (!line || line.startsWith('#')) continue;
		if (line.startsWith('export ')) line = line.slice(7).trim();
		const eq = line.indexOf('=');
		if (eq === -1) continue;
		const key = line.slice(0, eq).trim();
		if (!key || key in process.env) continue; // existing env takes precedence
		let val = line.slice(eq + 1).trim();
		if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
			val = val.slice(1, -1);
		process.env[key] = val;
	}
}

loadEnv(join(ROOT, '.env'));

const DOMAINS = ['math', 'logic', 'code', 'japanese', 'latex', 'general'];
const TYPES = ['choice', 'input', 'self'];

// ── args ──────────────────────────────────────────────────────────

function parseArgs(argv) {
	const args = { count: 5, difficulty: '2-4' };
	for (let i = 2; i < argv.length; i++) {
		const k = argv[i];
		const v = argv[i + 1];
		if (k === '--domain') (args.domain = v), i++;
		else if (k === '--count') (args.count = parseInt(v, 10)), i++;
		else if (k === '--difficulty') (args.difficulty = v), i++;
		else if (k === '--weights') (args.weights = v), i++;
		else if (k === '--model') (args.model = v), i++;
		else if (k === '--base-url') (args.baseUrl = v), i++;
		else if (k === '--help' || k === '-h') args.help = true;
	}
	return args;
}

const args = parseArgs(process.argv);

if (args.help || !args.domain || !DOMAINS.includes(args.domain)) {
	console.log(`SCOPE exercise generator

Usage: node scripts/generate.mjs --domain <${DOMAINS.join('|')}> [options]

Options:
  --count <n>          number of exercises to generate (default 5)
  --difficulty <spec>  difficulty buckets 1-5 (default 2-4). Comma-separated
                       levels or ranges, e.g. "3" or "2-4" or "1-2,3,4-5".
  --weights <list>     relative weight per --difficulty bucket, aligned by
                       index, e.g. --difficulty 1-2,3,4-5 --weights 10,20,10.
                       Omit for an equal (uniform) distribution.
  --model <name>       override SCOPE_MODEL
  --base-url <url>     override SCOPE_BASE_URL

Environment:
  SCOPE_BASE_URL   ${process.env.SCOPE_BASE_URL ?? 'http://localhost:11434/v1 (default)'}
  SCOPE_MODEL      ${process.env.SCOPE_MODEL ?? 'qwen2.5:32b (default)'}
  SCOPE_API_KEY    ${process.env.SCOPE_API_KEY ? '(set)' : 'local (default)'}`);
	process.exit(args.help ? 0 : 1);
}

const BASE_URL = args.baseUrl ?? process.env.SCOPE_BASE_URL ?? 'http://localhost:11434/v1';
const API_KEY = process.env.SCOPE_API_KEY ?? 'local';
const MODEL = args.model ?? process.env.SCOPE_MODEL ?? 'qwen2.5:32b';

// ── difficulty buckets + weights ──────────────────────────────────
// --difficulty 1-2,3,4-5  --weights 10,20,10
//   weighted-pick a bucket, then uniform within it. No --weights = equal,
//   which for a single bucket is just uniform over the range (the old default).
function parseRange(s) {
	const [a, b] = s.includes('-') ? s.split('-').map(Number) : [Number(s), Number(s)];
	if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b > 5 || a > b)
		throw new Error(`bad difficulty bucket "${s}" (expect levels 1-5 as "n" or "lo-hi")`);
	return [a, b];
}

const buckets = args.difficulty.split(',').map((s) => parseRange(s.trim()));
const weights = args.weights ? args.weights.split(',').map(Number) : buckets.map(() => 1);
if (weights.length !== buckets.length)
	throw new Error(
		`--weights has ${weights.length} value(s) but --difficulty has ${buckets.length} bucket(s)`
	);
if (weights.some((w) => !(w >= 0) || w === Infinity))
	throw new Error('--weights must be non-negative numbers');
const totalWeight = weights.reduce((a, b) => a + b, 0);
if (totalWeight <= 0) throw new Error('--weights must sum to a positive number');

function pickDifficulty() {
	let r = Math.random() * totalWeight;
	let i = 0;
	while (i < weights.length - 1 && (r -= weights[i]) >= 0) i++;
	const [lo, hi] = buckets[i];
	return lo + Math.floor(Math.random() * (hi - lo + 1));
}

// ── existing material (for ids, few-shot, dedupe) ─────────────────

function loadPacks() {
	const packs = [];
	for (const f of readdirSync(PACKS_DIR).filter((f) => f.endsWith('.json'))) {
		packs.push({ file: f, data: JSON.parse(readFileSync(join(PACKS_DIR, f), 'utf8')) });
	}
	return packs;
}

const packs = loadPacks();
const existing = packs.flatMap((p) => p.data.exercises);
const existingIds = new Set(existing.map((e) => e.id));
const existingPrompts = new Set(existing.map((e) => normalizePrompt(e.prompt)));
const domainExisting = existing.filter((e) => e.domain === args.domain);

function normalizePrompt(p) {
	return p.toLowerCase().replace(/[^a-z0-9ぁ-んァ-ン一-龯]+/g, ' ').trim();
}

function nextId() {
	let n = 1;
	let id;
	do {
		id = `gen-${args.domain}-${String(n).padStart(3, '0')}`;
		n++;
	} while (existingIds.has(id));
	existingIds.add(id);
	return id;
}

// ── validation ────────────────────────────────────────────────────

function validate(ex) {
	const errs = [];
	if (ex.domain !== args.domain) errs.push(`domain must be "${args.domain}"`);
	if (!TYPES.includes(ex.type)) errs.push(`type must be one of ${TYPES.join(', ')}`);
	if (!Number.isInteger(ex.difficulty) || ex.difficulty < 1 || ex.difficulty > 5)
		errs.push('difficulty must be an integer 1-5');
	if (typeof ex.prompt !== 'string' || ex.prompt.length < 10) errs.push('prompt too short');
	if (typeof ex.answer !== 'string' || !ex.answer.length) errs.push('answer missing');
	if (ex.type === 'choice') {
		if (!Array.isArray(ex.choices) || ex.choices.length < 2 || ex.choices.length > 6)
			errs.push('choice exercises need 2-6 choices');
		else if (!ex.choices.includes(ex.answer)) errs.push('answer must exactly match one choice');
		else if (new Set(ex.choices).size !== ex.choices.length) errs.push('choices must be unique');
	}
	if (ex.code && (typeof ex.code.lang !== 'string' || typeof ex.code.src !== 'string'))
		errs.push('code must be { lang, src }');
	if (existingPrompts.has(normalizePrompt(ex.prompt))) errs.push('duplicate of existing prompt');
	return errs;
}

// ── LLM call ──────────────────────────────────────────────────────

const systemPrompt =
	readFileSync(join(PROMPTS_DIR, 'generator-system.md'), 'utf8') +
	'\n\n## Domain guidance\n\n' +
	readFileSync(join(PROMPTS_DIR, 'domains', `${args.domain}.md`), 'utf8');

function fewShot() {
	// up to 3 hand-written examples from this domain, as style anchors
	const sample = domainExisting.filter((e) => !(e.tags ?? []).includes('generated')).slice(0, 3);
	return sample.map(({ id, ...rest }) => rest);
}

function extractJson(text) {
	// strip reasoning tags (qwen/deepseek style) and code fences
	let t = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
	const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
	if (fence) t = fence[1].trim();
	const start = t.indexOf('{');
	const end = t.lastIndexOf('}');
	if (start === -1 || end === -1) throw new Error('no JSON object in response');
	return JSON.parse(t.slice(start, end + 1));
}

async function chat(messages) {
	const res = await fetch(`${BASE_URL.replace(/\/$/, '')}/chat/completions`, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			authorization: `Bearer ${API_KEY}`
		},
		body: JSON.stringify({ model: MODEL, messages, temperature: 0.9 })
	});
	if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);
	const data = await res.json();
	return data.choices[0].message.content;
}

async function generateOne(difficulty, avoid) {
	const user = [
		`Generate exactly ONE new exercise as a single JSON object. No prose, no markdown fence.`,
		`Domain: ${args.domain}`,
		`Difficulty: ${difficulty} (on the 1-5 scale described above)`,
		avoid.length
			? `Do NOT repeat or paraphrase any of these existing exercises:\n${avoid.map((p) => `- ${p}`).join('\n')}`
			: '',
		`Here are examples of the expected style and quality (do not copy them):`,
		JSON.stringify(fewShot(), null, 2)
	]
		.filter(Boolean)
		.join('\n\n');

	const raw = await chat([
		{ role: 'system', content: systemPrompt },
		{ role: 'user', content: user }
	]);
	const ex = extractJson(raw);
	ex.domain = args.domain;
	ex.difficulty = Number(ex.difficulty) || difficulty;
	return ex;
}

// ── main ──────────────────────────────────────────────────────────

const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const outFile = join(PACKS_DIR, `gen-${args.domain}-${today}.json`);
const outPack = existsSync(outFile)
	? JSON.parse(readFileSync(outFile, 'utf8'))
	: { pack: `gen-${args.domain}-${today}`, exercises: [] };

console.log(`SCOPE generator — ${MODEL} @ ${BASE_URL}`);
const distLabel = buckets
	.map(([lo, hi], i) => `${lo === hi ? lo : `${lo}-${hi}`}×${weights[i]}`)
	.join(', ');
console.log(`Domain: ${args.domain}, count: ${args.count}, difficulty: ${distLabel}\n`);

const recentPrompts = domainExisting.slice(-20).map((e) => e.prompt.slice(0, 100));
let accepted = 0;

for (let i = 0; i < args.count; i++) {
	const difficulty = pickDifficulty();
	let ok = false;
	for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
		try {
			process.stdout.write(`[${i + 1}/${args.count}] d${difficulty}, attempt ${attempt}… `);
			const ex = await generateOne(difficulty, recentPrompts);
			const errs = validate(ex);
			if (errs.length) {
				console.log(`rejected: ${errs.join('; ')}`);
				continue;
			}
			ex.id = nextId();
			ex.tags = [...new Set([...(ex.tags ?? []), 'generated', 'unreviewed'])];
			outPack.exercises.push(ex);
			existingPrompts.add(normalizePrompt(ex.prompt));
			recentPrompts.push(ex.prompt.slice(0, 100));
			writeFileSync(outFile, JSON.stringify(outPack, null, '\t') + '\n');
			console.log(`accepted → ${ex.id}`);
			accepted++;
			ok = true;
		} catch (e) {
			console.log(`error: ${e.message}`);
		}
	}
}

console.log(`\nDone. ${accepted}/${args.count} accepted → ${outFile}`);
if (accepted > 0) {
	console.log(
		'\n⚠ Generated exercises are tagged "unreviewed". Verify the answers before trusting your scores —\n  small models write confident nonsense. prompts/claude-update.md has an audit prompt for this.'
	);
}
