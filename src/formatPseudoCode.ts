export function formatPseudoCode(code: string): string {
	const lines = code.split('\n');
	const firstNotEmptyLine = lines.find((line) => line.trim());
	const indent = firstNotEmptyLine?.match(/\s+/)?.[0] ?? '';
	return wrapWithNewLines(lines.map((line) => line.replace(indent, '')).join('\n'));
}

function wrapWithNewLines(body: string): string {
	return '\n' + body.trim() + '\n';
}
