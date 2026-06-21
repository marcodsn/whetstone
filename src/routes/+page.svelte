<script lang="ts">
	import { DOMAINS, DOMAIN_LABELS } from '$lib/types';
	import type { Attempt, Domain } from '$lib/types';
	import { exercises, byDomain } from '$lib/exercises';
	import { loadAttempts, computeStats, currentStreak, clearAttempts, exportData, importAttempts, BASE_RATING } from '$lib/scoring';
	import { loadSelectedDomains, saveSelectedDomains, selectedDomainsFromExport } from '$lib/prefs';
	import Sparkline from '$lib/components/Sparkline.svelte';

	let attempts: Attempt[] = $state(loadAttempts());
	let stats = $derived(computeStats(attempts));
	let streak = $derived(currentStreak(attempts));
	let totalAttempts = $derived(attempts.length);
	let attemptedIds = $derived(new Set(attempts.map((a) => a.exerciseId)));

	// Domains the user has elected to be tested on in daily / mixed sessions.
	let selected: Set<Domain> = $state(new Set(loadSelectedDomains()));
	let selectedCount = $derived(selected.size);

	function toggleDomain(d: Domain) {
		const next = new Set(selected);
		if (next.has(d)) {
			if (next.size === 1) return; // keep at least one — an empty session is useless
			next.delete(d);
		} else {
			next.add(d);
		}
		selected = next;
		saveSelectedDomains([...next]);
	}

	function ratingDelta(history: number[]): number {
		if (history.length < 2) return 0;
		const recent = history.slice(-11); // last 10 attempts
		return recent[recent.length - 1] - recent[0];
	}

	function doExport() {
		const blob = new Blob([exportData([...selected])], { type: 'application/json' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = `whetstone-attempts-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		URL.revokeObjectURL(a.href);
	}

	function doReset() {
		if (confirm('Erase all attempt history? This cannot be undone (consider exporting first).')) {
			clearAttempts();
			attempts = loadAttempts();
		}
	}

	let fileInput: HTMLInputElement;

	function doImport() {
		fileInput.click();
	}

	async function onFile(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		input.value = ''; // let the same file be picked again later
		if (!file) return;
		try {
			const text = await file.text();
			const { added, total } = importAttempts(text);
			attempts = loadAttempts();
			// Restore the domain selection if the export carried one (legacy bare-array
			// exports don't, in which case the local selection is left untouched).
			let domainNote = '';
			try {
				const fromExport = selectedDomainsFromExport(JSON.parse(text));
				if (fromExport && fromExport.length) {
					selected = new Set(fromExport);
					saveSelectedDomains(fromExport);
					domainNote = ` Domain selection restored (${fromExport.length}).`;
				}
			} catch {
				// already imported the attempts; a prefs hiccup shouldn't fail the import
			}
			alert(
				(added === 0
					? `Already up to date — no new attempts imported (${total} total).`
					: `Imported ${added} attempt${added === 1 ? '' : 's'} (${total} total).`) + domainNote
			);
		} catch (err) {
			alert(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
		}
	}
</script>

<div class="page">
	<header class="post-header">
		<h1>Whetstone</h1>
		<p class="post-subtitle">
			A whetstone doesn't do the cutting — it just keeps the blade sharp through friction.
		</p>
		<div class="resource-links">
			<a class="resource-link primary" href="/session?mode=daily&n=10">Begin today's session</a>
			<a class="resource-link" href="/session?mode=all&n=5">Quick five</a>
		</div>
	</header>

	<div class="article-body">
		<p class="intro-text">
			{exercises.length} exercises across {DOMAINS.length} domains, with an Elo-style rating per
			domain so you can watch yourself sharpen — or rust.
			{#if totalAttempts > 0}
				You have logged <strong class="num">{totalAttempts}</strong> attempt{totalAttempts === 1
					? ''
					: 's'}{streak > 1 ? ` and are on a ${streak}-day streak` : ''}.
			{:else}
				No sessions yet — run one to establish your baseline.
			{/if}
		</p>

		<h2 class="section-label">Domains</h2>

		<table class="data-table domain-table">
			<thead>
				<tr>
					<th class="check-col" title="Include in daily &amp; mixed sessions">Test</th>
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
					<tr class:deselected={!selected.has(d)}>
						<td class="check-col">
							<input
								type="checkbox"
								class="domain-check"
								checked={selected.has(d)}
								onchange={() => toggleDomain(d)}
								aria-label="Include {DOMAIN_LABELS[d]} in daily and mixed sessions"
							/>
						</td>
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
			more on a hit. The trend column shows your last 30 graded attempts. Daily and mixed sessions
			draw only from the <strong>{selectedCount}</strong> checked domain{selectedCount === 1
				? ''
				: 's'}; “Train” always runs the domain you pick. Your selection rides along in exports.
		</p>

		<div class="data-row">
			<button class="link-btn" onclick={doExport}>Export history</button>
			<span class="sep">·</span>
			<button class="link-btn" onclick={doImport}>Import history</button>
			<span class="sep">·</span>
			<button class="link-btn" onclick={doReset}>Reset history</button>
			<input
				bind:this={fileInput}
				type="file"
				accept="application/json,.json"
				onchange={onFile}
				hidden
			/>
		</div>
	</div>
</div>

<style>
	.intro-text {
		max-width: 56ch;
	}

	.domain-table {
		margin-top: var(--space-2);
	}

	.check-col {
		width: 1px;
		white-space: nowrap;
		text-align: center;
	}

	.domain-check {
		cursor: pointer;
		accent-color: var(--color-text);
		width: 1rem;
		height: 1rem;
		vertical-align: middle;
	}

	.domain-table tbody tr.deselected .domain-name,
	.domain-table tbody tr.deselected .rating {
		color: var(--color-text-muted);
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

	.rating-note {
		font-size: var(--text-xs);
		margin-top: var(--space-4);
		max-width: 60ch;
		line-height: var(--leading-normal);
	}

	.data-row {
		margin-top: var(--space-12);
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
		/* hide Trend (4th) and Seen (6th); the leading checkbox is column 1 */
		.domain-table th:nth-child(4),
		.domain-table td:nth-child(4),
		.domain-table th:nth-child(6),
		.domain-table td:nth-child(6) {
			display: none;
		}
	}
</style>
