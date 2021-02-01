import * as vscode from 'vscode';

const configuration = vscode.workspace.getConfiguration("context-snippets");

export const configSnippets = configuration.get<LatexSnippet[]>('snippets')

export const latexExe = configuration.get<string>('inkscapeexe')|| "";
export const inkscapefolder = configuration.get<string>('inkscapefolder')|| "inscape";

export interface LatexSnippet {
    prefix: string;
    body: string;
    description?: string;
}
