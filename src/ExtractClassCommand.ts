import * as vscode from 'vscode';
import { Project, ClassDeclaration, ParameterDeclaration } from 'ts-morph';
import { ClassRefactor } from './ClassRefactor';
import { TypescriptClassNode } from './TypescriptClassNode';
import { UmlNotation } from './UmlNotation';

export class ExtractClassCommand {
	private readonly extractingClassName = 'ExtractedClass';

	private selectedClass: SelectedClass = new SelectedClass(this.textEditor);
	private quickPick: QuickPick = new QuickPick(this.selectedClass);

	constructor(private textEditor: vscode.TextEditor) {}

	async execute(): Promise<void> {
		try {
			await this.tryExecute();
		} catch (error) {
			vscode.window.showErrorMessage(JSON.stringify(error));
		}
	}

	private async tryExecute(): Promise<void> {
		const fieldsToExtract = await this.quickPick.pickFieldsToExtract();
		if (fieldsToExtract?.length) {
			await this.selectedClass.extractClassAndWrite(this.extractingClassName, fieldsToExtract);
		} else {
			vscode.window.showInformationMessage('Class extraction canceled');
		}
	}
}

class SelectedClass {
	private textDocument: TextDocument = new TextDocument(this.textEditor);
	private node: ClassDeclaration = this.parseClassNodeAtCurrentLine();
	private sourceClassText = this.node.getFullText();

	constructor(private textEditor: vscode.TextEditor) {}

	private parseClassNodeAtCurrentLine(): ClassDeclaration {
		const line = this.textEditor.document.lineAt(this.textEditor.selection.start);
		const className = line.text.match(/class \w+/)![0].replace('class ', '');
		const project = new Project();
		const file = project.createSourceFile('', this.textEditor.document.getText());
		return file.getClassOrThrow(className);
	}

	getFieldUmlNotations(): UmlNotation[] {
		return this.node
			.getInstanceMembers()
			.filter((field) => !(field instanceof ParameterDeclaration))
			.map(UmlNotation.fromInstanceMember);
	}

	async extractClassAndWrite(className: string, fieldsToExtract: string[]): Promise<void> {
		const source = new ClassRefactor(new TypescriptClassNode(this.node));
		const extracted = source.extractClass(className, fieldsToExtract);
		const result = `${source.serialize()}\n\n${extracted.serialize()}\n`;
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

class QuickPick {
	constructor(private selectedClass: SelectedClass) {}

	async pickFieldsToExtract(): Promise<string[] | undefined> {
		const umlNotations = this.getFieldUmlNotations();
		const selectedItems = await vscode.window.showQuickPick(umlNotations, {
			placeHolder: 'Select methods to extract',
			canPickMany: true,
		});
		return selectedItems?.map(
			(fieldName) => UmlNotation.parseFieldNameFromUmlNotation(fieldName) ?? '',
		);
	}

	private getFieldUmlNotations(): string[] {
		return this.selectedClass.getFieldUmlNotations().map((field) => field.serialize());
	}
}
