/**
 * The single source of truth for domains. To add one:
 *   1. add an entry here (`id` is the stable key stored in the attempt log),
 *   2. write `prompts/domains/<id>.md` so the generator knows how to write for it,
 *   3. drop at least one pack with exercises in `src/lib/exercises/packs/`.
 * Everything else (labels, selection UI, scoring) derives from this list.
 */
export const DOMAIN_LIST = [
	{ id: 'math', label: 'Mathematics' },
	{ id: 'logic', label: 'Logic' },
	{ id: 'code', label: 'Code' },
	{ id: 'japanese', label: 'Japanese' },
	{ id: 'latex', label: 'LaTeX' },
	{ id: 'general', label: 'General' }
] as const;

export type Domain = (typeof DOMAIN_LIST)[number]['id'];

export const DOMAINS: readonly Domain[] = DOMAIN_LIST.map((d) => d.id);

export const DOMAIN_LABELS = Object.fromEntries(
	DOMAIN_LIST.map((d) => [d.id, d.label])
) as Record<Domain, string>;

/**
 * choice — pick one of `choices`; `answer` must equal the correct choice verbatim.
 * input  — free text; `answer` is canonical, `accepted` lists tolerated variants.
 * self   — work it out (on paper, in your head), reveal the answer, grade yourself.
 */
export type ExerciseType = 'choice' | 'input' | 'self';

export interface Exercise {
	id: string;
	domain: Domain;
	type: ExerciseType;
	/** 1 (trivial) … 5 (hard) */
	difficulty: 1 | 2 | 3 | 4 | 5;
	/** Supports $inline$ and $$display$$ KaTeX, plus `inline code`. */
	prompt: string;
	code?: { lang: string; src: string };
	choices?: string[];
	answer: string;
	accepted?: string[];
	explanation?: string;
	tags?: string[];
}

export interface ExercisePack {
	pack: string;
	exercises: Exercise[];
}

export interface Attempt {
	exerciseId: string;
	domain: Domain;
	difficulty: number;
	correct: boolean;
	/** epoch ms */
	ts: number;
}
