import { type } from 'os';
import {create} from 'xmlbuilder2' 
import { XMLBuilder } from 'xmlbuilder2/lib/interfaces';
import * as fs from 'fs'
import { off } from 'process';

export interface SvgGeneratorOptions {
    documentWidth ?:number;
    documentHeight ?:number;
}

export class SvgGenerator {
    private filename:string

    private root :XMLBuilder
    private svg: XMLBuilder
    private group:XMLBuilder
    private nextId = 1000

    private documentWidth :number;
    private documentHeight :number;

    private getId() {
        return this.nextId ++;
    }

    constructor(filename: string, options?: SvgGeneratorOptions) {
        this.documentWidth = options?.documentWidth|| 180;
        this.documentHeight = options?.documentHeight|| 100;

        this.filename = filename;
        this.root = create({version: '1.0', encoding:"UTF-8", standalone: "no"})

        // svg information
        this.svg = this.root.ele("svg", {
            "xmlns:dc":"http://purl.org/dc/elements/1.1/",
            "xmlns:cc":"http://creativecommons.org/ns#",
            "xmlns:rdf":"http://www.w3.org/1999/02/22-rdf-syntax-ns#",
            "xmlns:svg":"http://www.w3.org/2000/svg",
            "xmlns":"http://www.w3.org/2000/svg",
            "xmlns:sodipodi":"http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd",
            "xmlns:inkscape":"http://www.inkscape.org/namespaces/inkscape",
            "width": this.documentWidth + "mm",
            "height": this.documentHeight + "mm",
            "viewBox": `0 0 ${this.documentWidth} ${this.documentHeight}`,
            "version":"1.1",
            "id":"svg8",
            "sodipodi:docname": this.filename,
            "inkscape:version":"1.0.2 (e86c870879, 2021-01-15)",
        })

        // defs
        this.svg.ele("defs", {id: "defs"})

        this.svg.ele("sodipodi:namedview", {
            "id":"base",
            "pagecolor":"#ffffff",
            "bordercolor":"#666666",
            "borderopacity":"1.0",
            "inkscape:pageopacity":"0.0",
            "inkscape:pageshadow":"2",
            "inkscape:zoom":"0.35",
            "inkscape:cx":"387.14286",
            "inkscape:cy":"611.42857",
            "inkscape:document-units":"mm",
            "inkscape:current-layer":"layer1",
            "showgrid":"false",
            "inkscape:window-width":"1346",
            "inkscape:window-height":"1198",
            "inkscape:window-x":"2128",
            "inkscape:window-y":"81",
            "inkscape:window-maximized":"0",
            "inkscape:document-rotation":"0",
        })

        this.svg
            .ele("metadata", {id:"metadata5"})
            .ele("rdf:RDF")
            .ele("cc:Work", {"rdf:about":""})
                .ele("dc:format").txt("image/svg+xml").up()
                .ele("dc:type", {"rdf:resource": "http://purl.org/dc/dcmitype/StillImage"}).up()
                .ele("dc:title")

        this.group = this.svg.ele("g", {
            "inkscape:label":"Layer 1",
            "inkscape:groupmode":"layer",
            "id":"layer1",
            "transform":"translate(0, 0)",
        })
    }

    defaultLineOptions() {
        return {
            "fill":"none",
            "stroke":"#000000",
            "stroke-width":"0.264583px",
            "stroke-linecap":"butt",
            "stroke-linejoin":"miter",
            "stroke-opacity":"1"
        }
    }
    defaultTextOptions() {
        return {
            "font-style":"normal",
            "font-weight":"normal",
            "font-size":"8px",
            "line-height":"1.25",
            "font-family":"sans-serif",
            "letter-spacing":"0px",
            "word-spacing":"0px",
            "fill":"#000000",
            "fill-opacity":"1",
            "stroke":"none",
            "stroke-width":"0.264583",
        }
    }

    optionsToStyle(options: object) {
        let style = "";

        for(const [key, value] of Object.entries(options)) {
            style += key + ":" + value+ ";"
        }

        return style;
    }

    addLine(startX:number, startY:number, endX :number, endY:number, lineOptions ?: object) : XMLBuilder {
        return this.group.ele("path", {
            style: this.optionsToStyle({...this.defaultLineOptions(), ...lineOptions}),
            d: `M ${startX},${startY} L ${endX},${endY}`,
            id: "path" + this.getId()
        })
    }

    addText(x:number, y:number, text:string, textOptions ?: object) : XMLBuilder{
        return this.group.ele("text", {
            "xml:space":"preserve",
            "style":this.optionsToStyle({...this.defaultTextOptions(), ...textOptions}),
            "x":x,
            "y":y,
            "id":"text" + this.getId(),
        }).ele("tspan", {
            "sodipodi:role":"line",
            "id":"tspan" + this.getId(),
            "x":x,
            "y":y,
            "style":this.optionsToStyle({...this.defaultTextOptions(), ...textOptions}),
        }).txt(text)
    }

    addArrow(startX:number, startY:number, endX :number, endY:number, lineOptions ?: object) :XMLBuilder {
        let options :any = {
            ...lineOptions, 
            "marker-end": "url(#Arrow1Lend)",
            "stroke-miterlimit":"4",
            "stroke-dasharray":"none",
        };
        return this.addLine(startX, startY, endX, endY, options);
    }
    private asCloseToZeroAsPossible(min: number, max:number):number {
        if(min <= 0 && 0 <= max) {
            return 0;
        }
        if(min >= 0) {
            return min;
        }
        return max;
    }

    add2dGraph(focusX :number, focusY :number, length: number) {
        
        let minWidth = this.documentWidth < this.documentHeight ? this.documentWidth : this.documentHeight

        let xLength = Math.floor((this.documentWidth / minWidth) * length)
        let yLength = Math.floor((this.documentHeight / minWidth) * length)
        
        let minX = focusX - Math.floor(xLength/2)
        let maxX = focusX + Math.ceil(xLength/2)
        let minY = focusY - Math.floor(yLength/2)
        let maxY = focusY + Math.ceil(yLength/2)

        let borderOffset = 5;

        let distance = (minWidth- (borderOffset *2)) / length ;

        let offsetX = -minX * distance + borderOffset //minX * distance
        let offsetY = -minY * distance + borderOffset //minY * distance

        let midX = this.asCloseToZeroAsPossible(minX, maxX)
        let midY = this.asCloseToZeroAsPossible(minY, maxY)
        // let midXPos = (midX - minX) * distance + borderOffset
        // let midYPos = (midY - minY) * distance + borderOffset
        let midXPos = midX * distance + offsetX
        let midYPos = midY * distance + offsetY
        
        let markerLength = 3;
        this.addArrow(0, midYPos, this.documentWidth, midYPos)
        this.addArrow(midXPos, this.documentHeight, midXPos, 0)

        for(let x = minX; x <= maxX; x++) {
            if (x != midX) {
                let xPos = x * distance + offsetX;
                this.addLine(xPos, midYPos + markerLength, xPos, midYPos - markerLength)
                this.addText(xPos +3, midYPos + 5, x  +"");
            }
        }

        for(let y = minY; y <= maxY; y++) {
            if (y != midY) {
                let yValue = minY - y + maxY;
                let yPos = y * distance + offsetY;
                this.addLine(midXPos + markerLength, yPos, midXPos - markerLength, yPos)
                this.addText(midXPos + 5, yPos, yValue  + "");
            }
        }
    }
    
    toString() {
        return this.root.end({prettyPrint: false})
    }

    toFile(path: string) :Promise<boolean> {
        return new Promise((resolve, reject) => {
            fs.writeFile(path, this.toString(), (err) => {
                if(err) {
                    reject(err)
                    return;
                }
                resolve(true)
            })
        })
    }

}



