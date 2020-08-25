import { ClassCode } from './ClassCode';
import { TypescriptClassNode } from './TypescriptClassNode';
import { formatTs } from './formatTs';

describe(ClassCode.name, () => {
	describe(ClassCode.prototype.extractClass.name, () => {
		it('should extract new class with sended method', () => {
			const source = `
				class Source{
					a(){}
					b(){}
				}
			`;
			const expected = `
				class Extracted{
					a(){}
				}
			`;
			const classCode = createClassCode(source);
			const extractedClassCode = classCode.extractClass('Extracted', ['a']);
			expectTsCode(extractedClassCode.serialize()).toEqual(expected);
		});

		it('should delegate call to new property', () => {
			const source = `
				class Source{
					a(): void {}
					b(): void {}
				}
			`;
			const expected = `
				class Source{
					private extracted: Extracted = new Extracted();

					a(): void {
						return this.extracted.a();
					}
					
					b(): void {}
				}
			`;
			const classCode = createClassCode(source);
			classCode.extractClass('Extracted', ['a']);
			expectTsCode(classCode.serialize()).toEqual(expected);
		});

		it('should add dependency method to new class', () => {
			const source = `
				class Source{
					a(){
						this.b();
					}

					b(){}
				}
			`;
			const expected = `
				class Extracted{
					a(){
						this.b();
					}
					
					b(){}
				}
			`;
			const classCode = createClassCode(source);
			const extractedClassCode = classCode.extractClass('Extracted', ['a']);
			expectTsCode(extractedClassCode.serialize()).toEqual(expected);
		});

		it('should remove private dependency method from source if not used', () => {
			const source = `
				class Source{
					a(){
						this.b();
					}
					
					private	b(){}
				}
		`;
			const expected = `
				class Source{
					private	extracted: Extracted = new Extracted();
					
					a(){
						return this.extracted.a();
					}
				}
			`;
			const classCode = createClassCode(source);
			classCode.extractClass('Extracted', ['a']);
			expectTsCode(classCode.serialize()).toEqual(expected);
		});
	});
});

function expectTsCode(value: string) {
	return { toEqual: (expected: string) => expect(formatTs(value)).toBe(formatTs(expected)) };
}

function createClassCode(source: string): ClassCode {
	return new ClassCode(TypescriptClassNode.from(source));
}
