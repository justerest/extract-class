import * as vscode from 'vscode';
import { EXTRACT_CLASS_COMMAND } from './EXTRACT_CLASS_COMMAND';

export class ExtractClassActionProvider implements vscode.CodeActionProvider {
	provideCodeActions(
		document: vscode.TextDocument,
		range: vscode.Range | vscode.Selection,
	): vscode.ProviderResult<(vscode.Command | vscode.CodeAction)[]> {
		if (this.isClassDeclarationLine(document.lineAt(range.start.line))) {
			return [this.createExtractClassCommand()];
		}
	}

	private isClassDeclarationLine(line: vscode.TextLine): boolean {
		return !!line.text.match(/class \w+/);
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
