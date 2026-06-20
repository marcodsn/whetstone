<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';

	let { children } = $props();

	let theme = $state<'light' | 'dark'>('light');

	$effect(() => {
		theme = (document.documentElement.dataset.theme as 'light' | 'dark') ?? 'light';
	});

	function toggleTheme() {
		theme = theme === 'dark' ? 'light' : 'dark';
		document.documentElement.dataset.theme = theme;
		try {
			localStorage.setItem('scope.theme.v1', theme);
		} catch {
			/* private mode */
		}
	}

	const links = [
		{ href: '/', label: 'Observatory' },
		{ href: '/library', label: 'Library' }
	];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>SCOPE</title>
	<meta name="description" content="Self-Cognitive Observation and Performance Evaluation" />
</svelte:head>

<div class="shell">
	<header class="site-header">
		<a href="/" class="wordmark">SCOPE</a>
		<nav class="site-nav">
			{#each links as l}
				<a href={l.href} aria-current={page.url.pathname === l.href ? 'page' : undefined}>
					{l.label}
				</a>
			{/each}
			<button class="theme-toggle" onclick={toggleTheme} title="Toggle theme" aria-label="Toggle theme">
				{theme === 'dark' ? '○' : '●'}
			</button>
		</nav>
	</header>

	{@render children()}
</div>

<style>
	.theme-toggle {
		background: none;
		border: none;
		cursor: pointer;
		font-size: var(--text-xs);
		color: var(--color-text-muted);
		padding: 0 var(--space-1);
		transition: color var(--transition-fast);
	}

	.theme-toggle:hover {
		color: var(--color-text);
	}
</style>
