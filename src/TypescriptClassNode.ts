import { IClassNode, IInstanceMemberCode } from './ClassCode';
import {
	ClassDeclaration,
	ClassInstanceMemberTypes,
	Project,
	MethodDeclaration,
	Scope,
} from 'ts-morph';
import { camelCase } from 'lodash';

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

	initPrivatePropertyFor(classNode: IClassNode): IInstanceMemberCode {
		const prop = this.node.addProperty({
			scope: Scope.Private,
			name: camelCase(classNode.name),
			type: classNode.name,
			initializer: `new ${classNode.name}()`,
			trailingTrivia: '\n\n',
		});
		prop.setOrder(0);
		return TypescriptInstanceMemberCode.create(prop);
	}

	clone(name: string): IClassNode {
		return TypescriptClassNode.from(this.serialize().replace(/class \w+/, `class ${name}`));
	}

	serialize(): string {
		return this.node.getFullText();
	}
}

export class TypescriptInstanceMemberCode implements IInstanceMemberCode {
	static create(node: ClassInstanceMemberTypes): TypescriptInstanceMemberCode {
		if (node instanceof MethodDeclaration) {
			return new TypescriptMethodMemberCode(node);
		}
		return new TypescriptInstanceMemberCode(node);
	}

	get name(): string {
		return this.node.getName();
	}

	constructor(protected node: ClassInstanceMemberTypes) {}

	delegateTo(field: IInstanceMemberCode): void {}

	remove(): void {
		this.node.remove();
	}

	serialize(): string {
		return this.node.getFullText();
	}
}

export class TypescriptMethodMemberCode extends TypescriptInstanceMemberCode {
	constructor(protected node: MethodDeclaration) {
		super(node);
	}

	delegateTo(field: IInstanceMemberCode): void {
		this.node.setBodyText(
			`return this.${field.name}.${this.name}(${this.node
				.getParameters()
				.map((param) => param.getName())})`,
		);
	}
}
