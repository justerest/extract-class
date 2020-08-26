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
		return new ClassRefactor(
			ExtractClassOperation.execute(this.node, className, fieldNames).getExtractedNode(),
		);
	}

	serialize(): string {
		return this.node.serialize();
	}
}

class ExtractClassOperation {
	static execute(
		sourceNode: IClassNode,
		extractingClassName: string,
		fieldsToExtract: string[],
	): ExtractClassOperation {
		return new ExtractClassOperation(
			sourceNode,
			CloneClassOperation.execute(sourceNode, extractingClassName, fieldsToExtract).getClonedNode(),
			new Set(fieldsToExtract),
		);
	}

	private extractedFields: IInstanceMemberCode[] = this.extractedNode.getAllInstanceMembers();

	private constructor(
		private sourceNode: IClassNode,
		private extractedNode: IClassNode,
		private fieldsToExtract: Set<string>,
	) {
		this.execute();
	}

	getExtractedNode(): IClassNode {
		return this.extractedNode;
	}

	private execute(): void {
		this.delegateCallsToExtractedClass();
		this.deleteUnusedPrivateMovedFields();
		this.markExtractedFieldsAsPublic();
	}

	private delegateCallsToExtractedClass(): void {
		const extractedClassProp = this.sourceNode.initPrivatePropertyFor(this.extractedNode);
		const movedFields = this.extractedFields.map((field) =>
			this.sourceNode.getInstanceMember(field.name),
		);
		movedFields.forEach((field) => field.delegateTo(extractedClassProp));
	}

	private deleteUnusedPrivateMovedFields(): void {
		const fieldsToRemove = this.getUnusedPrivateMovedFields();
		fieldsToRemove.forEach((field) => field.remove());
		if (this.getUnusedPrivateMovedFields().length) {
			this.deleteUnusedPrivateMovedFields();
		}
	}

	private getUnusedPrivateMovedFields(): IInstanceMemberCode[] {
		const allFields = this.sourceNode.getAllInstanceMembers();
		const usedFieldNames = new Set(allFields.flatMap((field) => field.getDependencyNames()));
		const extractedFieldNames = new Set(this.extractedFields.map((field) => field.name));
		return allFields
			.filter((field) => field.isPrivate)
			.filter((field) => !usedFieldNames.has(field.name))
			.filter((field) => extractedFieldNames.has(field.name));
	}

	private markExtractedFieldsAsPublic(): void {
		const existingFieldNames = new Set(
			this.sourceNode.getAllInstanceMembers().map((field) => field.name),
		);
		this.extractedFields
			.filter((field) => this.fieldsToExtract.has(field.name) || existingFieldNames.has(field.name))
			.forEach((field) => field.markAsPublic());
	}
}

class CloneClassOperation {
	static execute(
		sourceNode: IClassNode,
		newClassName: string,
		fieldsToExtract: string[],
	): CloneClassOperation {
		return new CloneClassOperation(sourceNode.clone(newClassName), fieldsToExtract);
	}

	private constructor(private clonedNode: IClassNode, private fieldsToExtract: string[]) {
		this.removeFieldsOmitDependencies();
	}

	getClonedNode(): IClassNode {
		return this.clonedNode;
	}

	private removeFieldsOmitDependencies(): void {
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
