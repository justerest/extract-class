import * as vscode from 'vscode';
import { EXTRACT_CLASS_COMMAND } from './EXTRACT_CLASS_COMMAND';

export class ExtractClassActionProvider implements vscode.CodeActionProvider {
	provideCodeActions(
		document: vscode.TextDocument,
		range: vscode.Range | vscode.Selection,
	): vscode.ProviderResult<(vscode.Command | vscode.CodeAction)[]> {
		const matcher = new ExtractClassActionProviderMatcher(document, range);
		if (matcher.isCursorAtClassNameRange()) {
			return [this.createExtractClassCommand()];
		}
	}

	private createExtractClassCommand() {
		const action = new vscode.CodeAction('Extract class', vscode.CodeActionKind.RefactorExtract);
		action.command = {
			command: EXTRACT_CLASS_COMMAND,
			title: 'Extract class',
			tooltip: 'Select instance members to extract',
		};
		return action;
	}
}

class ExtractClassActionProviderMatcher {
	constructor(
		private document: vscode.TextDocument,
		private range: vscode.Range | vscode.Selection,
	) {}

	isCursorAtClassNameRange(): boolean {
		if (this.isClassDeclarationLine()) {
			return this.getClassNameRange().contains(this.range);
		}
		return false;
	}

	private isClassDeclarationLine(): boolean {
		return !!this.getClassNameAtLine();
	}

	private getClassNameAtLine(): string {
		return (
			this.getLineText()
				.match(/class \w+/)?.[0]
				.replace('class ', '') ?? ''
		);
	}

	private getLineText(): string {
		return this.document.lineAt(this.range.start.line).text;
	}

	private getClassNameRange(): vscode.Range {
		const className = this.getClassNameAtLine();
		const classNameStartIndex = this.getLineText().indexOf(className);
		return new vscode.Range(
			new vscode.Position(this.range.start.line, classNameStartIndex - 1),
			new vscode.Position(this.range.start.line, classNameStartIndex + className.length),
		);
	}
}
