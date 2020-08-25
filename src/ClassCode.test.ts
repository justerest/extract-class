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
			const classCode = createClassCode(source);
			const extractedClassCode = classCode.extractClass('A', ['a']);
			expect(extractedClassCode.serialize()).toBe(expected);
		});

		it('should delegate call to new property', () => {
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
			const classCode = createClassCode(source);
			classCode.extractClass('Extracted', ['a']);
			expect(classCode.serialize()).toBe(expected);
		});
	});
});

function createClassCode(source: string) {
	return new ClassCode(new PseudoClassNode(source));
}
