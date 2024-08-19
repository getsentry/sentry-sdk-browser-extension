import hljs from 'highlight.js/lib/core';

export function InlineCode(props: { code: string }) {
	return <code innerHTML={hljs.highlight(props.code, { language: 'javascript' }).value} />;
}

export function CodeBlock(props: { code: string }) {
	return (
		<pre>
			<code innerHTML={hljs.highlight(props.code, { language: 'javascript' }).value} />
		</pre>
	);
}
