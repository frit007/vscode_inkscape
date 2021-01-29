// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { configSnippets } from './configuration';
import { isInMathMode } from './text/text';
import {activate as activateInkscape} from './inkscapeWatch'

console.log(configSnippets);

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	activateInkscape(context);

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	// console.log('Congratulations, your extension "context-snippets" is now active!');

	// new vscode.DocumentSelector

	vscode.languages.registerCompletionItemProvider({language: 'latex'}, {
		provideCompletionItems: (doc, pos, token, context) => {
			let prefix = "";
			let postfix = "$0";
			
			let friendlyDoc :string[] = [];
			for (let index = 0; index < doc.lineCount; index++) {
				const element = doc.lineAt(index);
				friendlyDoc[index] = element.text;
			}
			
			// vscode.window.showInformationMessage(""+ pos.character);	

			if(!isInMathMode(friendlyDoc, pos.line, pos.character - 1)) {
				prefix = "\\$";
				postfix = "\\$$0";
			}

			let snippets = configSnippets?.map(snippet => ({
				label: snippet.prefix,
				insertText: new vscode.SnippetString(prefix + snippet.body + postfix),
				detail: snippet.description
			}))

			return snippets


			// return [{
			// 		label: "sqrt",
			// 		insertText: new vscode.SnippetString(prefix + '\\sqrt{$1}' + postfix), 
			// }]
		},
	})

	// vscode.workspace.onDidChangeTextDocument((e) => {
	// 	vscode.window.showInformationMessage("document changed");
	// 	// let textEditor = vscode.window.activeTextEditor;
	// 	// textEditor?.insertSnippet(new vscode.SnippetString('for (var ${1:i}=0; ${1:i}<len; ${1:i}++) { $0 }'), new vscode.Position(0, 0));
	// })

	// vscode.workspace.onDidOpenTextDocument((textDoc) => {

	// 	let textEditor = vscode.window.activeTextEditor;
	// 	let doc = textEditor?.document;
	// 	// we got selection!
	// 	// textEditor?.selection.

	// 	vscode.window.showInformationMessage("document open");
	
	// 	// console.log(e);
	// })

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	
	
	let disposable = vscode.commands.registerCommand('context-snippets.image_figure', () => {
		// The code you place here will be executed every time your command is executed

		let eol = vscode.window.activeTextEditor?.document.eol;

		let snippet = `\\begin{figure}[H]
	\\includegraphics{$1}
\\end{figure}
$0`

		vscode.window.activeTextEditor?.insertSnippet(new vscode.SnippetString(snippet), vscode.window.activeTextEditor.selection)

		vscode.commands.executeCommand("extension.pasteImage")

		// Display a message box to the user
		// vscode.window.showInformationMessage('Hello World from context-snippets!');
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}


// "onCommand:context-snippets.helloWorld",

// "commands": [
// 	{
// 		"command": "context-snippets.helloWorld",
// 		"title": "Hello World"
// 	}
// ]
