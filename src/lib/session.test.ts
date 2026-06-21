import { describe, it, expect } from 'vitest';
import type { Domain, Exercise } from './types';
import { DOMAINS } from './types';
import { checkInput, buildSession, orderByWeakness } from './session';
import { BASE_RATING } from './scoring';

function ex(over: Partial<Exercise> = {}): Exercise {
	return {
		id: 'e1',
		domain: 'math',
		type: 'input',
		difficulty: 3,
		prompt: 'placeholder prompt',
		answer: '42',
		...over
	} as Exercise;
}

describe('checkInput — forgiving comparison', () => {
	it('matches case/whitespace/trailing punctuation insensitively', () => {
		const e = ex({ answer: 'Paris' });
		expect(checkInput(e, ' paris ')).toBe(true);
		expect(checkInput(e, 'Paris.')).toBe(true);
	});

	it('accepts listed variants', () => {
		const e = ex({ answer: 'four', accepted: ['4', 'IV'] });
		expect(checkInput(e, '4')).toBe(true);
		expect(checkInput(e, 'iv')).toBe(true);
	});

	it('tolerates equal numeric forms', () => {
		expect(checkInput(ex({ answer: '12' }), '12.0')).toBe(true);
		expect(checkInput(ex({ answer: '12.0' }), '12')).toBe(true);
	});

	it('reads thousands separators correctly (regression: "1,000" is 1000, not 1)', () => {
		expect(checkInput(ex({ answer: '1000' }), '1,000')).toBe(true);
		expect(checkInput(ex({ answer: '1' }), '1,000')).toBe(false);
		expect(checkInput(ex({ answer: '1234567' }), '1,234,567')).toBe(true);
	});

	it('handles European decimals and grouping', () => {
		expect(checkInput(ex({ answer: '12.5' }), '12,5')).toBe(true);
		expect(checkInput(ex({ answer: '1234.5' }), '1.234,5')).toBe(true);
	});

	it('rejects empty and wrong answers', () => {
		expect(checkInput(ex({ answer: '42' }), '')).toBe(false);
		expect(checkInput(ex({ answer: '42' }), '   ')).toBe(false);
		expect(checkInput(ex({ answer: '42' }), '43')).toBe(false);
	});
});

describe('orderByWeakness', () => {
	const rng = () => 0.5; // constant: no tie-breaking noise

	function stats(over: Partial<Record<Domain, number>>): Record<Domain, { rating: number }> {
		return Object.fromEntries(
			DOMAINS.map((d) => [d, { rating: over[d] ?? BASE_RATING }])
		) as Record<Domain, { rating: number }>;
	}

	it('serves the lowest-rated domain first', () => {
		const ordered = orderByWeakness(
			['math', 'logic', 'general'],
			stats({ math: 900, general: 1000, logic: 1100 }),
			rng
		);
		expect(ordered).toEqual(['math', 'general', 'logic']);
	});

	it('does not mutate its input', () => {
		const input: Domain[] = ['logic', 'math'];
		orderByWeakness(input, stats({ math: 800 }), rng);
		expect(input).toEqual(['logic', 'math']);
	});
});

describe('buildSession', () => {
	it('domain mode returns only that domain, capped at n with no repeats', () => {
		const out = buildSession({ mode: 'domain', domain: 'math', n: 5 }, []);
		expect(out.length).toBeLessThanOrEqual(5);
		expect(out.every((e) => e.domain === 'math')).toBe(true);
		expect(new Set(out.map((e) => e.id)).size).toBe(out.length);
	});

	it('mixed mode yields a unique, capped set drawn from real packs', () => {
		const out = buildSession({ mode: 'all', n: 6 }, []);
		expect(out.length).toBeGreaterThan(0);
		expect(out.length).toBeLessThanOrEqual(6);
		expect(new Set(out.map((e) => e.id)).size).toBe(out.length);
	});
});
