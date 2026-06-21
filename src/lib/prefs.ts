import type { Domain } from '$lib/types';
import { DOMAINS } from '$lib/types';

// Which domains the user wants to be tested on in daily / mixed sessions.
// Kept separate from the attempt log (whetstone.attempts.v1); this is a small
// preferences blob the user can change at any time.
const PREFS_KEY = 'whetstone.prefs.v1';

interface Prefs {
	selectedDomains: Domain[];
}

/** Keep only ids that still exist, in canonical DOMAINS order. */
function sanitize(ds: unknown): Domain[] {
	if (!Array.isArray(ds)) return [];
	const wanted = new Set(ds.filter((d): d is string => typeof d === 'string'));
	return DOMAINS.filter((d) => wanted.has(d));
}

/**
 * The domains selected for sessions. Defaults to all domains (a fresh user is
 * tested on everything); an empty stored selection also falls back to all, since
 * a session with no domains is useless.
 */
export function loadSelectedDomains(): Domain[] {
	try {
		const raw = localStorage.getItem(PREFS_KEY);
		if (!raw) return [...DOMAINS];
		const prefs = JSON.parse(raw) as Partial<Prefs>;
		const selected = sanitize(prefs.selectedDomains);
		return selected.length ? selected : [...DOMAINS];
	} catch {
		return [...DOMAINS];
	}
}

export function saveSelectedDomains(domains: Domain[]): void {
	const prefs: Prefs = { selectedDomains: sanitize(domains) };
	localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

/**
 * Pull a selected-domains list out of a parsed Whetstone export, if it carries one.
 * Legacy exports (a bare attempt array) have no preferences — returns null so
 * the caller leaves the local selection untouched.
 */
export function selectedDomainsFromExport(parsed: unknown): Domain[] | null {
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
	const obj = parsed as Record<string, unknown>;
	if (!('selectedDomains' in obj)) return null;
	return sanitize(obj.selectedDomains);
}
