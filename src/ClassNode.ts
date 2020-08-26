export interface ClassNode {
	name: string;
	getAllInstanceMembers(): InstanceMember[];
	getInstanceMember(fieldName: string): InstanceMember;
	initPrivatePropertyFor(classNode: ClassNode): InstanceMember;
	clone(name: string): ClassNode;
	serialize(): string;
}

export interface InstanceMember {
	name: string;
	isPrivate(): boolean;
	getDependencyNames(): string[];
	delegateTo(field: InstanceMember): void;
	markAsPublic(): void;
	remove(): void;
}
