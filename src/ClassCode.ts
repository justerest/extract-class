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
	remove(): void;
}

export class ClassCode {
	constructor(private node: IClassNode) {}

	extractClass(className: string, fieldNames: string[]): ClassCode {
		const extractedClassNode = this.node.clone(className);
		const extractedClassCode = new ClassCode(extractedClassNode);
		extractedClassCode.removeFieldsOmit(fieldNames);
		const createdField = this.node.initPrivatePropertyFor(extractedClassNode);
		fieldNames
			.map((fieldName) => this.node.getInstanceMember(fieldName))
			.forEach((field) => field.delegateTo(createdField));
		this.deleteUnusedFields();
		return extractedClassCode;
	}

	private removeFieldsOmit(fieldNames: string[]): void {
		const allFields = this.node.getAllInstanceMembers();
		const dependencyFieldNames = allFields.flatMap((field) => field.getDependencyNames());
		const usedFieldNames = new Set([...fieldNames, ...dependencyFieldNames]);
		const excludedFields = allFields.filter((field) => !usedFieldNames.has(field.name));
		excludedFields.forEach((field) => field.remove());
	}

	private deleteUnusedFields(): void {
		const allFields = this.node.getAllInstanceMembers();
		const usedFieldNames = new Set(allFields.flatMap((field) => field.getDependencyNames()));
		const fieldsToRemove = allFields
			.filter((field) => field.isPrivate)
			.filter((field) => !usedFieldNames.has(field.name));
		fieldsToRemove.forEach((field) => field.remove());
	}

	serialize(): string {
		return this.node.serialize();
	}
}
