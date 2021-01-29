import * as assert from 'assert';
import {isInMathMode} from '../../text/text' 

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../../extension';

// suite('Extension Test Suite', () => {
// 	vscode.window.showInformationMessage('Start all tests.');

// 	test('Sample test', () => {
// 		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
// 		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
// 	});
// });

suite('Test isMathMode', () => {
	vscode.window.showInformationMessage('Start math mode tests');
	test('no math mode line', () => {
		assert.strictEqual(false, isInMathMode(["simple"], 0, 1));
	})
	test('math mode line', () => {
		assert.strictEqual(true, isInMathMode(["$simple$"], 0, 2));
	})
	test('multiline no math mode line', () => {
		assert.strictEqual(false, isInMathMode(["$simple$", "cu"], 1, 0));
	})

	test('test \[ enter math mode', () => {
		assert.strictEqual(true, isInMathMode(["\\[ yes math \\]"], 0, 3));
	})
	test('test \] leave math mode', () => {
		assert.strictEqual(false, isInMathMode(["\\[ yes math \\] leave math"], 0, 16));
	})
})
