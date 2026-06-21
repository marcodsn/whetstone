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
				console.warn(`[whetstone] duplicate exercise id "${ex.id}" in ${path} — skipped`);
				continue;
			}
			if (!DOMAINS.includes(ex.domain)) {
				console.warn(`[whetstone] unknown domain "${ex.domain}" for ${ex.id} — skipped`);
				continue;
			}
			if (ex.type === 'choice' && !(ex.choices ?? []).includes(ex.answer)) {
				console.warn(`[whetstone] answer not among choices for ${ex.id} — skipped`);
				continue;
			}
			// Generated exercises stay tagged "unreviewed" until a human (or the
			// monthly audit) verifies the answer and drops the tag. Keep them out
			// of builds so unverified items never affect scores; show them in dev
			// so they can be eyeballed. See prompts/claude-update.md.
			if ((ex.tags ?? []).includes('unreviewed') && !import.meta.env.DEV) {
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
