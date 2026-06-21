import { describe, it, expect, beforeEach } from 'vitest';
import type { Attempt, Domain } from './types';
import {
	BASE_RATING,
	difficultyRating,
	computeStats,
	currentStreak,
	activeDays,
	importAttempts,
	loadAttempts,
	saveAttempt,
	clearAttempts
} from './scoring';

// Minimal localStorage stand-in for the node test environment. The store reads
// and writes only through these methods, so a Map is enough.
function installLocalStorage() {
	const store = new Map<string, string>();
	(globalThis as { localStorage?: Storage }).localStorage = {
		getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
		setItem: (k: string, v: string) => void store.set(k, v),
		removeItem: (k: string) => void store.delete(k),
		clear: () => store.clear(),
		key: (i: number) => [...store.keys()][i] ?? null,
		get length() {
			return store.size;
		}
	} as Storage;
}

function attempt(over: Partial<Attempt> = {}): Attempt {
	return {
		exerciseId: 'x-1',
		domain: 'math' as Domain,
		difficulty: 3,
		correct: true,
		ts: 1_700_000_000_000,
		...over
	};
}

const DAY = 86_400_000;

describe('difficultyRating', () => {
	it('treats d3 as an even match for a fresh user', () => {
		expect(difficultyRating(3)).toBe(BASE_RATING);
		expect(difficultyRating(4)).toBe(BASE_RATING + 150);
		expect(difficultyRating(2)).toBe(BASE_RATING - 150);
	});
});

describe('computeStats — Elo replay', () => {
	it('starts every domain at BASE with a single-point history', () => {
		const stats = computeStats([]);
		expect(stats.math.rating).toBe(BASE_RATING);
		expect(stats.math.attempts).toBe(0);
		expect(stats.math.accuracy).toBe(0);
		expect(stats.math.history).toEqual([BASE_RATING]);
		expect(stats.math.lastTs).toBeNull();
	});

	it('moves +12 on a correct even match (K=24, expected 0.5)', () => {
		const stats = computeStats([attempt({ difficulty: 3, correct: true })]);
		expect(stats.math.rating).toBeCloseTo(BASE_RATING + 12, 6);
		expect(stats.math.correct).toBe(1);
		expect(stats.math.accuracy).toBe(1);
	});

	it('moves -12 on a wrong even match', () => {
		const stats = computeStats([attempt({ difficulty: 3, correct: false })]);
		expect(stats.math.rating).toBeCloseTo(BASE_RATING - 12, 6);
		expect(stats.math.accuracy).toBe(0);
	});

	it('is order-independent (replays sorted by ts) and tracks history length', () => {
		const a = attempt({ exerciseId: 'a', ts: 200, correct: true });
		const b = attempt({ exerciseId: 'b', ts: 100, correct: false });
		const forward = computeStats([a, b]).math.rating;
		const reversed = computeStats([b, a]).math.rating;
		expect(forward).toBeCloseTo(reversed, 9);
		expect(computeStats([a, b]).math.history.length).toBe(3); // base + 2 attempts
	});

	it('keeps domains independent', () => {
		const stats = computeStats([
			attempt({ domain: 'math', correct: true }),
			attempt({ domain: 'logic', correct: false })
		]);
		expect(stats.math.rating).toBeGreaterThan(BASE_RATING);
		expect(stats.logic.rating).toBeLessThan(BASE_RATING);
		expect(stats.code.rating).toBe(BASE_RATING);
	});
});

describe('streaks', () => {
	const todayMid = new Date();
	todayMid.setHours(12, 0, 0, 0);
	const today = todayMid.getTime();

	it('is 0 with no attempts', () => {
		expect(currentStreak([])).toBe(0);
	});

	it('counts consecutive days ending today', () => {
		const at = [attempt({ ts: today }), attempt({ ts: today - DAY }), attempt({ ts: today - 2 * DAY })];
		expect(currentStreak(at)).toBe(3);
	});

	it('still counts when the streak ends yesterday (today not yet practised)', () => {
		expect(currentStreak([attempt({ ts: today - DAY })])).toBe(1);
	});

	it('breaks on a gap', () => {
		expect(currentStreak([attempt({ ts: today }), attempt({ ts: today - 3 * DAY })])).toBe(1);
	});

	it('counts each local day once', () => {
		const days = activeDays([attempt({ ts: today }), attempt({ ts: today + 1000 })]);
		expect(days.size).toBe(1);
	});
});

describe('importAttempts — format stability & de-dupe', () => {
	beforeEach(() => {
		installLocalStorage();
		clearAttempts();
	});

	it('imports a valid export and round-trips the Attempt shape', () => {
		const json = JSON.stringify([attempt({ exerciseId: 'a', ts: 1 })]);
		const { added, total } = importAttempts(json);
		expect(added).toBe(1);
		expect(total).toBe(1);
		expect(loadAttempts()[0]).toMatchObject({
			exerciseId: 'a',
			domain: 'math',
			difficulty: 3,
			correct: true,
			ts: 1
		});
	});

	it('is idempotent — re-importing the same file adds nothing', () => {
		const json = JSON.stringify([attempt({ exerciseId: 'a', ts: 1 })]);
		importAttempts(json);
		expect(importAttempts(json).added).toBe(0);
		expect(loadAttempts().length).toBe(1);
	});

	it('merges new attempts into a non-empty store, de-duping on id+ts', () => {
		saveAttempt(attempt({ exerciseId: 'a', ts: 1 }));
		const json = JSON.stringify([
			attempt({ exerciseId: 'a', ts: 1 }), // dupe
			attempt({ exerciseId: 'b', ts: 2 }) // new
		]);
		expect(importAttempts(json).added).toBe(1);
		expect(loadAttempts().length).toBe(2);
	});

	it('rejects junk and non-Whetstone data', () => {
		expect(() => importAttempts('not json')).toThrow();
		expect(() => importAttempts('{}')).toThrow();
		expect(() => importAttempts('[{"foo":1}]')).toThrow();
	});

	it('imports the attempts out of an export envelope (not just a bare array)', () => {
		const json = JSON.stringify({
			version: 1,
			selectedDomains: ['math'],
			attempts: [attempt({ exerciseId: 'a', ts: 1 })]
		});
		expect(importAttempts(json).added).toBe(1);
		expect(loadAttempts().length).toBe(1);
	});

	it('drops entries with an unknown domain but keeps valid ones', () => {
		const json = JSON.stringify([
			attempt({ exerciseId: 'good', ts: 1 }),
			{ ...attempt({ exerciseId: 'bad', ts: 2 }), domain: 'astrology' }
		]);
		expect(importAttempts(json).added).toBe(1);
	});
});
