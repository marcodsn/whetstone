<script lang="ts">
	import { DOMAINS, DOMAIN_LABELS } from '$lib/types';
	import type { Attempt } from '$lib/types';
	import { exercises, byDomain } from '$lib/exercises';
	import { loadAttempts, computeStats, currentStreak, clearAttempts, exportAttempts, BASE_RATING } from '$lib/scoring';
	import Sparkline from '$lib/components/Sparkline.svelte';

	let attempts: Attempt[] = $state(loadAttempts());
	let stats = $derived(computeStats(attempts));
	let streak = $derived(currentStreak(attempts));
	let totalAttempts = $derived(attempts.length);
	let attemptedIds = $derived(new Set(attempts.map((a) => a.exerciseId)));

	function ratingDelta(history: number[]): number {
		if (history.length < 2) return 0;
		const recent = history.slice(-11); // last 10 attempts
		return recent[recent.length - 1] - recent[0];
	}

	function doExport() {
		const blob = new Blob([exportAttempts()], { type: 'application/json' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = `scope-attempts-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		URL.revokeObjectURL(a.href);
	}

	function doReset() {
		if (confirm('Erase all attempt history? This cannot be undone (consider exporting first).')) {
			clearAttempts();
			attempts = loadAttempts();
		}
	}
</script>

<section class="intro">
	<p class="overline">Self-Cognitive Observation and Performance Evaluation</p>
	<h1 class="heading title">The instrument is pointed at you.</h1>
	<p class="lede">
		{exercises.length} exercises across {DOMAINS.length} domains.
		{#if totalAttempts > 0}
			You have logged <span class="num">{totalAttempts}</span> attempts{streak > 1
				? ` and are on a ${streak}-day streak`
				: ''}.
		{:else}
			No observations recorded yet — establish your baseline.
		{/if}
	</p>

	<div class="cta-row">
		<a class="btn btn-primary" href="/session?mode=daily&n=10">Begin today's session</a>
		<a class="btn" href="/session?mode=all&n=5">Quick five</a>
	</div>
</section>

<section class="domains">
	<h2 class="overline section-label">Domains</h2>
	<table class="domain-table">
		<thead>
			<tr>
				<th>Domain</th>
				<th class="right">Rating</th>
				<th class="right">Trend</th>
				<th class="right">Accuracy</th>
				<th class="right">Seen</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			{#each DOMAINS as d}
				{@const s = stats[d]}
				{@const delta = ratingDelta(s.history)}
				{@const pool = byDomain(d)}
				{@const seen = pool.filter((e) => attemptedIds.has(e.id)).length}
				<tr>
					<td class="domain-name">{DOMAIN_LABELS[d]}</td>
					<td class="right num rating">
						{Math.round(s.rating)}
						{#if s.attempts > 0 && Math.abs(delta) >= 1}
							<span class="delta num" class:delta-up={delta > 0} class:delta-down={delta < 0}>
								{delta > 0 ? '+' : ''}{Math.round(delta)}
							</span>
						{/if}
					</td>
					<td class="right">
						<div class="spark-cell">
							{#if s.history.length >= 3}
								<Sparkline values={s.history.slice(-30)} width={96} height={24} />
							{:else}
								<span class="muted">—</span>
							{/if}
						</div>
					</td>
					<td class="right num">
						{s.attempts ? `${Math.round(s.accuracy * 100)}%` : '—'}
					</td>
					<td class="right num muted">{seen}/{pool.length}</td>
					<td class="right">
						<a class="btn btn-sm" href="/session?mode=domain&domain={d}&n=8">Train</a>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
	<p class="rating-note muted">
		Ratings start at {BASE_RATING} and move like Elo: harder exercises risk less on a miss and pay
		more on a hit. The trend column shows your last 30 graded attempts.
	</p>
</section>

<footer class="data-row">
	<button class="link-btn" onclick={doExport}>Export history</button>
	<span class="sep">·</span>
	<button class="link-btn" onclick={doReset}>Reset history</button>
</footer>

<style>
	.intro {
		margin-bottom: var(--space-12);
	}

	.title {
		font-size: var(--text-3xl);
		margin: var(--space-3) 0 var(--space-4);
	}

	.lede {
		font-family: var(--font-prose);
		font-size: var(--text-md);
		color: var(--color-text-secondary);
		max-width: 50ch;
		margin-bottom: var(--space-6);
	}

	.cta-row {
		display: flex;
		gap: var(--space-3);
		flex-wrap: wrap;
	}

	.section-label {
		margin-bottom: var(--space-4);
	}

	.domain-table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}

	.domain-table th {
		font-size: var(--text-xs);
		font-weight: 500;
		letter-spacing: 0.06em;
		color: var(--color-text-muted);
		text-align: left;
		padding: var(--space-2) var(--space-3);
		border-bottom: 1px solid var(--color-border);
	}

	.domain-table td {
		padding: var(--space-3);
		border-bottom: 1px solid var(--color-border-light);
		vertical-align: middle;
	}

	.domain-table tbody tr {
		transition: background var(--transition-fast);
	}

	.domain-table tbody tr:hover {
		background: var(--color-surface);
	}

	.right {
		text-align: right;
	}

	.domain-name {
		font-family: var(--font-heading);
		font-size: var(--text-md);
	}

	.rating {
		font-weight: 500;
	}

	.delta {
		font-size: var(--text-xs);
		margin-left: var(--space-1);
	}

	.spark-cell {
		display: flex;
		justify-content: flex-end;
		color: var(--color-text-muted);
	}

	.btn-sm {
		padding: var(--space-1) var(--space-3);
		font-size: var(--text-xs);
	}

	.rating-note {
		font-size: var(--text-xs);
		margin-top: var(--space-4);
		max-width: 60ch;
	}

	.data-row {
		margin-top: var(--space-16);
		padding-top: var(--space-4);
		border-top: 1px solid var(--color-border-light);
		font-size: var(--text-xs);
		color: var(--color-text-muted);
	}

	.link-btn {
		background: none;
		border: none;
		cursor: pointer;
		font-size: var(--text-xs);
		color: var(--color-text-muted);
		text-decoration: underline;
		text-decoration-color: var(--color-text-subtle);
		text-underline-offset: 0.15em;
		padding: 0;
	}

	.link-btn:hover {
		color: var(--color-text);
	}

	.sep {
		margin: 0 var(--space-2);
		color: var(--color-text-subtle);
	}

	@media (max-width: 640px) {
		.domain-table th:nth-child(3),
		.domain-table td:nth-child(3),
		.domain-table th:nth-child(5),
		.domain-table td:nth-child(5) {
			display: none;
		}
	}
</style>
