<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';

	let { children } = $props();

	let theme = $state<'light' | 'dark'>('light');
	let mounted = $state(false);

	$effect(() => {
		theme = (document.documentElement.dataset.theme as 'light' | 'dark') ?? 'light';
		mounted = true;
	});

	function toggleTheme() {
		theme = theme === 'dark' ? 'light' : 'dark';
		document.documentElement.dataset.theme = theme;
		try {
			localStorage.setItem('whetstone.theme.v1', theme);
		} catch {
			/* private mode */
		}
	}

	const links = [
		{ href: '/', label: 'Dashboard' },
		{ href: '/library', label: 'Library' }
	];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Whetstone</title>
	<meta
		name="description"
		content="A whetstone doesn't do the cutting — it just keeps the blade sharp through friction. Short mixed exercise sessions with an Elo rating per domain."
	/>
</svelte:head>

<nav>
	<div class="nav-inner">
		<a href="/" class="logo">Whetstone</a>
		<div class="nav-links">
			{#each links as l}
				<a href={l.href} aria-current={page.url.pathname === l.href ? 'page' : undefined}>
					{l.label}
				</a>
			{/each}
		</div>
	</div>
</nav>

<main>
	{@render children()}
</main>

<footer>
	<div class="footer-inner">
		<p>Marco De Santis &copy; {new Date().getFullYear()}</p>
		<p aria-hidden="true">&#8729;</p>
		<button
			type="button"
			class="theme-toggle"
			onclick={toggleTheme}
			aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
			title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
			aria-pressed={theme === 'dark'}
		>
			<span class="icon" class:ready={mounted} aria-hidden="true">
				{#if theme === 'dark'}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.6"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<circle cx="12" cy="12" r="4" />
						<path d="M12 2v2" />
						<path d="M12 20v2" />
						<path d="m4.93 4.93 1.41 1.41" />
						<path d="m17.66 17.66 1.41 1.41" />
						<path d="M2 12h2" />
						<path d="M20 12h2" />
						<path d="m4.93 19.07 1.41-1.41" />
						<path d="m17.66 6.34 1.41-1.41" />
					</svg>
				{:else}
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.6"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
					</svg>
				{/if}
			</span>
			<span class="label">{theme === 'dark' ? 'Light' : 'Dark'}</span>
		</button>
	</div>
</footer>

<style>
	/* ── Navbar ─────────────────────────────────────────────────── */

	nav {
		width: 100%;
		padding: var(--space-5) 0;
		margin-bottom: var(--space-10);
	}

	.nav-inner {
		display: flex;
		justify-content: space-between;
		align-items: center;
		max-width: var(--content-width);
		margin: 0 auto;
	}

	nav a {
		color: var(--color-text-muted);
		text-decoration: none;
		transition: color var(--transition-fast);
	}

	nav a:hover {
		color: var(--color-text);
	}

	.logo {
		font-family: var(--font-heading);
		font-weight: 600;
		font-size: var(--text-lg);
		letter-spacing: 0.02em;
		color: var(--color-text);
	}

	.nav-links {
		display: flex;
		align-items: center;
		gap: var(--space-6);
	}

	.nav-links a {
		font-size: var(--text-sm);
	}

	.nav-links a:hover,
	.nav-links a[aria-current='page'] {
		color: var(--color-text);
	}

	/* ── Main ───────────────────────────────────────────────────── */

	main {
		flex: 1;
		width: 100%;
	}

	/* ── Footer ─────────────────────────────────────────────────── */

	footer {
		margin-top: var(--space-16);
		padding: var(--space-8) 0 var(--space-6);
	}

	.footer-inner {
		max-width: var(--content-width);
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-4);
	}

	footer p {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
		line-height: var(--leading-snug);
	}

	.theme-toggle {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-1) 0;
		background: transparent;
		border: none;
		color: var(--color-text-muted);
		font-family: var(--font-ui);
		font-size: var(--text-xs);
		letter-spacing: 0.02em;
		cursor: pointer;
		transition: color var(--transition-fast);
	}

	.theme-toggle:hover {
		color: var(--color-text);
	}

	.icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 14px;
		height: 14px;
		opacity: 0;
	}

	.icon.ready {
		opacity: 1;
	}

	.label {
		line-height: 1;
	}

	@media (max-width: 720px) {
		nav {
			padding: var(--space-3) 0;
			margin-bottom: var(--space-6);
		}

		.nav-links {
			gap: var(--space-4);
		}

		footer {
			margin-top: var(--space-12);
		}
	}
</style>
