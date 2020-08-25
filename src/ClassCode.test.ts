import { ClassCode } from './ClassCode';
import { PseudoClassNode } from './PseudoClassNode';
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
			const expected = formatTs(`
				class Extracted{
					a(){}
				}
			`);
			const classCode = new ClassCode(TypescriptClassNode.from(source));
			const extractedClassCode = classCode.extractClass('Extracted', ['a']);
			expect(formatTs(extractedClassCode.serialize())).toBe(expected);
		});

		it('should delegate call to new property', () => {
			const source = `
				class Source{
					a(): void {}
					b(): void {}
				}
			`;
			const expected = formatTs(`
				class Source{
					private extracted: Extracted = new Extracted();

					a(): void {
						return this.extracted.a();
					}
					
					b(): void {}
				}
			`);
			const classCode = new ClassCode(TypescriptClassNode.from(source));
			classCode.extractClass('Extracted', ['a']);
			expect(formatTs(classCode.serialize())).toBe(expected);
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
			const expected = formatTs(`
				class Extracted{
					a(){
						this.b();
					}
					
					b(){}
				}
			`);
			const classCode = new ClassCode(TypescriptClassNode.from(source));
			const extractedClassCode = classCode.extractClass('Extracted', ['a']);
			expect(formatTs(extractedClassCode.serialize())).toBe(expected);
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
			const expected = formatTs(`
				class Source{
					private	extracted: Extracted = new Extracted();
					
					a(){
						return this.extracted.a();
					}
				}
			`);
			const classCode = new ClassCode(TypescriptClassNode.from(source));
			classCode.extractClass('Extracted', ['a']);
			expect(formatTs(classCode.serialize())).toBe(expected);
		});
	});
});

function createClassCode(source: string) {
	return new ClassCode(new PseudoClassNode(source));
}
