import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('extract-class.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from extract-class!');
	});
	context.subscriptions.push(disposable);
}

export function deactivate() {}
