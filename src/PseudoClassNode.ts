import { camelCase, remove, noop } from 'lodash';

import { IClassNode, IInstanceMemberCode } from './ClassCode';
import { formatPseudoCode } from './formatPseudoCode';
import { assert } from './utils/assert';

export class PseudoClassNode implements IClassNode {
	name: string = (() => {
		const name = this.source.match(/\w+/)?.[0];
		assert(name, 'Class name not parsed');
		return name;
	})();

	private fields: PseudoCodeInstanceMember[] = (() => {
		const props = (this.source.match(/(?<=-)\w+/g) ?? []).map(
			(propName) => new PseudoCodePrivateProp(propName, '', () => this.removeByName(propName)),
		);
		const methods = (this.source.match(/(?<=\+)\w+/g) ?? []).map(
			(methodName) =>
				new PseudoCodeMethod(methodName, this.getMethodBody(methodName), () =>
					this.removeByName(methodName),
				),
		);
		return [...props, ...methods];
	})();

	constructor(private source: string) {}

	private removeByName(fieldName: string): void {
		remove(this.fields, (field) => field.name === fieldName);
	}

	private getMethodBody(methodName: string): string | undefined {
		const lines = this.source.split('\n');
		const methodLineIndex = lines.findIndex((line) => line.match(methodName));
		if (methodLineIndex === -1) {
			return;
		}
		const nextLine = lines[methodLineIndex + 1];
		if (nextLine.trim().startsWith('->')) {
			return '\n' + nextLine;
		}
	}

	getInstanceMember(fieldName: string): IInstanceMemberCode {
		const field = this.fields.find((f) => f.name === fieldName);
		assert(field, `Field "${fieldName}" not found`);
		return field;
	}

	getAllInstanceMembers(): IInstanceMemberCode[] {
		return this.fields;
	}

	initPrivatePropertyFor(node: IClassNode): IInstanceMemberCode {
		const prop = new PseudoCodePrivateProp(node.name, '', () => this.removeByName(node.name));
		this.fields.unshift(prop);
		return prop;
	}

	clone(className: string): IClassNode {
		return new PseudoClassNode(this.source.replace(/\w+/, className));
	}

	serialize(): string {
		const fields = this.fields.map((field) => `\t${field.serialize()}`);
		return formatPseudoCode([this.name, ...fields].join('\n'));
	}
}

export abstract class PseudoCodeInstanceMember implements IInstanceMemberCode {
	isPrivate: boolean = false;

	constructor(
		public name: string,
		protected body: string = '',
		private onRemove: () => void = noop,
	) {}

	getDependencyNames(): string[] {
		return [];
	}

	delegateTo(field: IInstanceMemberCode): void {}

	remove(): void {
		this.onRemove();
	}

	abstract serialize(): string;
}

export class PseudoCodeMethod extends PseudoCodeInstanceMember {
	getDependencyNames(): string[] {
		return this.body.match(/(?<=->)\w+/g) ?? [];
	}

	delegateTo(field: IInstanceMemberCode): void {
		this.body = `\n\t\t->${camelCase(field.name)}.${this.name}()`;
	}

	serialize(): string {
		return `+${this.name}()${this.body}`;
	}
}

export class PseudoCodePrivateProp extends PseudoCodeInstanceMember {
	isPrivate: boolean = true;

	serialize(): string {
		return `-${camelCase(this.name)}`;
	}
}
