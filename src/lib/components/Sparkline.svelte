<script lang="ts">
	let {
		values,
		width = 120,
		height = 28
	}: { values: number[]; width?: number; height?: number } = $props();

	const pad = 2;

	let path = $derived.by(() => {
		if (values.length < 2) return '';
		const min = Math.min(...values);
		const max = Math.max(...values);
		const span = max - min || 1;
		const step = (width - pad * 2) / (values.length - 1);
		return values
			.map((v, i) => {
				const x = pad + i * step;
				const y = height - pad - ((v - min) / span) * (height - pad * 2);
				return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
			})
			.join(' ');
	});

	let trendUp = $derived(values.length >= 2 && values[values.length - 1] >= values[0]);
</script>

{#if values.length >= 2}
	<svg {width} {height} viewBox="0 0 {width} {height}" class="spark" class:up={trendUp} role="img" aria-label="rating history">
		<path d={path} fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
		{#if values.length > 0}
			{@const min = Math.min(...values)}
			{@const max = Math.max(...values)}
			{@const span = max - min || 1}
			{@const lastY = height - pad - ((values[values.length - 1] - min) / span) * (height - pad * 2)}
			<circle cx={width - pad} cy={lastY} r="2" fill="currentColor" />
		{/if}
	</svg>
{:else}
	<span class="spark-empty">—</span>
{/if}

<style>
	.spark {
		display: block;
		color: var(--color-text-muted);
	}

	.spark.up {
		color: var(--color-text-secondary);
	}

	.spark-empty {
		color: var(--color-text-subtle);
	}
</style>
