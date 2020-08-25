import { formatPseudoCode as f } from './formatPseudoCode';
import { PseudoClassNode, PseudoCodeMethod } from './PseudoClassNode';

describe(PseudoClassNode.name, () => {
	describe('name', () => {
		it('should parse name from first world', () => {
			const source = `
				A
					+a()
			`;
			expect(new PseudoClassNode(source).name).toBe('A');
		});
	});

	describe(PseudoClassNode.prototype.serialize.name, () => {
		it('should returns formatted string', () => {
			const source = f(`
				A
					+a()
			`);
			expect(new PseudoClassNode(source).serialize()).toBe(source);
		});

		it('should serialize methods with dependency', () => {
			const source = f(`
				A
					+a()
						->b()
					+b()
			`);
			expect(new PseudoClassNode(source).serialize()).toBe(source);
		});
	});

	describe(PseudoClassNode.prototype.getAllInstanceMembers.name, () => {
		it('should returns methods', () => {
			const source = `
				A
					+a()
					+b()
			`;
			expect(
				new PseudoClassNode(source).getAllInstanceMembers().map((field) => field.serialize()),
			).toEqual([new PseudoCodeMethod('a').serialize(), new PseudoCodeMethod('b').serialize()]);
		});
	});

	describe(PseudoClassNode.prototype.getInstanceMember.name, () => {
		it('should returns method a', () => {
			const source = `
				A
					+a()
					+b()
			`;
			expect(new PseudoClassNode(source).getInstanceMember('a').serialize()).toEqual(
				new PseudoCodeMethod('a').serialize(),
			);
		});
	});

	describe(PseudoClassNode.prototype.clone.name, () => {
		it('should returns equal class with another name', () => {
			const source = `
				A
					+a()
					+b()
			`;
			const expected = f(`
				B
					+a()
					+b()
			`);
			const clone = new PseudoClassNode(source).clone('B');
			expect(clone.serialize()).toBe(expected);
		});
	});

	describe(PseudoClassNode.prototype.initPrivatePropertyFor.name, () => {
		it('should add private property', () => {
			const source = `
				A
					+a()
					+b()
			`;
			const nestedClass = `
				Nested
					+a()
			`;
			const expected = f(`
				A
					-nested
					+a()
					+b()
			`);
			const node = new PseudoClassNode(source);
			node.initPrivatePropertyFor(new PseudoClassNode(nestedClass));
			expect(node.serialize()).toBe(expected);
		});
	});

	describe(PseudoCodeMethod.name, () => {
		describe(PseudoCodeMethod.prototype.remove.name, () => {
			it('should remove method from class node', () => {
				const source = `
					A
						+a()
						+b()
				`;
				const expected = f(`
					A
						+a()
				`);
				const node = new PseudoClassNode(source);
				node.getInstanceMember('b').remove();
				expect(node.serialize()).toBe(expected);
			});
		});

		describe(PseudoCodeMethod.prototype.delegateTo.name, () => {
			it('should add delegation code to method body', () => {
				const source = `
					A
						-prop
						+a()
				`;
				const expected = f(`
					A
						-prop
						+a()
							->prop.a()
				`);
				const node = new PseudoClassNode(source);
				node.getInstanceMember('a').delegateTo(node.getInstanceMember('prop'));
				expect(node.serialize()).toBe(expected);
			});
		});

		describe(PseudoCodeMethod.prototype.getDependencyNames.name, () => {
			it('should parse method dependencies', () => {
				const source = `
					A
						+a()
							->b()
						+b()
				`;
				const node = new PseudoClassNode(source);
				expect(node.getInstanceMember('a').getDependencyNames()).toEqual(['b']);
			});
		});
	});
});
