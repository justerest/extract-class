import { formatPseudoCode } from './formatPseudoCode';

describe(formatPseudoCode.name, () => {
	it('should delete indents by first symbol', () => {
		const value = `
			A
				+a()
		`;
		const expected = `
A
	+a()
		`;
		expect(formatPseudoCode(value)).toBe(formatPseudoCode(expected));
	});

	it('should trim and wrap code by new lines', () => {
		const value = `

			A
				+a()
								`;
		const expected = `
A
	+a()
`;
		expect(formatPseudoCode(value)).toBe(expected);
	});
});
