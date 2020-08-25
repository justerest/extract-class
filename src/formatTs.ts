import { format } from 'prettier';

export function formatTs(value: string): string {
	return format(value, { parser: 'typescript' }).replace(/\n+/g, '\n');
}
