import type { Attempt, Domain, Exercise } from '$lib/types';
import { exercises, byDomain } from '$lib/exercises';
import { computeStats } from '$lib/scoring';

/** Deterministic RNG (mulberry32) so the daily session is the same all day. */
function mulberry32(seed: number) {
	return function () {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function dateSeed(): number {
	const d = new Date();
	return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

/**
 * Pick `n` exercises, preferring ones never attempted, then ones last answered
 * wrong, then least-recently seen. Within each tier the order is random.
 */
function pick(pool: Exercise[], n: number, attempts: Attempt[], rng: () => number): Exercise[] {
	const lastByEx = new Map<string, Attempt>();
	for (const a of attempts) {
		const prev = lastByEx.get(a.exerciseId);
		if (!prev || a.ts > prev.ts) lastByEx.set(a.exerciseId, a);
	}
	const unseen: Exercise[] = [];
	const missed: Exercise[] = [];
	const seen: Exercise[] = [];
	for (const ex of pool) {
		const last = lastByEx.get(ex.id);
		if (!last) unseen.push(ex);
		else if (!last.correct) missed.push(ex);
		else seen.push(ex);
	}
	seen.sort((a, b) => (lastByEx.get(a.id)!.ts ?? 0) - (lastByEx.get(b.id)!.ts ?? 0));
	const ordered = [...shuffle(unseen, rng), ...shuffle(missed, rng), ...seen];
	return ordered.slice(0, n);
}

/**
 * Lowest-rated domain first, so weakness gets the early round-robin slots. Ties
 * — including untouched domains, all at BASE_RATING — are broken with the seeded
 * rng so the focus still rotates day to day rather than fixing on alphabetical order.
 */
export function orderByWeakness(
	domains: Domain[],
	stats: Record<Domain, { rating: number }>,
	rng: () => number
): Domain[] {
	const jitter = new Map(domains.map((d) => [d, rng()]));
	return [...domains].sort(
		(a, b) => stats[a].rating - stats[b].rating || jitter.get(a)! - jitter.get(b)!
	);
}

export interface SessionSpec {
	mode: 'daily' | 'domain' | 'all';
	domain?: Domain;
	n: number;
}

/**
 * Build a session.
 *
 * `allowedDomains` restricts daily / mixed sessions to the domains the user
 * elected to be tested on (see prefs.ts). It is ignored for explicit `domain`
 * sessions — training a single domain is always allowed — and an empty/omitted
 * list falls back to every domain so a session is never empty.
 */
export function buildSession(
	spec: SessionSpec,
	attempts: Attempt[],
	allowedDomains?: Domain[]
): Exercise[] {
	const rng = spec.mode === 'daily' ? mulberry32(dateSeed()) : mulberry32(Date.now() & 0xffffffff);
	if (spec.mode === 'domain' && spec.domain) {
		return pick(byDomain(spec.domain), spec.n, attempts, rng);
	}
	// daily / all: spread across the selected domains, then fill
	const allowed = allowedDomains && allowedDomains.length ? new Set(allowedDomains) : null;
	const pool = allowed ? exercises.filter((e) => allowed.has(e.domain)) : exercises;
	const picked = pick(pool, spec.n * 3, attempts, rng);
	const perDomain = new Map<Domain, Exercise[]>();
	for (const ex of picked) {
		const list = perDomain.get(ex.domain) ?? [];
		list.push(ex);
		perDomain.set(ex.domain, list);
	}
	// Weakness targeting: serve the lowest-rated domains first so the round-robin
	// fill (which stops once we hit spec.n) favours rust over strengths.
	const result: Exercise[] = [];
	const stats = computeStats(attempts);
	const domains = orderByWeakness([...perDomain.keys()], stats, rng);
	let i = 0;
	while (result.length < spec.n && domains.length > 0) {
		const idx = i % domains.length;
		const list = perDomain.get(domains[idx])!;
		const ex = list.shift();
		if (ex) result.push(ex);
		if (list.length === 0) domains.splice(idx, 1);
		else i++;
	}
	return shuffle(result, rng);
}

/** Normalize a free-text answer for forgiving comparison. */
function normalize(s: string): string {
	return s
		.toLowerCase()
		.trim()
		.replace(/\s+/g, ' ')
		.replace(/[.。!?]+$/u, '')
		.replace(/^["'`]|["'`]$/g, '');
}

/**
 * Parse a human-typed number, tolerating both English and European grouping:
 *   "1,000" / "1,000,000"   → thousands-grouped, comma stripped
 *   "1.234.567,89"          → European, dots grouped + comma decimal
 *   "12,5"                  → comma decimal
 *   "12.0" / "1234.5"       → plain
 * Returns NaN when the string isn't a clean number (so non-numeric answers fall
 * through to exact-string matching instead of being coerced — e.g. "1,000" must
 * never become 1).
 */
function toNumber(s: string): number {
	const t = s.replace(/\s/g, '');
	if (/^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) return Number(t.replace(/,/g, ''));
	if (/^[+-]?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) return Number(t.replace(/\./g, '').replace(',', '.'));
	if (/^[+-]?\d+,\d+$/.test(t)) return Number(t.replace(',', '.'));
	if (/^[+-]?\d*\.?\d+$/.test(t)) return Number(t);
	return NaN;
}

export function checkInput(ex: Exercise, given: string): boolean {
	const g = normalize(given);
	if (!g) return false;
	const candidates = [ex.answer, ...(ex.accepted ?? [])].map(normalize);
	if (candidates.includes(g)) return true;
	// numeric tolerance: "12.0" matches "12", "1,000" matches "1000"
	const num = toNumber(g);
	if (!Number.isNaN(num)) {
		for (const c of candidates) {
			const cn = toNumber(c);
			if (!Number.isNaN(cn) && Math.abs(cn - num) < 1e-9) return true;
		}
	}
	return false;
}
