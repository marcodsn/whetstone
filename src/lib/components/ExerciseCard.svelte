<script lang="ts">
	import type { Exercise } from '$lib/types';
	import { DOMAIN_LABELS } from '$lib/types';
	import { checkInput } from '$lib/session';
	import Rich from './Rich.svelte';
	import Dots from './Dots.svelte';

	let {
		exercise,
		onresult,
		onnext
	}: {
		exercise: Exercise;
		onresult: (correct: boolean) => void;
		onnext: () => void;
	} = $props();

	let phase: 'answering' | 'revealed' | 'grading' = $state('answering');
	let selected: number | null = $state(null);
	let typed = $state('');
	let correct = $state(false);
	let inputEl: HTMLInputElement | undefined = $state();

	// reset when the exercise changes
	$effect(() => {
		void exercise.id;
		phase = 'answering';
		selected = null;
		typed = '';
		correct = false;
		queueMicrotask(() => inputEl?.focus());
	});

	let shuffledChoices = $derived.by(() => {
		void exercise.id;
		const c = [...(exercise.choices ?? [])];
		for (let i = c.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[c[i], c[j]] = [c[j], c[i]];
		}
		return c;
	});

	function grade(isCorrect: boolean) {
		correct = isCorrect;
		phase = 'revealed';
		onresult(isCorrect);
	}

	function submit() {
		if (phase !== 'answering') return;
		if (exercise.type === 'choice') {
			if (selected === null) return;
			grade(shuffledChoices[selected] === exercise.answer);
		} else if (exercise.type === 'input') {
			if (!typed.trim()) return;
			grade(checkInput(exercise, typed));
		} else {
			phase = 'grading'; // self: reveal answer, then self-grade
		}
	}

	function onkeydown(e: KeyboardEvent) {
		if (e.metaKey || e.ctrlKey || e.altKey) return;
		const inInput = document.activeElement === inputEl;

		if (e.key === 'Enter') {
			e.preventDefault();
			if (phase === 'revealed') onnext();
			else submit();
			return;
		}
		if (inInput) return;

		if (phase === 'answering' && exercise.type === 'choice') {
			const n = parseInt(e.key, 10);
			if (n >= 1 && n <= shuffledChoices.length) {
				selected = n - 1;
				e.preventDefault();
			}
		} else if (phase === 'grading') {
			if (e.key.toLowerCase() === 'g') grade(true);
			if (e.key.toLowerCase() === 'm') grade(false);
		}
	}
</script>

<svelte:window {onkeydown} />

<div class="card">
	<div class="card-meta">
		<span class="overline">{DOMAIN_LABELS[exercise.domain]}</span>
		<Dots value={exercise.difficulty} />
	</div>

	<div class="prompt prose"><Rich text={exercise.prompt} /></div>

	{#if exercise.code}
		<pre class="codeblock"><code>{exercise.code.src}</code></pre>
	{/if}

	{#if exercise.type === 'choice'}
		<ol class="choices">
			{#each shuffledChoices as choice, i}
				<li>
					<button
						class="choice"
						class:selected={selected === i && phase === 'answering'}
						class:is-correct={phase === 'revealed' && choice === exercise.answer}
						class:is-wrong={phase === 'revealed' && selected === i && choice !== exercise.answer}
						disabled={phase === 'revealed'}
						onclick={() => {
							selected = i;
							if (phase === 'answering') submit();
						}}
					>
						<span class="choice-key num">{i + 1}</span>
						<span class="choice-text"><Rich text={choice} /></span>
					</button>
				</li>
			{/each}
		</ol>
	{:else if exercise.type === 'input'}
		<div class="input-row">
			<input
				bind:this={inputEl}
				bind:value={typed}
				disabled={phase !== 'answering'}
				placeholder="Your answer…"
				autocomplete="off"
				autocapitalize="off"
				spellcheck="false"
			/>
			{#if phase === 'answering'}
				<button class="btn" onclick={submit}>Submit</button>
			{/if}
		</div>
	{:else if phase === 'answering'}
		<p class="self-hint muted">
			Work it out — on paper or in your head — then reveal the answer and grade yourself.
		</p>
		<button class="btn" onclick={submit}>Reveal answer</button>
	{/if}

	{#if phase === 'grading'}
		<div class="reveal">
			<div class="reveal-answer prose"><Rich text={exercise.answer} /></div>
			<div class="grade-row">
				<button class="btn" onclick={() => grade(true)}>Got it <kbd class="key">G</kbd></button>
				<button class="btn" onclick={() => grade(false)}>Missed it <kbd class="key">M</kbd></button>
			</div>
		</div>
	{/if}

	{#if phase === 'revealed'}
		<div class="verdict" class:ok={correct} class:ko={!correct}>
			<span class="verdict-mark">{correct ? '✓' : '✗'}</span>
			<div class="verdict-body">
				<p class="verdict-line">
					{correct ? 'Correct.' : 'Not quite.'}
					{#if !correct && exercise.type !== 'self'}
						<span class="muted">Answer:</span> <Rich text={exercise.answer} />
					{/if}
				</p>
				{#if exercise.explanation}
					<p class="explanation prose"><Rich text={exercise.explanation} /></p>
				{/if}
			</div>
		</div>
		<div class="next-row">
			<button class="btn btn-primary" onclick={onnext}>Continue <kbd class="key">↵</kbd></button>
		</div>
	{/if}
</div>

<style>
	.card {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-bg);
		box-shadow: var(--shadow-xs);
		padding: var(--space-8);
	}

	@media (max-width: 640px) {
		.card {
			padding: var(--space-5);
		}
	}

	.card-meta {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--space-4);
		margin-bottom: var(--space-5);
	}

	.prompt {
		font-family: var(--font-heading);
		font-size: var(--text-xl);
		line-height: var(--leading-snug);
		margin-bottom: var(--space-6);
	}

	.choices {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.choice {
		display: flex;
		align-items: baseline;
		gap: var(--space-3);
		width: 100%;
		text-align: left;
		font-family: var(--font-prose);
		font-size: var(--text-md);
		line-height: var(--leading-snug);
		color: var(--color-text);
		background: transparent;
		border: 1px solid var(--color-border-light);
		border-radius: var(--radius-md);
		padding: var(--space-3) var(--space-4);
		cursor: pointer;
		transition:
			background var(--transition-fast),
			border-color var(--transition-fast);
	}

	.choice:hover:not(:disabled) {
		background: var(--color-surface);
		border-color: var(--color-text-subtle);
	}

	.choice.selected {
		border-color: var(--color-text);
	}

	.choice:disabled {
		cursor: default;
		opacity: 0.7;
	}

	.choice.is-correct {
		opacity: 1;
		border-color: var(--color-correct);
		background: var(--color-correct-bg);
	}

	.choice.is-wrong {
		opacity: 1;
		border-color: var(--color-wrong);
		background: var(--color-wrong-bg);
	}

	.choice-key {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		color: var(--color-text-subtle);
		min-width: 1em;
	}

	.input-row {
		display: flex;
		gap: var(--space-3);
	}

	.input-row input {
		flex: 1;
		font-family: var(--font-mono);
		font-size: var(--text-base);
		color: var(--color-text);
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: var(--space-2) var(--space-4);
		outline: none;
		transition: border-color var(--transition-fast);
	}

	.input-row input:focus {
		border-color: var(--color-text-muted);
	}

	.self-hint {
		font-size: var(--text-sm);
		margin-bottom: var(--space-4);
	}

	.reveal {
		margin-top: var(--space-6);
		border-top: 1px solid var(--color-border-light);
		padding-top: var(--space-5);
	}

	.reveal-answer {
		font-size: var(--text-md);
		margin-bottom: var(--space-5);
	}

	.grade-row {
		display: flex;
		gap: var(--space-3);
	}

	.verdict {
		display: flex;
		gap: var(--space-4);
		margin-top: var(--space-6);
		border-radius: var(--radius-md);
		padding: var(--space-4) var(--space-5);
	}

	.verdict.ok {
		background: var(--color-correct-bg);
	}

	.verdict.ko {
		background: var(--color-wrong-bg);
	}

	.verdict-mark {
		font-family: var(--font-heading);
		font-size: var(--text-xl);
		line-height: 1.3;
	}

	.ok .verdict-mark {
		color: var(--color-correct);
	}

	.ko .verdict-mark {
		color: var(--color-wrong);
	}

	.verdict-line {
		font-weight: 500;
	}

	.explanation {
		font-size: var(--text-base);
		color: var(--color-text-secondary);
		margin-top: var(--space-2);
	}

	.next-row {
		display: flex;
		justify-content: flex-end;
		margin-top: var(--space-5);
	}
</style>
