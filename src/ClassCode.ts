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

export class ClassCode {
	constructor(private node: IClassNode) {}

	extractClass(className: string, fieldNames: string[]): ClassCode {
		const extractedClassNode = this.node.clone(className);
		const extractedClassCode = new ClassCode(extractedClassNode);
		extractedClassCode.removeFieldsOmit(fieldNames);
		const createdField = this.node.initPrivatePropertyFor(extractedClassNode);
		const movedFields = this.getMovedFields(extractedClassNode);
		movedFields.forEach((field) => field.delegateTo(createdField));
		const movedFieldNames = movedFields.map((field) => field.name);
		this.deleteUnusedPrivateFieldsRecursively();
		const existingMethodNames = new Set(
			this.node.getAllInstanceMembers().map((field) => field.name),
		);
		extractedClassCode.markMethodsAsPublic(
			movedFieldNames.filter((fieldName) => existingMethodNames.has(fieldName)),
		);
		return extractedClassCode;
	}

	private removeFieldsOmit(fieldNames: string[]): void {
		const allFields = this.node.getAllInstanceMembers();
		const dependencyFieldNames = fieldNames.flatMap((fieldName) => [
			...this.getFieldDependenciesRecursively(fieldName),
		]);
		const usedFieldNames = new Set([...fieldNames, ...dependencyFieldNames]);
		const fieldsToRemove = allFields.filter((field) => !usedFieldNames.has(field.name));
		fieldsToRemove.forEach((field) => field.remove());
	}

	private *getFieldDependenciesRecursively(fieldName: string): Iterable<string> {
		const names = this.node.getInstanceMember(fieldName).getDependencyNames();
		for (const name of names) {
			yield name;
			yield* this.getFieldDependenciesRecursively(name);
		}
	}

	private getMovedFields(extractedClassNode: IClassNode): IInstanceMemberCode[] {
		return extractedClassNode
			.getAllInstanceMembers()
			.map((field) => this.node.getInstanceMember(field.name));
	}

	private markMethodsAsPublic(fieldNames: string[]): void {
		fieldNames
			.map((fieldName) => this.node.getInstanceMember(fieldName))
			.forEach((field) => field.markAsPublic());
	}

	private deleteUnusedPrivateFieldsRecursively(): void {
		const fieldsToRemove = this.getUnusedPrivateFields();
		fieldsToRemove.forEach((field) => field.remove());
		if (this.getUnusedPrivateFields().length) {
			this.deleteUnusedPrivateFieldsRecursively();
		}
	}

	private getUnusedPrivateFields(): IInstanceMemberCode[] {
		const allFields = this.node.getAllInstanceMembers();
		const usedFieldNames = new Set(allFields.flatMap((field) => field.getDependencyNames()));
		return allFields
			.filter((field) => field.isPrivate)
			.filter((field) => !usedFieldNames.has(field.name));
	}

	serialize(): string {
		return this.node.serialize();
	}
}
