export interface ICode {
	serialize(): string;
}

export interface IClassNode extends ICode {
	name: string;
	getAllInstanceMembers(): IInstanceMemberCode[];
	getInstanceMember(fieldName: string): IInstanceMemberCode;
	initPrivatePropertyFor(classNode: IClassNode): IInstanceMemberCode;
	clone(name: string): IClassNode;
}

export interface IInstanceMemberCode extends ICode {
	name: string;
	isPrivate: boolean;
	getDependencyNames(): string[];
	delegateTo(field: IInstanceMemberCode): void;
	markAsPublic(): void;
	remove(): void;
}

export class ClassRefactor {
	constructor(private node: IClassNode) {}

	extractClass(className: string, fieldNames: string[]): ClassRefactor {
		const extracted = ExtractingClassRefactor.create(this.node, className, fieldNames);
		const source = new SourceClassRefactor(this.node, extracted.getNode());
		extracted.removeFieldsOmitExtractingWithDependencies();
		source.delegateCallsToExtractedClass();
		source.deleteUnusedPrivateMovedFields();
		extracted.markDelegatedFieldsAsPublic();
		return new ClassRefactor(extracted.getNode());
	}

	serialize(): string {
		return this.node.serialize();
	}
}

class ExtractingClassRefactor {
	static create(
		sourceNode: IClassNode,
		className: string,
		fieldNames: string[],
	): ExtractingClassRefactor {
		return new ExtractingClassRefactor(sourceNode, sourceNode.clone(className), fieldNames);
	}

	private constructor(
		private sourceNode: IClassNode,
		private clonedNode: IClassNode,
		private fieldsToExtract: string[],
	) {}

	removeFieldsOmitExtractingWithDependencies(): void {
		const allFields = this.clonedNode.getAllInstanceMembers();
		const dependencyFieldNames = this.fieldsToExtract.flatMap((fieldName) =>
			this.getFieldDependenciesRecursively(fieldName),
		);
		const usedFieldNames = new Set([...this.fieldsToExtract, ...dependencyFieldNames]);
		const fieldsToRemove = allFields.filter((field) => !usedFieldNames.has(field.name));
		fieldsToRemove.forEach((field) => field.remove());
	}

	private getFieldDependenciesRecursively(fieldName: string): string[] {
		return new FieldDependencies(this.clonedNode, fieldName).getAllDependencies();
	}

	markDelegatedFieldsAsPublic(): void {
		const existingFieldNames = new Set(
			this.sourceNode.getAllInstanceMembers().map((field) => field.name),
		);
		const extractedFields = this.clonedNode.getAllInstanceMembers();
		const fieldsToExtract = new Set(this.fieldsToExtract);
		extractedFields
			.filter((field) => fieldsToExtract.has(field.name) || existingFieldNames.has(field.name))
			.forEach((field) => field.markAsPublic());
	}

	getNode(): IClassNode {
		return this.clonedNode;
	}
}

class SourceClassRefactor {
	constructor(private sourceNode: IClassNode, private clonedNode: IClassNode) {}

	delegateCallsToExtractedClass(): void {
		const extractedClassProp = this.sourceNode.initPrivatePropertyFor(this.clonedNode);
		this.clonedNode
			.getAllInstanceMembers()
			.map((field) => this.sourceNode.getInstanceMember(field.name))
			.forEach((field) => field.delegateTo(extractedClassProp));
	}

	deleteUnusedPrivateMovedFields(): void {
		const fieldsToRemove = this.getUnusedPrivateMovedFields();
		fieldsToRemove.forEach((field) => field.remove());
		if (this.getUnusedPrivateMovedFields().length) {
			this.deleteUnusedPrivateMovedFields();
		}
	}

	private getUnusedPrivateMovedFields(): IInstanceMemberCode[] {
		const allFields = this.sourceNode.getAllInstanceMembers();
		const usedFieldNames = new Set(allFields.flatMap((field) => field.getDependencyNames()));
		const extractedFieldNames = new Set(this.getExtractedFieldNames());
		return allFields
			.filter((field) => field.isPrivate)
			.filter((field) => !usedFieldNames.has(field.name))
			.filter((field) => extractedFieldNames.has(field.name));
	}

	private getExtractedFieldNames(): string[] {
		return this.clonedNode.getAllInstanceMembers().map((field) => field.name);
	}
}

class FieldDependencies {
	private dependencies: Set<string> = new Set();

	constructor(private node: IClassNode, fieldName: string) {
		this.fillDependenciesRecursively(fieldName);
	}

	getAllDependencies(): string[] {
		return [...this.dependencies.values()];
	}

	private fillDependenciesRecursively(fieldName: string): void {
		const names = this.node.getInstanceMember(fieldName).getDependencyNames();
		for (const name of names) {
			if (!this.dependencies.has(name)) {
				this.dependencies.add(name);
				this.fillDependenciesRecursively(name);
			}
		}
	}
}
