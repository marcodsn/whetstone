import type { Exercise, ExercisePack, Domain } from '$lib/types';
import { DOMAINS } from '$lib/types';

const modules = import.meta.glob<{ default: ExercisePack }>('./packs/*.json', { eager: true });

function load(): Exercise[] {
	const all: Exercise[] = [];
	const seen = new Set<string>();
	for (const path of Object.keys(modules).sort()) {
		const pack = modules[path].default;
		for (const ex of pack.exercises) {
			if (seen.has(ex.id)) {
				console.warn(`[scope] duplicate exercise id "${ex.id}" in ${path} — skipped`);
				continue;
			}
			if (!DOMAINS.includes(ex.domain)) {
				console.warn(`[scope] unknown domain "${ex.domain}" for ${ex.id} — skipped`);
				continue;
			}
			if (ex.type === 'choice' && !(ex.choices ?? []).includes(ex.answer)) {
				console.warn(`[scope] answer not among choices for ${ex.id} — skipped`);
				continue;
			}
			seen.add(ex.id);
			all.push(ex);
		}
	}
	return all;
}

export const exercises: Exercise[] = load();

export const byId = new Map(exercises.map((e) => [e.id, e]));

export function byDomain(domain: Domain): Exercise[] {
	return exercises.filter((e) => e.domain === domain);
}
