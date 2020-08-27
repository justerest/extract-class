import { Field, MethodField } from './Field';
import { parseClassDeclaration } from './parseClassDeclaration';

describe(Field.name, () => {
	describe(Field.prototype.toUmlNotation.name, () => {
		it('should parse public prop', () => {
			const field = createProp(`prop: Type`);
			expect(field.toUmlNotation()).toBe('+prop: Type');
		});

		it('should parse private prop', () => {
			const field = createProp(`private prop: Type`);
			expect(field.toUmlNotation()).toBe('-prop: Type');
		});

		it('should parse protected prop', () => {
			const field = createProp(`protected prop: Type`);
			expect(field.toUmlNotation()).toBe('#prop: Type');
		});

		it('should parse prop without type', () => {
			const field = createProp(`protected prop`);
			expect(field.toUmlNotation()).toBe('#prop');
		});

		it('should parse prop without type with initializer', () => {
			const field = createProp(`prop = 1`);
			expect(field.toUmlNotation()).toBe('+prop');
		});
	});
});

describe(MethodField.name, () => {
	describe(MethodField.prototype.toUmlNotation.name, () => {
		it('should parse public method', () => {
			const field = createMethod(`method(){}`);
			expect(field.toUmlNotation()).toBe('+method()');
		});

		it('should parse private method', () => {
			const field = createMethod(`private method(){}`);
			expect(field.toUmlNotation()).toBe('-method()');
		});

		it('should parse method with return type', () => {
			const field = createMethod(`method():Type{}`);
			expect(field.toUmlNotation()).toBe('+method(): Type');
		});

		it('should parse method with param', () => {
			const field = createMethod(`method(param){}`);
			expect(field.toUmlNotation()).toBe('+method(param)');
		});

		it('should parse method with typed param', () => {
			const field = createMethod(`method(param: Param){}`);
			expect(field.toUmlNotation()).toBe('+method(param: Param)');
		});

		it('should parse method with typed params', () => {
			const field = createMethod(`method(param: Param1, param2:Param2):Param3{}`);
			expect(field.toUmlNotation()).toBe('+method(param: Param1, param2: Param2): Param3');
		});
	});
});

function createProp(code: string): Field {
	const classBody = `class A{${code}}`;
	return new Field(parseClassDeclaration(classBody).getInstanceMembers()[0]);
}

function createMethod(code: string): Field {
	const classBody = `class A{${code}}`;
	return new MethodField(parseClassDeclaration(classBody).getInstanceMembers()[0] as any);
}
