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
	delegateTo(field: IInstanceMemberCode): void;
	remove(): void;
}

export class ClassCode {
	constructor(private classNode: IClassNode) {}

	extractClass(className: string, fieldNames: string[]): ClassCode {
		const extractedClassNode = this.classNode.clone(className);
		const extractedClassCode = new ClassCode(extractedClassNode);
		extractedClassCode.removeFieldsOmit(fieldNames);
		const createdField = this.classNode.initPrivatePropertyFor(extractedClassNode);
		fieldNames
			.map((fieldName) => this.classNode.getInstanceMember(fieldName))
			.forEach((field) => field.delegateTo(createdField));
		return extractedClassCode;
	}

	private removeFieldsOmit(fieldNames: string[]): void {
		const fields = this.classNode.getAllInstanceMembers();
		const excludedFields = fields.filter((field) => !fieldNames.includes(field.name));
		excludedFields.forEach((field) => field.remove());
	}

	serialize(): string {
		return this.classNode.serialize();
	}
}