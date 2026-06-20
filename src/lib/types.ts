export const DOMAINS = ['math', 'logic', 'code', 'japanese', 'latex', 'general'] as const;
export type Domain = (typeof DOMAINS)[number];

export const DOMAIN_LABELS: Record<Domain, string> = {
	math: 'Mathematics',
	logic: 'Logic',
	code: 'Code',
	japanese: 'Japanese',
	latex: 'LaTeX',
	general: 'General'
};

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
