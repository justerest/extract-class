import { camelCase } from 'lodash';

import { assert } from 'src/app/core/utils/assert';
import { IClassNode, IFieldCode } from './ClassCode';
import { formatPseudoCode } from './formatPseudoCode';

export class PseudoClassNode implements IClassNode {
	name: string = (() => {
		const name = this.source.match(/\w+/)?.[0];
		assert(name, 'Class name not parsed');
		return name;
	})();

	private fields: PseudoCodeField[] = (() => {
		const props = Array.from(this.source.match(/(?<=\-)\w+/g) ?? []).map(
			(methodName) => new PseudoCodePrivateProp(methodName),
		);
		const methods = Array.from(this.source.match(/(?<=\+)\w+/g) ?? []).map(
			(methodName) => new PseudoCodeMethod(methodName),
		);
		return [...props, ...methods];
	})();

	constructor(private source: string) {}

	getField(fieldName: string): IFieldCode {
		const field = this.fields.find((f) => f.name === fieldName);
		assert(field, `Field "${fieldName}" not found`);
		assert(!field.removed, 'Field "${fieldName}" removed');
		return field;
	}

	getAllFields(): IFieldCode[] {
		return this.fields;
	}

	initPrivatePropertyFor(node: IClassNode): IFieldCode {
		const prop = new PseudoCodePrivateProp(node.name);
		this.fields.unshift(prop);
		return prop;
	}

	clone(className: string): IClassNode {
		return new PseudoClassNode(this.source.replace(/\w+/, className));
	}

	serialize(): string {
		const [headLine] = this.source.trim().split('\n');
		const fields = this.fields
			.filter((field) => !field.removed)
			.map((field) => `\t${field.serialize()}`);
		return formatPseudoCode([headLine, ...fields].join('\n'));
	}
}

export abstract class PseudoCodeField implements IFieldCode {
	removed: boolean = false;

	constructor(public name: string) {}

	delegateTo(field: IFieldCode): void {}

	remove(): void {
		this.removed = true;
	}

	abstract serialize(): string;
}

export class PseudoCodeMethod extends PseudoCodeField {
	private body = '';

	delegateTo(field: IFieldCode): void {
		this.body = `\n\t\t->${camelCase(field.name)}.${this.name}()`;
	}

	serialize(): string {
		return `+${this.name}()${this.body}`;
	}
}

export class PseudoCodePrivateProp extends PseudoCodeField {
	serialize(): string {
		return `-${camelCase(this.name)}`;
	}
}
