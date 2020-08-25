import * as vscode from 'vscode';
import { Project, ClassDeclaration } from 'ts-morph';
import { ClassCode } from './ClassCode';
import { TypescriptClassNode } from './TypescriptClassNode';

const COMMAND = 'extract-class.extract-class';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider('typescript', new ExtractClassActionProvider(), {
			providedCodeActionKinds: [vscode.CodeActionKind.RefactorExtract],
		}),
	);

	context.subscriptions.push(
		vscode.commands.registerTextEditorCommand(COMMAND, (textEditor) =>
			new ExtractClassVSCodeCommand(textEditor).execute(),
		),
	);
}

export function deactivate() {}

export class ExtractClassVSCodeCommand {
	constructor(private textEditor: vscode.TextEditor) {}

	async execute(): Promise<void> {
		const classDeclaration = this.getSelectedClassDeclaration();
		const classDeclarationSource = classDeclaration.getFullText();
		const methodsToExtract = await vscode.window.showQuickPick(
			[...classDeclaration.getInstanceMembers().map((field) => field.getName())],
			{ placeHolder: 'Select methods to extract', canPickMany: true },
		);
		if (!methodsToExtract?.length) {
			vscode.window.showInformationMessage('Class extraction canceled');
			return;
		}
		const classCode = new ClassCode(new TypescriptClassNode(classDeclaration));
		const extractedClassCode = classCode.extractClass('ExtractedClass', methodsToExtract);
		this.replace(
			classDeclarationSource,
			`\n\n${classCode.serialize()}\n${extractedClassCode.serialize()}\n`,
		);
	}

	private getSelectedClassDeclaration(): ClassDeclaration {
		const line = this.textEditor.document.lineAt(this.textEditor.selection.start);
		const className = line.text.match(/class\s\w+/)![0].replace('class ', '');
		const project = new Project();
		const file = project.createSourceFile('', this.textEditor.document.getText());
		return file.getClassOrThrow(className);
	}

	private replace(searchValue: string, replaceValue: string): void {
		const source = this.textEditor.document.getText();
		const result = source.replace(searchValue, replaceValue);
		this.textEditor.edit((edit) => edit.replace(this.getFullDocumentRange(), result));
		this.formatDocument();
	}

	private getFullDocumentRange(): vscode.Range {
		return new vscode.Range(new vscode.Position(0, 0), new vscode.Position(Infinity, Infinity));
	}

	private formatDocument(): void {
		console.warn('+formatDocument() not implemented');
	}
}

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
			command: COMMAND,
			title: 'Extract class',
			tooltip: 'Select instance members to extract',
		};
		return action;
	}
}
