import * as vscode from 'vscode'
import * as cp from 'child_process'
import { inkscapefolder, latexExe } from './configuration';
import * as path  from 'path'

export function activate(context: vscode.ExtensionContext) {

    let disposable = vscode.commands.registerCommand("context-snippets.inkscape", () => {
        // start with opening inkscape
        // then we want to create a template and save it in the directory
        
        dialog()


    })

    context.subscriptions.push(disposable);
}

function getTemplate(): string {
    return path.resolve(__dirname + '/template.svg')
}

async function dialog() {
    
    let filename = await vscode.window.showInputBox({value: "",prompt:"Figure name"}) || ""

    let templatePath = getTemplate();

    vscode.window.showInformationMessage(templatePath);
    vscode.window.showInformationMessage(filename);

    cp.exec(latexExe, (a,b,c) => {
        vscode.window.showInformationMessage(latexExe);
    })
}

export function exportToPdf(filepath: string, pdf_path:string) {
    // --export-latex
    cp.exec(`${latexExe} ${filepath} --export-area-page --export-dpi 300 --export-pdf ${pdf_path} `)
    // '--export-area-page',
    // '--export-dpi', '300',
    // '--export-pdf', pdf_path,
    // '--export-latex', filepath
}
