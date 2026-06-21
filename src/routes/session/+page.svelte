<script lang="ts">
	import { page } from '$app/state';
	import type { Attempt, Domain, Exercise } from '$lib/types';
	import { DOMAINS, DOMAIN_LABELS } from '$lib/types';
	import { buildSession, type SessionSpec } from '$lib/session';
	import { loadAttempts, saveAttempt, computeStats } from '$lib/scoring';
	import { loadSelectedDomains } from '$lib/prefs';
	import ExerciseCard from '$lib/components/ExerciseCard.svelte';

	function specFromUrl(): SessionSpec {
		const q = page.url.searchParams;
		const mode = (q.get('mode') ?? 'daily') as SessionSpec['mode'];
		const domain = q.get('domain') as Domain | null;
		const n = Math.max(1, Math.min(30, parseInt(q.get('n') ?? '10', 10) || 10));
		return {
			mode,
			domain: domain && DOMAINS.includes(domain) ? domain : undefined,
			n
		};
	}

	const spec = specFromUrl();
	const startStats = computeStats(loadAttempts());
	const session: Exercise[] = buildSession(spec, loadAttempts(), loadSelectedDomains());

	let index = $state(0);
	let results: { exercise: Exercise; correct: boolean }[] = $state([]);
	let done = $derived(index >= session.length);
	let current = $derived(session[index]);

	let endStats = $derived(done ? computeStats(loadAttempts()) : null);
	let score = $derived(results.filter((r) => r.correct).length);

	function onresult(correct: boolean) {
		const ex = session[index];
		const attempt: Attempt = {
			exerciseId: ex.id,
			domain: ex.domain,
			difficulty: ex.difficulty,
			correct,
			ts: Date.now()
		};
		saveAttempt(attempt);
		results.push({ exercise: ex, correct });
	}

	function onnext() {
		index += 1;
	}

	let sessionTitle = $derived(
		spec.mode === 'domain' && spec.domain
			? `${DOMAIN_LABELS[spec.domain]} session`
			: spec.mode === 'daily'
				? "Today's session"
				: 'Mixed session'
	);

	let touchedDomains = $derived([...new Set(results.map((r) => r.exercise.domain))]);

	// Choice exercises bind number keys 1..N; show the honest range, not a fixed 1–4.
	let choiceCount = $derived(current?.type === 'choice' ? (current.choices?.length ?? 0) : 0);

	// Any self-graded exercise means some of the rating movement is self-reported.
	let hasSelfGraded = $derived(results.some((r) => r.exercise.type === 'self'));

	function anotherRound() {
		// A daily session is date-seeded, so reloading would re-roll the very same
		// set. Send the user into a fresh mixed round instead; other modes reseed
		// on load, so a plain reload already gives new material.
		if (spec.mode === 'daily') location.href = `/session?mode=all&n=${session.length}`;
		else location.reload();
	}
</script>

<div class="page">
	{#if session.length === 0}
		<p class="muted">No exercises available for this selection.</p>
		<p><a href="/">← Back to the dashboard</a></p>
	{:else if !done}
		<div class="session-head">
			<span class="overline">{sessionTitle}</span>
			<span class="progress num">{index + 1} / {session.length}</span>
		</div>
		<div class="progress-rail" aria-hidden="true">
			<div class="progress-fill" style="width: {(index / session.length) * 100}%"></div>
		</div>

		<ExerciseCard exercise={current} {onresult} {onnext} />

		<p class="hints muted">
			{#if choiceCount > 0}<kbd class="key">1</kbd>–<kbd class="key">{choiceCount}</kbd> select ·
			{/if}<kbd class="key">↵</kbd> submit / continue
		</p>
	{:else}
		<section class="report">
			<header class="post-header">
				<p class="overline">Session report</p>
				<h1 class="report-score num">{score}<span class="of"> / {session.length}</span></h1>
				<p class="post-subtitle">
					{score === session.length
						? 'A clean sheet — the edge held.'
						: score >= session.length * 0.7
							? 'Solid. The misses below are tomorrow’s grindstone.'
							: 'Dull spots found — exactly what the stone is for.'}
				</p>
			</header>

			<div class="article-body">
				{#if endStats}
					<table class="data-table recap-ratings">
						<thead>
							<tr>
								<th>Domain</th>
								<th class="right">Rating</th>
								<th class="right">Δ</th>
							</tr>
						</thead>
						<tbody>
							{#each touchedDomains as d}
								{@const delta = Math.round(endStats[d].rating - startStats[d].rating)}
								<tr>
									<td>{DOMAIN_LABELS[d]}</td>
									<td class="right num">{Math.round(endStats[d].rating)}</td>
									<td class="right num" class:delta-up={delta > 0} class:delta-down={delta < 0}>
										{delta > 0 ? '+' : ''}{delta}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
					{#if hasSelfGraded}
						<p class="self-note muted">Self-graded items contribute self-reported ratings.</p>
					{/if}
				{/if}

				<ol class="recap">
					{#each results as r, i}
						<li>
							<span class="mark" class:ok={r.correct} class:ko={!r.correct}
								>{r.correct ? '✓' : '✗'}</span
							>
							<span class="recap-q num">{i + 1}.</span>
							<span class="recap-prompt">{r.exercise.prompt.replace(/\$\$?/g, '').slice(0, 80)}</span>
							<span class="recap-domain muted">{DOMAIN_LABELS[r.exercise.domain]}</span>
						</li>
					{/each}
				</ol>

				<div class="report-actions">
					<a class="btn btn-primary" href="/">Back to dashboard</a>
					<button class="btn" onclick={anotherRound}>Another round</button>
				</div>
			</div>
		</section>
	{/if}
</div>

<style>
	.session-head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: var(--space-2);
	}

	.progress {
		font-size: var(--text-sm);
		color: var(--color-text-muted);
	}

	.progress-rail {
		height: 2px;
		background: var(--color-border-light);
		border-radius: var(--radius-full);
		margin-bottom: var(--space-8);
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: var(--color-text-secondary);
		transition: width var(--transition-normal);
	}

	.hints {
		font-size: var(--text-xs);
		margin-top: var(--space-5);
		text-align: center;
	}

	/* ── Report ─────────────────────────────────────────────────── */

	.report .post-header {
		margin-bottom: var(--space-8);
		padding-bottom: var(--space-6);
	}

	.report-score {
		font-family: var(--font-heading);
		font-size: var(--text-3xl);
		font-weight: 500;
		line-height: var(--leading-tight);
		margin-bottom: var(--space-4);
		color: var(--color-text);
	}

	.report-score .of {
		color: var(--color-text-subtle);
		font-size: var(--text-xl);
	}

	.recap-ratings {
		width: auto;
		min-width: 280px;
		margin: 0 auto var(--space-8);
	}

	.self-note {
		font-size: var(--text-xs);
		margin: calc(-1 * var(--space-6)) 0 var(--space-8);
		text-align: center;
	}

	.recap {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		font-size: var(--text-sm);
		margin-bottom: var(--space-10);
		padding: 0;
		font-family: var(--font-ui);
	}

	.recap li {
		display: flex;
		gap: var(--space-3);
		align-items: baseline;
	}

	.mark.ok {
		color: var(--color-correct);
	}

	.mark.ko {
		color: var(--color-wrong);
	}

	.recap-q {
		color: var(--color-text-subtle);
	}

	.recap-prompt {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.recap-domain {
		font-size: var(--text-xs);
	}

	.report-actions {
		display: flex;
		gap: var(--space-3);
		justify-content: center;
	}
</style>
