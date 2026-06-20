<script lang="ts">
	import { renderRich } from '$lib/rich';

	let { text }: { text: string } = $props();
</script>

<!-- eslint-disable-next-line svelte/no-at-html-tags — exercise content is local/trusted and escaped by renderRich -->
<span>{@html renderRich(text)}</span>
