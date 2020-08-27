import { Project } from 'ts-morph';

export function parseClassDeclaration(source: string) {
	const className = source.match(/class \w+/)?.[0].replace('class ', '') ?? '';
	return new Project().createSourceFile('', source).getClassOrThrow(className);
}
