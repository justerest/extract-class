import { ClassInstanceMemberTypes, Scope, MethodDeclaration, ParameterDeclaration } from 'ts-morph';

export class Field {
	static fromInstanceMember(node: ClassInstanceMemberTypes): Field {
		if (node instanceof MethodDeclaration) {
			return new MethodField(node);
		}
		return new Field(node);
	}

	static parseFieldNameFromUmlNotation(umlNotation: string): string {
		return umlNotation.match(/\w+/)?.[0] ?? '';
	}

	constructor(protected node: ClassInstanceMemberTypes) {}

	toUmlNotation(): string {
		return `${this.getBody()}${this.getType()}`;
	}

	protected getBody(): string {
		return `${this.getScopeSymbol()}${this.node.getName()}`;
	}

	protected getScopeSymbol(): string {
		const scope = this.node.getScope();
		return scope === Scope.Public ? '+' : scope === Scope.Protected ? '#' : '-';
	}

	private getType(): string {
		const matches = this.node.getFullText()?.match(/:\s?\w+/);
		return matches?.[matches.length - 1].replace(/:\s?/, ': ') ?? '';
	}
}

export class MethodField extends Field {
	constructor(protected node: MethodDeclaration) {
		super(node);
	}

	toUmlNotation(): string {
		return `${this.getBody()}(${this.getParamsSignature()})${this.getReturnType()}`;
	}

	private getParamsSignature(): string {
		return this.node
			.getParameters()
			.map((param) => this.getParamUmlNotation(param))
			.join(', ');
	}

	private getParamUmlNotation(param: ParameterDeclaration): string {
		const type = param.getTypeNode()?.getText();
		return `${param.getName()}${type ? `: ${type}` : ''}`;
	}

	private getReturnType(): string {
		const matches = this.node.getFullText()?.match(/\)\s*:\s*\w+/);
		return matches?.[matches.length - 1].replace(')', '').replace(/:\s?/, ': ') ?? '';
	}
}
