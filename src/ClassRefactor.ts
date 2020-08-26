import { ClassNode, InstanceMember } from './ClassNode';

export class ClassRefactor {
	constructor(private node: ClassNode) {}

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
		sourceNode: ClassNode,
		className: string,
		fieldNames: string[],
	): ExtractingClassRefactor {
		return new ExtractingClassRefactor(sourceNode, sourceNode.clone(className), fieldNames);
	}

	private constructor(
		private sourceNode: ClassNode,
		private clonedNode: ClassNode,
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
		return new FieldDependencies(this.clonedNode, fieldName).getAll();
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

	getNode(): ClassNode {
		return this.clonedNode;
	}
}

class SourceClassRefactor {
	constructor(private sourceNode: ClassNode, private clonedNode: ClassNode) {}

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

	private getUnusedPrivateMovedFields(): InstanceMember[] {
		const allFields = this.sourceNode.getAllInstanceMembers();
		const usedFieldNames = new Set(allFields.flatMap((field) => field.getDependencyNames()));
		const extractedFieldNames = new Set(this.getExtractedFieldNames());
		return allFields
			.filter((field) => field.isPrivate())
			.filter((field) => !usedFieldNames.has(field.name))
			.filter((field) => extractedFieldNames.has(field.name));
	}

	private getExtractedFieldNames(): string[] {
		return this.clonedNode.getAllInstanceMembers().map((field) => field.name);
	}
}

class FieldDependencies {
	private dependencies: Set<string> = new Set();

	constructor(private node: ClassNode, fieldName: string) {
		this.fillDependenciesRecursively(fieldName);
	}

	getAll(): string[] {
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