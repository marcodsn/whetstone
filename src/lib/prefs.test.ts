import { describe, it, expect, beforeEach } from 'vitest';
import { DOMAINS } from './types';
import { loadSelectedDomains, saveSelectedDomains, selectedDomainsFromExport } from './prefs';

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

describe('domain selection prefs', () => {
	beforeEach(() => installLocalStorage());

	it('defaults to all domains when nothing is stored', () => {
		expect(loadSelectedDomains()).toEqual([...DOMAINS]);
	});

	it('round-trips a saved selection in canonical order', () => {
		saveSelectedDomains(['logic', 'math']);
		expect(loadSelectedDomains()).toEqual(DOMAINS.filter((d) => d === 'math' || d === 'logic'));
	});

	it('drops unknown ids and falls back to all when the selection is empty', () => {
		saveSelectedDomains(['astrology' as never]);
		expect(loadSelectedDomains()).toEqual([...DOMAINS]);
	});

	it('extracts selectedDomains from an export envelope, ignoring legacy arrays', () => {
		expect(selectedDomainsFromExport([{ exerciseId: 'a' }])).toBeNull();
		expect(selectedDomainsFromExport({ attempts: [] })).toBeNull();
		expect(selectedDomainsFromExport({ selectedDomains: ['math', 'nope'] })).toEqual(['math']);
	});
});
