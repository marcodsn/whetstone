<script lang="ts">
	let { value, max = 5 }: { value: number; max?: number } = $props();
</script>

<span class="dots" title="difficulty {value}/{max}" aria-label="difficulty {value} of {max}">
	{#each Array(max) as _, i}<span class="dot" class:filled={i < value}>●</span>{/each}
</span>

<style>
	.dots {
		letter-spacing: 0.18em;
		font-size: 0.55rem;
		vertical-align: 0.15em;
		white-space: nowrap;
	}

	.dot {
		color: var(--color-border);
	}

	.dot.filled {
		color: var(--color-text-secondary);
	}
</style>
