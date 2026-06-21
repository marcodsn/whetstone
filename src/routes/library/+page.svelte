<script lang="ts">
	import { DOMAINS, DOMAIN_LABELS } from '$lib/types';
	import type { Domain } from '$lib/types';
	import { exercises } from '$lib/exercises';
	import { loadAttempts } from '$lib/scoring';
	import Dots from '$lib/components/Dots.svelte';

	let filter: Domain | 'all' = $state('all');

	const attempts = loadAttempts();
	const lastResult = new Map<string, boolean>();
	for (const a of [...attempts].sort((x, y) => x.ts - y.ts)) {
		lastResult.set(a.exerciseId, a.correct);
	}

	let shown = $derived(
		filter === 'all' ? exercises : exercises.filter((e) => e.domain === filter)
	);

	const typeLabel = { choice: 'multiple choice', input: 'free answer', self: 'self-graded' };
</script>

<div class="page">
	<header class="post-header">
		<h1>Library</h1>
		<p class="post-subtitle">
			Every item on the bench — prompts only, so the library never spoils a session.
		</p>
	</header>

	<div class="article-body">
		<div class="filters">
			<button class="chip" class:active={filter === 'all'} onclick={() => (filter = 'all')}>
				All <span class="num">({exercises.length})</span>
			</button>
			{#each DOMAINS as d}
				<button class="chip" class:active={filter === d} onclick={() => (filter = d)}>
					{DOMAIN_LABELS[d]}
					<span class="num">({exercises.filter((e) => e.domain === d).length})</span>
				</button>
			{/each}
		</div>

		<ul class="items">
			{#each shown as ex (ex.id)}
				<li>
					<span
						class="status"
						title={lastResult.has(ex.id)
							? lastResult.get(ex.id)
								? 'last attempt correct'
								: 'last attempt wrong'
							: 'not attempted'}
					>
						{#if lastResult.has(ex.id)}
							<span class={lastResult.get(ex.id) ? 'ok' : 'ko'}
								>{lastResult.get(ex.id) ? '✓' : '✗'}</span
							>
						{:else}
							<span class="muted">·</span>
						{/if}
					</span>
					<span class="item-prompt">{ex.prompt.replace(/\$\$?/g, '').slice(0, 90)}</span>
					<span class="item-meta muted">{typeLabel[ex.type]}</span>
					<Dots value={ex.difficulty} />
				</li>
			{/each}
		</ul>

		<p class="lib-note muted">
			New packs land in <code>src/lib/exercises/packs/</code>, one JSON file each.
		</p>
	</div>
</div>

<style>
	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin-bottom: var(--space-6);
	}

	.chip {
		font-family: var(--font-ui);
		font-size: var(--text-xs);
		color: var(--color-text-muted);
		background: transparent;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-full);
		padding: var(--space-1) var(--space-3);
		cursor: pointer;
		transition:
			color var(--transition-fast),
			border-color var(--transition-fast),
			background var(--transition-fast);
	}

	.chip:hover {
		color: var(--color-text);
		border-color: var(--color-text-subtle);
	}

	.chip.active {
		color: var(--color-bg);
		background: var(--color-text);
		border-color: var(--color-text);
	}

	.items {
		list-style: none;
		display: flex;
		flex-direction: column;
		padding: 0;
		font-family: var(--font-ui);
	}

	.items li {
		display: flex;
		align-items: baseline;
		gap: var(--space-3);
		padding: var(--space-2) 0;
		border-bottom: 1px solid var(--color-border-light);
		font-size: var(--text-sm);
	}

	.items li:last-child {
		border-bottom: none;
	}

	.status {
		width: 1em;
		text-align: center;
	}

	.ok {
		color: var(--color-correct);
	}

	.ko {
		color: var(--color-wrong);
	}

	.item-prompt {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.item-meta {
		font-size: var(--text-xs);
		white-space: nowrap;
	}

	.lib-note {
		font-size: var(--text-xs);
		margin-top: var(--space-8);
	}

	.lib-note code {
		font-family: var(--font-mono);
		font-size: 0.9em;
		background: var(--color-surface);
		padding: 0.1em 0.3em;
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border-light);
	}
</style>
