import * as vscode from 'vscode';
import { ExtractClassActionProvider } from './ExtractClassActionProvider';
import { EXTRACT_CLASS_COMMAND } from './EXTRACT_CLASS_COMMAND';
import { ExtractClassCommand } from './ExtractClassCommand';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider('typescript', new ExtractClassActionProvider(), {
			providedCodeActionKinds: [vscode.CodeActionKind.RefactorExtract],
		}),
	);

	context.subscriptions.push(
		vscode.commands.registerTextEditorCommand(EXTRACT_CLASS_COMMAND, (textEditor) =>
			new ExtractClassCommand(textEditor).execute(),
		),
	);
}

export function deactivate() {}
