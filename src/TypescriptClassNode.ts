import { IClassNode, IInstanceMemberCode } from './ClassCode';
import {
	ClassDeclaration,
	ClassInstanceMemberTypes,
	Project,
	MethodDeclaration,
	Scope,
	PropertyDeclaration,
	ParameterDeclaration,
} from 'ts-morph';
import { camelCase } from 'lodash';
import { prettyTs } from './formatTs';

export class TypescriptClassNode implements IClassNode {
	static from(source: string): TypescriptClassNode {
		const className = source.match(/class \w+/)?.[0].replace('class ', '') ?? '';
		const node = new Project().createSourceFile('', source).getClassOrThrow(className);
		return new TypescriptClassNode(node);
	}

	get name(): string {
		return this.node.getName() ?? '';
	}

	constructor(private node: ClassDeclaration) {}

	getAllInstanceMembers(): IInstanceMemberCode[] {
		return this.node
			.getInstanceMembers()
			.map((field) => TypescriptInstanceMemberCode.create(field));
	}

	getInstanceMember(fieldName: string): IInstanceMemberCode {
		return TypescriptInstanceMemberCode.create(this.node.getInstanceMemberOrThrow(fieldName));
	}

	initPrivatePropertyFor(classNode: TypescriptClassNode): IInstanceMemberCode {
		const prop = this.node.addProperty({
			scope: Scope.Private,
			name: camelCase(classNode.name),
			type: classNode.name,
			initializer: `new ${classNode.name}(${classNode
				.getCtorParams()
				.map((param) => `this.${param.getName()}`)
				.join(', ')})`,
			trailingTrivia: '\n\n',
		});
		prop.setOrder(0);
		return TypescriptInstanceMemberCode.create(prop);
	}

	private getCtorParams(): ParameterDeclaration[] {
		return this.node.getConstructors()[0]?.getParameters() ?? [];
	}

	clone(name: string): IClassNode {
		return TypescriptClassNode.from(this.serialize().replace(/class \w+/, `class ${name}`));
	}

	serialize(): string {
		return prettyTs(this.node.getFullText());
	}
}

export class TypescriptInstanceMemberCode implements IInstanceMemberCode {
	static create(node: ClassInstanceMemberTypes): TypescriptInstanceMemberCode {
		if (node instanceof MethodDeclaration) {
			return new TypescriptMethodCode(node);
		}
		if (node instanceof PropertyDeclaration) {
			return new TypescriptPropertyCode(node);
		}
		if (node instanceof ParameterDeclaration) {
			return new TypescriptParameterCode(node);
		}
		return new TypescriptInstanceMemberCode(node);
	}

	get name(): string {
		return this.node.getName();
	}

	get isPrivate(): boolean {
		return this.node.getScope() === Scope.Private;
	}

	constructor(protected node: ClassInstanceMemberTypes) {}

	markAsPublic(): void {
		this.node.setScope(undefined);
	}

	getDependencyNames(): string[] {
		return this.node.getFullText().match(/(?<=this\.)\w+/g) ?? [];
	}

	delegateTo(field: IInstanceMemberCode): void {}

	remove(): void {
		this.node.remove();
	}

	serialize(): string {
		return this.node.getFullText();
	}
}

export class TypescriptPropertyCode extends TypescriptInstanceMemberCode {
	constructor(protected node: PropertyDeclaration) {
		super(node);
	}

	delegateTo(field: IInstanceMemberCode): void {
		const index = this.node.getChildIndex();
		const params = {
			name: this.name,
			scope: this.node.getScope().replace(Scope.Public, '') as Scope,
			returnType: this.node.getTypeNode()?.getText(),
			statements: `return this.${field.name}.${this.name}`,
		};
		const parent = this.node.getParentOrThrow();
		this.node.remove();
		this.node = parent.addGetAccessor(params) as any;
		this.node.setOrder(index);
	}
}

export class TypescriptParameterCode extends TypescriptInstanceMemberCode {
	markAsPublic(): void {}
}

export class TypescriptMethodCode extends TypescriptInstanceMemberCode {
	constructor(protected node: MethodDeclaration) {
		super(node);
	}

	getDependencyNames(): string[] {
		return (
			this.node
				.getBody()
				?.getFullText()
				.match(/(?<=this\.)\w+/g) ?? []
		);
	}

	delegateTo(field: IInstanceMemberCode): void {
		this.node.setBodyText(
			`return this.${field.name}.${this.name}(${this.node
				.getParameters()
				.map((param) => param.getName())})`,
		);
	}
}
