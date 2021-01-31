import * as vscode from 'vscode'
import * as cp from 'child_process'
import { inkscapefolder, latexExe } from './configuration';
import * as path  from 'path'

import * as fs from 'fs'
import { rejects } from 'assert';
import { fileURLToPath } from 'url';
import { debug } from 'console';



// used to focus the last text document, this is necessary because we need to focus the correct document when running build
let lastLatexDoc : vscode.TextDocument | undefined = undefined
let lastLatexDocViewColumn : vscode.ViewColumn| undefined = undefined
// make sure we don't watch the same folder twice. Needs to be updated to support multiple folders
let isWatching = false;
// 
let ignoreUpdates = false;

function setActivePath(editor : vscode.TextEditor | undefined) {
    if(!editor) {
        return;
    }
    let fsPath = editor.document.uri.fsPath ;
    if(path.extname(fsPath) == ".tex") {
        lastLatexDoc = editor.document;
        lastLatexDocViewColumn = editor.viewColumn
    }
}

export function activate(context: vscode.ExtensionContext) {

    setActivePath(vscode.window.activeTextEditor)
    vscode.window.onDidChangeActiveTextEditor( (newEditor)=> {
        setActivePath(newEditor);
    })

    // try watching directory if it already exists
    watchDirectory();

    let disposable = vscode.commands.registerCommand("context-snippets.inkscape", () => {

        let filename = containsFile();
        if(filename == null || !filename.includes('.pdf')) {
            dialog()
            return;
        }

        let svgPath = convertPdfPathToSvg(filename)
        
        if(!fs.existsSync(svgPath)) {
            dialog()
            return;
        }

        openInkscapeFile(svgPath)
        // start with opening inkscape
        // then we want to create a template and save it in the directory
    })

    context.subscriptions.push(disposable);
}

function convertPdfPathToSvg(filename: string) {
    return path.join(workspaceFolder(), path.dirname(filename), path.parse(filename).name + ".svg")
}

function getTextBetweenBrackets(line :string, pos:number) :string | null{
    
    let start = 0;
    let end = 0;

    let walk = pos;
    while(true) {
        if(line[walk] === "{") {
            start = walk;
            break;
        }
        walk--
        if(walk < 0) {
            return null;
        }
    }

    walk = pos;
    while(true) {
        if(line[walk] === "}") {
            end = walk;
            break;
        }
        walk++
        if(walk > line.length) {
            return null;
        }
    }

    return line.substring(start + 1, end);
}

function containsFile() : string | null {
    const editor = vscode.window.activeTextEditor;

    let lineNumber = editor?.selection.start.line || 0;
    let line = editor?.document.lineAt(lineNumber).text || "";

    return getTextBetweenBrackets(line, editor?.selection.start.character || 0);
}


function workspaceFolder(): string {
    if(vscode.workspace.workspaceFolders == undefined){
        return ""
    }
    return vscode.workspace.workspaceFolders[0].uri.fsPath
    
}

function svgFolder() : string {
    return path.join(workspaceFolder(), inkscapefolder)
}

function watchDirectory() {
    try {
        // todo figure out something when swithing workspaces?
        if(isWatching) {
            return;
        }
        // just in case unwatch the file first
        // fs.unwatchFile(filePath)
        fs.watch(svgFolder(), {recursive: true, persistent:false}, (eventType, filename) => {
            if(ignoreUpdates){
                return;
            }
            if(path.extname(filename) == ".svg") {
                // convert all svgs to pdfs
                exportToPdf(path.join(svgFolder(),filename));
            }
        })
        isWatching = true;
    } catch(e) {
        console.warn(e)
    }
}

function getTemplate(): string {
    return path.resolve(path.join(__dirname, "template.svg"))
}

function copyFile(src:string, dist:string):Promise<string> {
    return new Promise((resolve, reject) => {
        fs.mkdir(path.dirname(dist), (err) => {
            if(err) {
                reject(err)
            }
            fs.copyFile(src, dist, fs.constants.COPYFILE_EXCL, (err) => {
                if(err) {
                    reject(err)
                }
                resolve("success");
            })
        })
    } )
}

async function dialog() {
    
    let filename = await vscode.window.showInputBox({value: "",prompt:"Figure name"})
    if(filename === undefined) {
        // if they cancelled the dialog then quit
        return;
    }

 
    let snippet = `\\begin{figure}[ht]
    \\centering
    \\includegraphics{${path.join(inkscapefolder, path.parse(filename).name + ".pdf").replace(/\\/g, "/")}}
    \\caption{\${1:${filename}}}\\label{fig:\${2:${filename}}}
\\end{figure}
$0`

		vscode.window.activeTextEditor?.insertSnippet(new vscode.SnippetString(snippet), vscode.window.activeTextEditor.selection)


    let templatePath = getTemplate();
    
    let svgPath = path.join(svgFolder(), filename + ".svg")

    try {
        ignoreUpdates = true
        await copyFile(getTemplate(), svgPath)
    } catch(e) {
        vscode.window.showErrorMessage(e)
    } finally {
        ignoreUpdates = false;
    }
    
    watchDirectory();

    openInkscapeFile(svgPath)
}
function openInkscapeFile(file: string) {
    let child = cp.exec(latexExe + " " + file)
}

function pdfPath(filepath:string):string {
    return path.join(svgFolder(), path.parse(filepath).name + ".pdf");
}

// function latexPdfPath(filepath:string):string {
//     return path.join(svgFolder(), path.parse(filepath).name+ "Latex" + ".pdf");
// }


function pdfTexFile(filepath:string) {
    return path.join(workspaceFolder(), inkscapefolder, path.parse(filepath).name + ".pdf_tex" )
}

// function readWriteAsync(filepath: string, done :any) {
//     fs.readFile(pdfTexFile(filepath), 'utf-8', function(err, data){
//         if (err) throw err;
  
//         // var newValue = data.replace(/^\./gim, 'myString');
//         let start = data.indexOf("\\put(0,0){\\includegraphics");
//         let end = data.indexOf("\n", start)
//         let newValue = data.substring(0, start) + `\\put(0,0){\\includegraphics[width=\\unitlength,page=1]{${inkscapefolder + "/" + path.parse(filepath).name + ".pdf"}}}%
//         ` + data.substring(end)
  
//       fs.writeFile(pdfTexFile(filepath), newValue, 'utf-8', function (err) {
//         if (err) throw err;
//         console.log('filelistAsync complete');
//         done()
//       });
//     });
// }


function exportToPdf(filepath: string) {
    // --export-latex
    // let command = `${latexExe} ${filepath} --export-area-page --export-dpi 300 --export-pdf ${pdfPath(filepath)} `
    // let command = `${latexExe} ${filepath} --export-area-page --export-dpi 300 --export-type="pdf" ${pdfPath(filepath)} `
    let command = `${latexExe} "${filepath}" --export-area-page --export-dpi 300 --export-type="pdf" --export-latex --export-filename "${pdfPath(filepath)}"`
    console.log(command)
    // cp.exec(command2)

    cp.exec(command, async (e) => {
        if(e) {
            console.error(e)
            return;
        }

        let command = "latex-workshop.build"
        let hasCommand = (await vscode.commands.getCommands()).filter((name) => name === command).length != 0
        if(hasCommand) {
            if(lastLatexDoc) {
                // console.log("lastdoc",lastLatexDoc)
                vscode.window.showTextDocument(lastLatexDoc, lastLatexDocViewColumn).then(() => {
                    vscode.window.showInformationMessage("rebuild latex");
                    vscode.commands.executeCommand(command);
                })
            }
            // setTimeout(() => {
            // }, 300)
        }
        // readWriteAsync(filepath, async () => {
        // })

    })
    // '--export-area-page',
    // '--export-dpi', '300',
    // '--export-pdf', pdf_path,
    // '--export-latex', filepath
}
