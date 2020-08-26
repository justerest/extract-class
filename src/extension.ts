import * as vscode from 'vscode';
import {
	Project,
	ClassDeclaration,
	ClassInstanceMemberTypes,
	Scope,
	StructureKind,
} from 'ts-morph';
import { ClassRefactor } from './ClassRefactor';
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
	private quickPick: QuickPick = new QuickPick();

	constructor(private textEditor: vscode.TextEditor) {}

	async execute(): Promise<void> {
		try {
			await this.tryExecute();
		} catch (error) {
			vscode.window.showErrorMessage(JSON.stringify(error));
		}
	}

	private async tryExecute(): Promise<void> {
		const classDeclaration = this.getSelectedClassDeclaration();
		const classDeclarationSource = classDeclaration.getFullText();
		const methodsToExtract = await this.showQuickPick(classDeclaration);
		if (!methodsToExtract?.length) {
			vscode.window.showInformationMessage('Class extraction canceled');
			return;
		}
		const classRefactor = new ClassRefactor(new TypescriptClassNode(classDeclaration));
		const extractedClassRefactor = classRefactor.extractClass('ExtractedClass', methodsToExtract);
		await this.replace(
			classDeclarationSource,
			`\n\n${classRefactor.serialize()}\n${extractedClassRefactor.serialize()}\n`,
		);
	}

	private getSelectedClassDeclaration(): ClassDeclaration {
		const line = this.textEditor.document.lineAt(this.textEditor.selection.start);
		const className = line.text.match(/class\s\w+/)![0].replace('class ', '');
		const project = new Project();
		const file = project.createSourceFile('', this.textEditor.document.getText());
		return file.getClassOrThrow(className);
	}

	private async showQuickPick(classDeclaration: ClassDeclaration): Promise<string[] | undefined> {
		return this.quickPick.showMethods(classDeclaration);
	}

	private async replace(searchValue: string, replaceValue: string): Promise<void> {
		const source = this.textEditor.document.getText();
		const result = source.replace(searchValue, replaceValue);
		await this.textEditor.edit((edit) => edit.replace(this.getFullDocumentRange(), result));
		await this.formatDocument();
	}

	private getFullDocumentRange(): vscode.Range {
		return new vscode.Range(new vscode.Position(0, 0), new vscode.Position(Infinity, Infinity));
	}

	private async formatDocument(): Promise<void> {
		await vscode.commands.executeCommand(
			'vscode.executeFormatDocumentProvider',
			this.textEditor.document.uri,
		);
	}
}

export class QuickPick {
	constructor() {}

	async showMethods(classDeclaration: ClassDeclaration): Promise<string[] | undefined> {
		const selectedItems = await vscode.window.showQuickPick(
			classDeclaration.getInstanceMembers().map((field) => this.getFieldName(field)),
			{ placeHolder: 'Select methods to extract', canPickMany: true },
		);
		return selectedItems?.map((item) => item.match(/\w+/)?.[0] ?? '');
	}

	private getFieldName(field: ClassInstanceMemberTypes): string {
		const scope = field.getScope();
		const scopeSymbol = scope === Scope.Public ? '+' : scope === Scope.Protected ? '#' : '-';
		const signatureSymbol = field.getStructure().kind === StructureKind.Method ? '()' : '';
		return `${scopeSymbol}${field.getName()}${signatureSymbol}`;
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
