import { format } from 'prettier';

export function formatTs(value: string): string {
	return prettyTs(value).replace(/\n+/g, '\n');
}

export function prettyTs(value: string) {
	return format(value, { parser: 'typescript', singleQuote: true });
}
