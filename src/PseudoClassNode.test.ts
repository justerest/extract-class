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
	});

	describe(PseudoClassNode.prototype.getAllFields.name, () => {
		it('should returns methods', () => {
			const source = `
				A
					+a()
					+b()
			`;
			expect(new PseudoClassNode(source).getAllFields()).toEqual([
				new PseudoCodeMethod('a'),
				new PseudoCodeMethod('b'),
			]);
		});
	});

	describe(PseudoClassNode.prototype.getField.name, () => {
		it('should returns method a', () => {
			const source = `
				A
					+a()
					+b()
			`;
			expect(new PseudoClassNode(source).getField('a')).toEqual(new PseudoCodeMethod('a'));
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
				node.getField('b').remove();
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
				node.getField('a').delegateTo(node.getField('prop'));
				expect(node.serialize()).toBe(expected);
			});
		});
	});
});
