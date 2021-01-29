import { DocumentHighlight } from "vscode";

export function isInMathMode(document: string[], line :number, position: number) {
    let isInMathMode = false;

    for(let currentLine = 0; currentLine < document.length; currentLine++) {
        let lineText = document[currentLine];
        for (let currentPosition = 0; currentPosition < lineText.length; currentPosition++) {
            let currentChar = lineText[currentPosition];
            let lastChar = lineText[currentPosition-1];
            if(currentChar == "$" && lastChar != "\\") {
                isInMathMode = !isInMathMode;
            }
            
            if(currentChar == "[" && lastChar == "\\") {
                isInMathMode = true;
            }

            if(currentChar == "]" && lastChar == "\\") {
                isInMathMode = false;
            }
            
            if(currentLine == line && position == currentPosition) {
                return isInMathMode;
            }
        }
    }

    return isInMathMode;
}