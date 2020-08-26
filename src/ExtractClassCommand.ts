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

export class ExtractClassCommand {
	private textDocument: TextDocument = new TextDocument(this.textEditor);
	private classDeclaration: ClassDeclaration = this.createClassDeclaration();
	private quickPick: QuickPick = new QuickPick(this.classDeclaration);
	private sourceClassText = this.classDeclaration.getFullText();

	constructor(private textEditor: vscode.TextEditor) {}

	private createClassDeclaration(): ClassDeclaration {
		return new ClassDeclarationFactory(this.textEditor).create();
	}

	async execute(): Promise<void> {
		try {
			await this.tryExecute();
		} catch (error) {
			vscode.window.showErrorMessage(JSON.stringify(error));
		}
	}

	private async tryExecute(): Promise<void> {
		const fieldsToExtract = await this.quickPick.pickFieldsToExtract();
		if (!fieldsToExtract?.length) {
			vscode.window.showInformationMessage('Class extraction canceled');
			return;
		}
		const classRefactor = new ClassRefactor(new TypescriptClassNode(this.classDeclaration));
		const extractedClassRefactor = classRefactor.extractClass('ExtractedClass', fieldsToExtract);
		const result = `${classRefactor.serialize()}\n\n${extractedClassRefactor.serialize()}\n`;
		await this.textDocument.replace(this.sourceClassText, result);
	}
}

class TextDocument {
	constructor(private textEditor: vscode.TextEditor) {}

	async replace(searchValue: string, replaceValue: string): Promise<void> {
		const source = this.textEditor.document.getText();
		const result = source.replace(searchValue, replaceValue);
		await this.textEditor.edit((edit) => edit.replace(this.getFullDocumentRange(), result));
		await this.formatDocument();
	}

	private getFullDocumentRange(): vscode.Range {
		return new vscode.Range(new vscode.Position(0, 0), new vscode.Position(Infinity, Infinity));
	}

	private async formatDocument(): Promise<void> {
		const docUri = this.textEditor.document.uri;
		const textEdits = (await vscode.commands.executeCommand(
			'vscode.executeFormatDocumentProvider',
			docUri,
		)) as vscode.TextEdit[];
		const edit = new vscode.WorkspaceEdit();
		for (const textEdit of textEdits) {
			edit.replace(docUri, textEdit.range, textEdit.newText);
		}
		await vscode.workspace.applyEdit(edit);
	}
}

class ClassDeclarationFactory {
	constructor(private textEditor: vscode.TextEditor) {}

	create(): ClassDeclaration {
		const line = this.textEditor.document.lineAt(this.textEditor.selection.start);
		const className = line.text.match(/class\s\w+/)![0].replace('class ', '');
		const project = new Project();
		const file = project.createSourceFile('', this.textEditor.document.getText());
		return file.getClassOrThrow(className);
	}
}

class QuickPick {
	constructor(private classDeclaration: ClassDeclaration) {}

	async pickFieldsToExtract(): Promise<string[] | undefined> {
		const selectedItems = await vscode.window.showQuickPick(
			this.classDeclaration.getInstanceMembers().map((field) => this.getFieldName(field)),
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
