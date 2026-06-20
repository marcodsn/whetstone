import type { Attempt, Domain } from '$lib/types';
import { DOMAINS } from '$lib/types';

const STORAGE_KEY = 'scope.attempts.v1';

export const BASE_RATING = 1000;
const K = 24;

/** An exercise of difficulty d "plays" at this rating. d=3 is an even match for a fresh user. */
export function difficultyRating(d: number): number {
	return BASE_RATING + (d - 3) * 150;
}

export function loadAttempts(): Attempt[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? (JSON.parse(raw) as Attempt[]) : [];
	} catch {
		return [];
	}
}

export function saveAttempt(a: Attempt): void {
	const all = loadAttempts();
	all.push(a);
	localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function clearAttempts(): void {
	localStorage.removeItem(STORAGE_KEY);
}

export function exportAttempts(): string {
	return JSON.stringify(loadAttempts(), null, 2);
}

function eloStep(rating: number, opponent: number, won: boolean): number {
	const expected = 1 / (1 + Math.pow(10, (opponent - rating) / 400));
	return rating + K * ((won ? 1 : 0) - expected);
}

export interface DomainStats {
	domain: Domain;
	attempts: number;
	correct: number;
	accuracy: number; // 0..1, NaN-safe (0 when no attempts)
	rating: number;
	/** rating after each attempt, oldest first — for sparklines */
	history: number[];
	lastTs: number | null;
}

/** Replay the attempt log to derive per-domain Elo ratings and histories. */
export function computeStats(attempts: Attempt[]): Record<Domain, DomainStats> {
	const stats = {} as Record<Domain, DomainStats>;
	for (const d of DOMAINS) {
		stats[d] = {
			domain: d,
			attempts: 0,
			correct: 0,
			accuracy: 0,
			rating: BASE_RATING,
			history: [BASE_RATING],
			lastTs: null
		};
	}
	const ordered = [...attempts].sort((a, b) => a.ts - b.ts);
	for (const a of ordered) {
		const s = stats[a.domain];
		if (!s) continue;
		s.attempts += 1;
		if (a.correct) s.correct += 1;
		s.rating = eloStep(s.rating, difficultyRating(a.difficulty), a.correct);
		s.history.push(s.rating);
		s.lastTs = a.ts;
	}
	for (const d of DOMAINS) {
		const s = stats[d];
		s.accuracy = s.attempts ? s.correct / s.attempts : 0;
	}
	return stats;
}

/** Days (local) on which at least one attempt was made, as yyyy-mm-dd strings. */
export function activeDays(attempts: Attempt[]): Set<string> {
	const days = new Set<string>();
	for (const a of attempts) {
		const d = new Date(a.ts);
		days.add(
			`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
		);
	}
	return days;
}

/** Consecutive active days ending today or yesterday. */
export function currentStreak(attempts: Attempt[]): number {
	const days = activeDays(attempts);
	const day = new Date();
	const key = (d: Date) =>
		`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	let streak = 0;
	if (!days.has(key(day))) day.setDate(day.getDate() - 1); // streak may end yesterday
	while (days.has(key(day))) {
		streak += 1;
		day.setDate(day.getDate() - 1);
	}
	return streak;
}
