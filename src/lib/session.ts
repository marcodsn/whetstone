import type { Attempt, Domain, Exercise } from '$lib/types';
import { exercises, byDomain } from '$lib/exercises';

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

export interface SessionSpec {
	mode: 'daily' | 'domain' | 'all';
	domain?: Domain;
	n: number;
}

export function buildSession(spec: SessionSpec, attempts: Attempt[]): Exercise[] {
	const rng = spec.mode === 'daily' ? mulberry32(dateSeed()) : mulberry32(Date.now() & 0xffffffff);
	if (spec.mode === 'domain' && spec.domain) {
		return pick(byDomain(spec.domain), spec.n, attempts, rng);
	}
	// daily / all: spread across domains, then fill
	const picked = pick(exercises, spec.n * 3, attempts, rng);
	const perDomain = new Map<Domain, Exercise[]>();
	for (const ex of picked) {
		const list = perDomain.get(ex.domain) ?? [];
		list.push(ex);
		perDomain.set(ex.domain, list);
	}
	const result: Exercise[] = [];
	const domains = shuffle([...perDomain.keys()], rng);
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

export function checkInput(ex: Exercise, given: string): boolean {
	const g = normalize(given);
	if (!g) return false;
	const candidates = [ex.answer, ...(ex.accepted ?? [])].map(normalize);
	if (candidates.includes(g)) return true;
	// numeric tolerance: "12.0" matches "12"
	const num = Number(g.replace(',', '.'));
	if (!Number.isNaN(num)) {
		for (const c of candidates) {
			const cn = Number(c.replace(',', '.'));
			if (!Number.isNaN(cn) && Math.abs(cn - num) < 1e-9) return true;
		}
	}
	return false;
}
