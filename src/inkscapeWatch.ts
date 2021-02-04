import * as vscode from 'vscode'
import * as cp from 'child_process'
import { inkscapefolder, latexExe } from './configuration';
import * as path  from 'path'

import * as fs from 'fs'
import { rejects } from 'assert';
import { fileURLToPath } from 'url';
import { debug } from 'console';
import { SvgGenerator } from './svgGenerator';



// used to focus the last text document, this is necessary because we need to focus the correct document when running build
let lastLatexDoc : vscode.TextDocument | undefined = undefined
let lastLatexDocViewColumn : vscode.ViewColumn| undefined = undefined
// make sure we don't watch the same folder twice. Needs to be updated to support multiple folders
let isWatching = false;

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

    let disposable3 = vscode.commands.registerCommand("context-snippets.inkscape-graph", () => {
        let filename = currentlyHoveredFile();
        if(filename == null || !fs.existsSync(svgPath(filename.text))) {
            generateFigure()
            return;
        }

        openInkscapeFile(filename.text)
    })

    let disposable = vscode.commands.registerCommand("context-snippets.inkscape", () => {

        let filename = currentlyHoveredFile();
        if(filename == null || !fs.existsSync(svgPath(filename.text))) {
            dialog()
            return;
        }

        openInkscapeFile(filename.text)
        // start with opening inkscape
        // then we want to create a template and save it in the directory
    })

    let disposable2 = vscode.commands.registerCommand("context-snippets.rename-inkscape", () => {
        let filename = currentlyHoveredFile();
        if(!filename) {
            vscode.window.showErrorMessage("Please place your cursor on the file you want to rename")
            return;
        }
        
        if(!fs.existsSync(svgPath(filename.text))) {
            vscode.window.showErrorMessage("The file doesn't exist, please place your cursor on the file you want to rename")
            return;
        }
        renameInkscapeFile(filename.text);
    })



    context.subscriptions.push(disposable);
    context.subscriptions.push(disposable2);
    context.subscriptions.push(disposable3);
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

function svgPath(filename: string) {
    return path.join(svgFolder(), path.parse(filename).name + ".svg")
}

function pdfPath(filepath:string):string {
    return path.join(svgFolder(), path.parse(filepath).name + ".pdf");
}
function pdfTexPath(filepath:string):string {
    return path.join(svgFolder(), path.parse(filepath).name + ".pdf_tex");
}

interface SelectedTextPosition {
    // character in line
    start: number
    end: number
    text: string
}

function getTextBetweenBrackets(line :string, pos:number) :SelectedTextPosition | null{
    
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

    return {
        start: start + 1, 
        end,
        text: line.substring(start + 1, end), 
    };
}

function currentlyHoveredFile() : SelectedTextPosition | null {
    const editor = vscode.window.activeTextEditor;

    let lineNumber = editor?.selection.start.line || 0;
    let line = editor?.document.lineAt(lineNumber).text || "";

    return getTextBetweenBrackets(line, editor?.selection.start.character || 0);
}
function replaceCurrentlyHoveredFile(currentFile: string, newName: string) {
    const editor = vscode.window.activeTextEditor;

    let lineNumber = editor?.selection.start.line || 0;
    let line = editor?.document.lineAt(lineNumber).text || "";

    let text = getTextBetweenBrackets(line, editor?.selection.start.character || 0);
    if(text?.text == currentFile) {
        vscode.window.activeTextEditor?.edit((editBuilder) => {
            if(text != null) {
                const startPos = new vscode.Position(lineNumber, text.start);
                const endPos = new vscode.Position(lineNumber, text.end);
                editBuilder.replace(new vscode.Range(startPos, endPos), newName)
            }
        })
    }
}





function watchDirectory() {
    try {
        // todo figure out something when switching workspaces?
        if(isWatching) {
            return;
        }

        fs.watch(svgFolder(), {recursive: true, persistent:false}, (eventType, filename) => {

            if(path.extname(filename) == ".svg") {
                // convert all svgs to pdfs
                exportToPdf(filename);
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
            // if(err) {
            //     reject(err)
            //     return
            // }
            fs.copyFile(src, dist, fs.constants.COPYFILE_EXCL, (err) => {
                if(err) {
                    reject(err)
                    return;
                }
                resolve("success");
            })
        })
    } )
}

function readableFile(file: string) :string {
    return file.split('_').join(' ')
}

async function generateFigure() {
    let filename = await vscode.window.showInputBox({value: "",prompt:"Figure name"})
    if(filename === undefined) {
        // if they cancelled the dialog then quit
        return;
    }

    let snippet = `\\begin{figure}[H]
    \\centering
    \\incfig{${path.parse(filename).name}}
    \\caption{\${1:${readableFile(filename)}}}
    \\label{fig:\${2:${filename}}}
\\end{figure}
$0`


    vscode.window.activeTextEditor?.insertSnippet(new vscode.SnippetString(snippet), vscode.window.activeTextEditor.selection)

    try {
        await copyFile(getTemplate(), svgPath(filename))
    } catch(e) {
        vscode.window.showErrorMessage(e)
    }

    watchDirectory();

    let generator = new SvgGenerator(filename);

    generator.add2dGraph(-2,-2,5,5)

    await generator.toFile(svgPath(filename))

    openInkscapeFile(filename)
}

async function dialog() {
    
    let filename = await vscode.window.showInputBox({value: "",prompt:"Figure name"})
    if(filename === undefined) {
        // if they cancelled the dialog then quit
        return;
    }

 
//     let snippet = `\\begin{figure}[ht]
//     \\centering
//     \\includegraphics{${path.join(inkscapefolder, path.parse(filename).name + ".pdf").replace(/\\/g, "/")}}
//     \\caption{\${1:${filename}}}\\label{fig:\${2:${filename}}}
// \\end{figure}
// $0`
let snippet = `\\begin{figure}[H]
    \\centering
    \\incfig{${path.parse(filename).name}}
    \\caption{\${1:${filename}}}
    \\label{fig:\${2:${filename}}}
\\end{figure}
$0` 

    vscode.window.activeTextEditor?.insertSnippet(new vscode.SnippetString(snippet), vscode.window.activeTextEditor.selection)
    
    let svgPath = path.join(svgFolder(), filename + ".svg")

    try {
        await copyFile(getTemplate(), svgPath)
    } catch(e) {
        vscode.window.showErrorMessage(e)
    }
    
    watchDirectory();

    openInkscapeFile(svgPath)
}
function openInkscapeFile(file: string) {
    let command=  latexExe + " \"" + svgPath(file)+"\"";
    console.log(command)
    let child = cp.exec(command, (err) => {
        if(err) {
            console.error(err)
        }
    })
}





// function pdfTexFile(filepath:string) {
//     return path.join(workspaceFolder(), inkscapefolder, path.parse(filepath).name + ".pdf_tex" )
// }

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


let cooldown = new Map<string, number>()

function exportToPdf(filepath: string) {
    let lastUse = cooldown.get(filepath) || 0;
    cooldown.set(filepath, Date.now())
    
    if(Date.now() - lastUse < 500) {
        console.log("skip double work ", lastUse);
        return;
    }
    // --export-latex
    // let command = `${latexExe} ${filepath} --export-area-page --export-dpi 300 --export-pdf ${pdfPath(filepath)} `
    // let command = `${latexExe} ${filepath} --export-area-page --export-dpi 300 --export-type="pdf" ${pdfPath(filepath)} `
    let command = `${latexExe} "${svgPath(filepath)}" --export-area-page --export-dpi 300 --export-type="pdf" --export-latex --export-filename "${pdfPath(filepath)}"`
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

async function renameInkscapeFile(filename:string) {
    let newFileName = await vscode.window.showInputBox({value: path.parse(filename).name, prompt:"New file name"})
    if(newFileName === undefined || filename.length == 0) {
        // if they cancelled the dialog then quit
        return;
    }

    if(fs.existsSync(svgPath(newFileName))) {
        vscode.window.showWarningMessage("filename already taken");
        return;
    }

    try {
        await copyFile(svgPath(filename), svgPath(newFileName))
    } catch(e) {
        vscode.window.showErrorMessage("Could not copy the file")
        return
    }

    fs.unlink(svgPath(filename),(err) => {

    })
    fs.unlink(pdfPath(filename),(err) => {
        
    })
    fs.unlink(pdfTexPath(filename),(err) => {
        
    })

    replaceCurrentlyHoveredFile(filename, newFileName)
}