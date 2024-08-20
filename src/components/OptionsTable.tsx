import { JSX } from 'solid-js';
import { CodeBlock, InlineCode } from './CodeSnippet';

export function OptionsTable({ options }: { options: Record<string, unknown> }) {
	return (
		<table>
			<thead>
				<tr>
					<th>Option</th>
					<th>Value</th>
				</tr>
			</thead>
			<tbody>
				{Object.entries(options).map(([key, value]) => (
					<tr>
						<td>{InlineCode({ code: key })}</td>
						<td>{serializeOption(value)}</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}

function serializeOption<Option extends unknown>(value: Option): string | JSX.Element {
	if (value && typeof value === 'object') {
		return CodeBlock({ code: JSON.stringify(value, null, 2) });
	}

	return InlineCode({ code: `${value}` });
}
