import katex from 'katex';
import 'katex/dist/katex.min.css';

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

/**
 * Render exercise text to HTML: $$display$$ and $inline$ KaTeX, `inline code`,
 * everything else escaped. Intentionally tiny — not a markdown engine.
 */
export function renderRich(text: string): string {
	const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|`[^`\n]+?`)/g);
	return parts
		.map((part) => {
			if (part.startsWith('$$') && part.endsWith('$$')) {
				return katex.renderToString(part.slice(2, -2), {
					displayMode: true,
					throwOnError: false
				});
			}
			if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
				return katex.renderToString(part.slice(1, -1), { throwOnError: false });
			}
			if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
				return `<code>${escapeHtml(part.slice(1, -1))}</code>`;
			}
			return escapeHtml(part);
		})
		.join('');
}
