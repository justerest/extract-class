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
			expectTsClassCode(extractedClassCode).toEqual(expected);
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
			expectTsClassCode(classCode).toEqual(expected);
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
			expectTsClassCode(extractedClassCode).toEqual(expected);
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
			expectTsClassCode(classCode).toEqual(expected);
		});

		it('should remove private dependency method from source if not used recursively', () => {
			const source = `
				class Source{
					a(){
						this.b();
					}
					
					private	b(){
						this.c();
					}

					private c(){}
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
			expectTsClassCode(classCode).toEqual(expected);
		});

		it('should not remove private dependency method from source if not moved', () => {
			const source = `
				class Source{
					a(){}
					private	b(){}
				}
		`;
			const expected = `
				class Source{
					private	extracted: Extracted = new Extracted();					
					a(){
						return this.extracted.a();
					}
					private	b(){}
				}
			`;
			const classCode = createClassCode(source);
			classCode.extractClass('Extracted', ['a']);
			expectTsClassCode(classCode).toEqual(expected);
		});

		it('should add dependency methods to extracted class recursively', () => {
			const source = `
				class Source{
					a(){
						this.b();
					}
					
					private	b(){
						this.c();
					}

					private c(){}
				}
		`;
			const expected = `
				class Extracted{
					a(){
						this.b();
					}
					
					private	b(){
						this.c();
					}

					private c(){}
				}
			`;
			const classCode = createClassCode(source);
			const extractedClassCode = classCode.extractClass('Extracted', ['a']);
			expectTsClassCode(extractedClassCode).toEqual(expected);
		});

		it('should not add unused private methods to extracted class', () => {
			const source = `
				class Source{
					a(){}

					d(){
						this.b();
					}
					
					private	b(){
						this.c();
					}

					private c(){}
				}
		`;
			const expected = `
				class Extracted{
					a(){}
				}
			`;
			const classCode = createClassCode(source);
			const extractedClassCode = classCode.extractClass('Extracted', ['a']);
			expectTsClassCode(extractedClassCode).toEqual(expected);
		});

		it('should mark moved private methods to extracted class as public', () => {
			const source = `
				class Source{
					private a(){
						this.b();
					}

					d(){
						this.a();
					}
					
					private	b(){
						this.c();
					}

					private c(){}
				}
		`;
			const expected = `
				class Extracted{
					a(){
						this.b();
					}
					
					private	b(){
						this.c();
					}

					private c(){}
				}
			`;
			const classCode = createClassCode(source);
			const extractedClassCode = classCode.extractClass('Extracted', ['a']);
			expectTsClassCode(extractedClassCode).toEqual(expected);
		});

		it('should mark moved private dependency methods to extracted class as public', () => {
			const source = `
				class Source{
					private a(){
						this.b();
					}

					d(){
						this.a();
						this.b();
					}
					
					private	b(){
						this.c();
					}

					private c(){}
				}
		`;
			const expected = `
				class Extracted{
					a(){
						this.b();
					}
					
					b(){
						this.c();
					}

					private c(){}
				}
			`;
			const classCode = createClassCode(source);
			const extractedClassCode = classCode.extractClass('Extracted', ['a']);
			expectTsClassCode(extractedClassCode).toEqual(expected);
		});

		it('should delegate moved private methods to extracted class prop', () => {
			const source = `
				class Source{
					private a(){
						this.b();
					}

					d(){
						this.a();
						this.b();
					}
					
					private	b(){
						this.c();
					}

					private c(){}
				}
		`;
			const expected = `
				class Source{
					private extracted: Extracted = new Extracted();

					private a(){
						return this.extracted.a();
					}

					d(){
						this.a();
						this.b();
					}
					
					private	b(){
						return this.extracted.b();
					}
				}
			`;
			const classCode = createClassCode(source);
			classCode.extractClass('Extracted', ['a']);
			expectTsClassCode(classCode).toEqual(expected);
		});

		it('should create getter for moved public property', () => {
			const source = `
				class Source{
					prop:number = 1;
					a():void{
						console.log(this.prop);
					}
				}
		`;
			const expected = `
				class Source{
					private extracted: Extracted = new Extracted();

					get prop(): number{
						return this.extracted.prop;
					}

					a():void{
						return	this.extracted.a();
					}
				}
			`;
			const classCode = createClassCode(source);
			classCode.extractClass('Extracted', ['a']);
			expectTsClassCode(classCode).toEqual(expected);
		});

		it('should init new class with params', () => {
			const source = `
				class Source{
					constructor(private prop: number){}

					a():void{
						console.log(this.prop);
					}
				}
		`;
			const expected = `
				class Source{
					private extracted: Extracted = new Extracted(this.prop);

					constructor(private prop: number){}

					a():void{
						return	this.extracted.a();
					}
				}
			`;
			const classCode = createClassCode(source);
			classCode.extractClass('Extracted', ['a']);
			expectTsClassCode(classCode).toEqual(expected);
		});

		it('should move ctor fields to extracted class if used', () => {
			const source = `
				class Source{
					constructor(private prop: number){}

					a():void{
						console.log(this.prop);
					}
				}
		`;
			const expected = `
				class Extracted{
					constructor(private prop: number){}

					a():void{
						console.log(this.prop);
					}
				}
			`;
			const classCode = createClassCode(source);
			const extractedClassCode = classCode.extractClass('Extracted', ['a']);
			expectTsClassCode(extractedClassCode).toEqual(expected);
		});

		it('should not init new class with unused params', () => {
			const source = `
				class Source{
					constructor(private prop: number){}

					a():void{}
				}
		`;
			const expected = `
				class Source{
					private extracted: Extracted = new Extracted();

					constructor(private prop: number){}

					a():void{
						return	this.extracted.a();
					}
				}
			`;
			const classCode = createClassCode(source);
			classCode.extractClass('Extracted', ['a']);
			expectTsClassCode(classCode).toEqual(expected);
		});
	});
});

function expectTsClassCode(classCode: ClassCode) {
	return {
		toEqual: (expected: string) => expect(formatTs(classCode.serialize())).toBe(formatTs(expected)),
	};
}

function createClassCode(source: string): ClassCode {
	return new ClassCode(TypescriptClassNode.from(source));
}
