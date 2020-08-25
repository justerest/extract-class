import { ClassCode } from './ClassCode';
import { formatPseudoCode as f } from './formatPseudoCode';
import { PseudoClassNode } from './PseudoClassNode';

describe(ClassCode.name, () => {
	describe(ClassCode.prototype.extractClass.name, () => {
		it('should extract new class with sended method', () => {
			const source = `
				AB
					+a()
					+b()
			`;
			const expected = f(`
				A
					+a()
			`);
			const classCode = new ClassCode(new PseudoClassNode(source));
			const extractedClassCode = classCode.extractClass('A', ['a']);
			expect(extractedClassCode.serialize()).toBe(expected);
		});

		it('should delegate method to new property', () => {
			const source = `
				Source
					+a()
					+b()
			`;
			const expected = f(`
				Source
					-extracted
					+a()
						->extracted.a()
					+b()
			`);
			const classCode = new ClassCode(new PseudoClassNode(source));
			classCode.extractClass('Extracted', ['a']);
			expect(classCode.serialize()).toBe(expected);
		});
	});
});
