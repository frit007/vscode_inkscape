import * as vscode from 'vscode';

const configuration = vscode.workspace.getConfiguration("context-snippets");

var y = vscode.workspace.getConfiguration().inspect("context-snippets");
// "nrt": {
//     "prefix": "nrt",
//     "body": "\\sqrt[${1:2}]{$2}",
//     "description": "sqrt"
// }

const x = vscode.workspace.getConfiguration().get("context-snippets.snippets");

export const configSnippets = configuration.get<LatexSnippet[]>('snippets')

export const latexExe = configuration.get<string>('inkscapeexe')|| "";
export const inkscapefolder = configuration.get<string>('inkscapefolder')|| "inscape";

export interface LatexSnippet {
    prefix: string;
    body: string;
    description?: string;
}
