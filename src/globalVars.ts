/*
 * This file is part of OverPy (https://github.com/Zezombye/overpy).
 * Copyright (c) 2019 Zezombye.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

// @ts-check
import { mapKw } from "./data/maps.js";
import { opyKeywords } from "./data/opy/keywords.js";
import { camelCaseToUpperCase } from "./utils/other.js";


"use strict";
import { QuickJSContext, getQuickJS } from "quickjs-emscripten";
import { funcKw } from "./data/other.js";
import { constantValues } from "./data/constants.js";
import { FileStackMember, OWLanguage, Subroutine, Variable } from "./types.js";
import { Ast } from "./utils/ast.js";


export var globalVariables: Variable[];
export var playerVariables: Variable[];
export var subroutines: Subroutine[];
export var currentLanguage: OWLanguage;

export const ELEMENT_LIMIT = 32768;
export const PAGE_SIZE = 100;
//If it is in a browser then it is assumed to be in debug mode.
// @ts-ignore
export const IS_IN_BROWSER = (typeof window !== "undefined");
// @ts-ignore
export const DEBUG_MODE = IS_IN_BROWSER && window.location.host !== "vscode.dev";
export var evalVm: QuickJSContext;

export async function createEvalVM() {
	let QuickJS = await getQuickJS()
	evalVm = QuickJS.newContext();

	// Reimplement `console.log` for use in debugging
	const logHandle = evalVm.newFunction("log", (...args) => {
		const nativeArgs = args.map(evalVm.dump);
		console.log(...nativeArgs);
	});

	const consoleHandle = evalVm.newObject();
	evalVm.setProp(consoleHandle, "log", logHandle);
	evalVm.setProp(evalVm.global, "console", consoleHandle);
	consoleHandle.dispose();
	logHandle.dispose();
}

//Compilation variables - are reset at each compilation.

/**
 * The absolute path of the folder containing the main file. Used for relative paths. */
export var rootPath: string;
export const setRootPath = (path: string) => rootPath = path;

//Global variables used to keep track of the name for the current array element/index.
//Should be null at the beginning and end of each rule; if not, throws an error. (for compilation and decompilation)
export var currentArrayElementName: string;
export const setCurrentArrayElementName = (name: string) => currentArrayElementName = name;
export var currentArrayIndexName: string;
export const setCurrentArrayIndexName = (name: string) => currentArrayIndexName = name;

/**
 * Set at each rule, to check whether it is legal to use "eventPlayer" and related. */
export var currentRuleEvent: string;
export const setCurrentRuleEvent = (event: string) => currentRuleEvent = event;

/**
 * @possibly_unused
 *
 * The encountered labels throughout the rule, to not have duplicate labels. Set at each rule. */
export var currentRuleLabels: string[];
export const resetCurrentRuleLabels = () => currentRuleLabels = [];
export const setCurrentRuleLabels = (newRuleLabels: string[]) => currentRuleLabels = newRuleLabels;

/**
 * The number of times the specified label is referenced. If that number is 0, then the label is considered as not accessed. */
export var currentRuleLabelAccess: Record<string, number>;
export const clearRuleLabelAccess = () => currentRuleLabelAccess = {};
export var currentRuleHasVariableGoto: boolean;
export const resetRuleHasVariableGoto = () => currentRuleHasVariableGoto = false;

//Optimization settings.
export var enableOptimization: boolean;
export const setOptimizationEnabled = (enabled: boolean) => enableOptimization = enabled;
export var optimizeForSize: boolean;
export const setOptimizationForSize = (size: boolean) => optimizeForSize = size;

/** Contains all macros. */
export var macros: any[];
export const resetMacros = () => macros = [];

export var encounteredWarnings: string[];
export var suppressedWarnings: string[];
export var globalSuppressedWarnings: string[];

/** A list of imported files, to prevent import loops.
 */
export var importedFiles: string[];

export var disableUnusedVars: boolean;

export var compiledCustomGameSettings: any;


/** The stack of the files (macros count as "files").
*/
export let fileStack: FileStackMember[];
export const setFileStack = (newFileStack: FileStackMember[]) => fileStack = newFileStack;
export const pushToFileStack = (newMember: FileStackMember) => fileStack.push(newMember);
export const popFromFileStack = (): FileStackMember | undefined => fileStack.pop();

/** An unique number for automatically generated labels. */
export var uniqueNumber: number;
export const incrementUniqueNumber = () => uniqueNumber++;

//Initialization directives for global and player variables.
export var globalInitDirectives: Ast[] = [];
export var playerInitDirectives: Ast[] = [];

/** Workshop setting names, as each name must be unique even if belonging to different categories. */
export var workshopSettingNames: string[] = [];

/** User-declared enums. */
export var enumMembers = {};

//Replacements for 0, 1, and Team.1. Those are functions that give exactly those values, and are able to be applied to all inputs. As such, they are not function dependent.
export var replacementFor0 = "";
export const setReplacementFor0 = (replacement: string) => replacementFor0 = replacement;
export var replacementFor1 = "";
export const setReplacementFor1 = (replacement: string) => replacementFor1 = replacement;
export var replacementForTeam1 = "";
export const setReplacementForTeam1 = (replacement: string) => replacementForTeam1 = replacement;

/** The number of elements the gamemode takes. */
export var nbElements: number;

/** For the weird behavior where element count goes up by 1 for every 2 hero literals in the parameters of an action argument. */
export var nbHeroesInValue: number;

/** The extensions that are activated in the current gamemode. */
export var activatedExtensions: string[];
/** The amount of available extension points. */
export var availableExtensionPoints: number;

//Decompilation variables


/** Global variable used for "skip", to keep track of where the skip ends.
  *
  * Is reset at each rule.
*/
export var decompilerGotos: Array<Object>;

/** Global variable used for the number of tabs.
 *
 * Is reset at each rule.
*/
export var nbTabs: number;

/** Global variable used to mark the action number of the last loop in the rule.
 *
 * Is reset at each rule.
*/
export var decompilationLabelNumber: number;


export function resetGlobalVariables(language: OWLanguage) {
	rootPath = "";
	currentArrayElementName = "";
	currentArrayIndexName = "";
	currentLanguage = language;
	currentRuleEvent = "";
	macros = [];
	fileStack = [];
	decompilerGotos = [];
	nbTabs = 0;
	globalVariables = [];
	playerVariables = [];
	subroutines = [];
	encounteredWarnings = [];
	suppressedWarnings = [];
	globalSuppressedWarnings = [];
	importedFiles = [];
	disableUnusedVars = false;
	compiledCustomGameSettings = "";
	enableOptimization = true;
	optimizeForSize = false;
	uniqueNumber = 1;
	globalInitDirectives = [];
	playerInitDirectives = [];
	workshopSettingNames = [];
	enumMembers = {};
	replacementFor0 = "";
	replacementFor1 = "";
	replacementForTeam1 = "";
	nbElements = 0;
	activatedExtensions = [];
	availableExtensionPoints = 0;
}

//Other constants

//Operator precedence, from lowest to highest.
export const operatorPrecedence: Record<string, number> = {
	"=": 1,
	"+=": 1,
	"-=": 1,
	"*=": 1,
	"/=": 1,
	"%=": 1,
	"**=": 1,
	"min=": 1,
	"max=": 1,
	"if": 2,
	"or": 3,
	"and": 4,
	"not": 5,
	"in": 7,
	"==": 7,
	"!=": 7,
	"<=": 7,
	">=": 7,
	">": 7,
	"<": 7,
	"+": 8,
	"-": 8,
	"*": 9,
	"/": 9,
	"%": 9,
	//unary plus/minus: 10,
	"**": 11,
};

export const astOperatorPrecedence: Record<string, number> = {
	"__ifThenElse__": 2,
	"__or__": 3,
	"__and__": 4,
	"__not__": 5,
	"__arrayContains__": 6,
	"__equals__": 6,
	"__inequals__": 6,
	"__lessThanOrEquals__": 6,
	"__greaterThanOrEquals__": 6,
	"__lessThan__": 6,
	"__greaterThan__": 6,
	"__add__": 7,
	"__subtract__": 7,
	"__multiply__": 8,
	"__divide__": 8,
	"__modulo__": 8,
	"__negate__": 9,
	"__raiseToPower__": 9,
}

//Text that gets inserted on top of all js scripts.
export const builtInJsFunctions = `
function vect(x,y,z) {
    return ({
        x:x,
        y:y,
        z:z,
        toString: function() {
            return "vect("+this.x+","+this.y+","+this.z+")";
        }
    });
}

export var Map = {${Object.keys(mapKw).map(x => camelCaseToUpperCase(x) + ":'Map."+camelCaseToUpperCase(x)+"'").join(",")}}
`;

export const builtInJsFunctionsNbLines = builtInJsFunctions.split("\n").length;

export const defaultVarNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ', 'AK', 'AL', 'AM', 'AN', 'AO', 'AP', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AV', 'AW', 'AX', 'AY', 'AZ', 'BA', 'BB', 'BC', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BK', 'BL', 'BM', 'BN', 'BO', 'BP', 'BQ', 'BR', 'BS', 'BT', 'BU', 'BV', 'BW', 'BX', 'BY', 'BZ', 'CA', 'CB', 'CC', 'CD', 'CE', 'CF', 'CG', 'CH', 'CI', 'CJ', 'CK', 'CL', 'CM', 'CN', 'CO', 'CP', 'CQ', 'CR', 'CS', 'CT', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DA', 'DB', 'DC', 'DD', 'DE', 'DF', 'DG', 'DH', 'DI', 'DJ', 'DK', 'DL', 'DM', 'DN', 'DO', 'DP', 'DQ', 'DR', 'DS', 'DT', 'DU', 'DV', 'DW', 'DX'];

//Sub0 to Sub127
export const defaultSubroutineNames = Array(128).fill("").map((e,i)=>i).map(x => "Sub"+x);

//Names that cannot be used for global variables or subroutines.
export const reservedNames = Object.keys(opyKeywords);
export const reservedSubroutineNames = Object.keys(opyKeywords);
for (var func in funcKw) {
	let funcArgs = funcKw[func].args;
	if (funcArgs === null) {
		reservedNames.push(func);
	} else if (funcArgs.length === 0) {
		reservedSubroutineNames.push(func);
	}
}

//Characters that are visually the same as normal ASCII characters (when uppercased), but make the string appear in "big letters" (the i18n font).
//For now, only greek letters and the "line separator" character.
//Let me know if you find any other such characters.
export const bigLettersMappings = {
	a: "Α",
	A: "Α",
	b: "Β",
	B: "Β",
	e: "Ε",
	E: "Ε",
	h: "Η",
	H: "Η",
	i: "Ι",
	I: "Ι",
	k: "Κ",
	K: "Κ",
	m: "Μ",
	M: "Μ",
	n: "Ν",
	N: "Ν",
	o: "Ο",
	O: "Ο",
	p: "Ρ",
	P: "Ρ",
	t: "Τ",
	T: "Τ",
	x: "Χ",
	X: "Χ",
	y: "Υ",
	Y: "Υ",
	z: "Ζ",
	Z: "Ζ",
	" ": "\u2028", //line separator
}

//Fullwidth characters
export var fullwidthMappings: { [id: string]: string; } = {
	" ": " ",
	"¥": "￥",
	"₩": "￦",
	"¢": "￠",
	"£": "￡",
	"¯": "￣",
	"¬": "￢",
	"¦": "￤",
}
for (var char of '!"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~') {
	fullwidthMappings[char] = String.fromCodePoint(char.charCodeAt(0)+0xFEE0);
}

//Combinations of 0x01 through 0x1F (excluding 0x09, 0x0A and 0x0D). Used for workshop settings to prevent duplicates.
//These characters render as zero-width spaces in Overwatch.
//For some reason, 0x0B and 0x0C aren't sorted according to their ascii value.
export var workshopSettingWhitespaceChars = [0x01,0x02,0x03,0x04,0x05,0x06,0x07,0x08,/*0x0b,0x0c,*/0x0e,0x0f,0x10,0x11,0x12,0x13,0x14,0x15,0x16,0x17,0x18,0x19,0x1a,0x1b,0x1c,0x1d]
export var workshopSettingWhitespace: string[] = []
for (var chr of workshopSettingWhitespaceChars) {
	workshopSettingWhitespace.push(String.fromCodePoint(chr));
	workshopSettingWhitespace.push(String.fromCodePoint(0x1e, chr));
	workshopSettingWhitespace.push(String.fromCodePoint(0x1f, chr));
}
workshopSettingWhitespace.sort();


export const typeTree : (string | Object | typeof constantValues)[] =
[
	{"Object": [
		"Player",
		{"float": [
			{"FloatLiteral": [
				{"IntLiteral": [
					"UnsignedIntLiteral",
					"SignedIntLiteral",
				]},
				{"UnsignedFloatLiteral": [
					"UnsignedIntLiteral",
				]},
				{"SignedFloatLiteral": [
					"SignedIntLiteral",
				]},
			]},
			{"unsigned float": [
				"unsigned int",
			]},
			{"signed float": [
				"signed int",
			]},
			{"int": [
				{"IntLiteral": [
					"UnsignedIntLiteral",
					"SignedIntLiteral",
				]},
				"unsigned int",
				"signed int",
			]}
		]},
		{"bool": ["BoolLiteral"]},
		"DamageModificationId",
		"HealingModificationId",
		"DotId",
		"HotId",
		"EntityId",
		"TextId",
		"HealthPoolId",
		"AssistId",
		"String",
		{"Direction": ["Vector"]},
		{"Position": ["Vector"]},
		{"Velocity": ["Vector"]},
		"Hero",
		"Map",
		"Team",
		"Gamemode",
		"Button",
		"Color",
	]},
	"Array",
	"void",
	"Type",

	"Lambda",
	"Label",
	"DictElem",
	"Raycast",

	"Subroutine",
	"GlobalVariable",
	"PlayerVariable",

	"HeroLiteral",
	"MapLiteral",
	"GamemodeLiteral",
	"TeamLiteral",
	"ButtonLiteral",
	"ColorLiteral",

	// {"StringLiteral": [
	// 	"LocalizedStringLiteral",
	// 	{"CustomStringLiteral": [
	// 		"FullwidthStringLiteral",
	// 		"BigLettersStringLiteral",
	// 		"PlaintextStringLiteral",
	// 		"CaseSensitiveStringLiteral",
	// 	]}
	// ]},

	"Value",
	"Raycast",

].concat(Object.keys(constantValues));

//Which types are suitable for a given type.
//For example, typeMatrix["float"] = ["float", "int", etc].
export const typeMatrix: Record<string, string[]> = {};

function fillTypeMatrix(tree: string | Record<string, any> ){
	if (typeof tree === "string") {
		typeMatrix[tree] = [tree];

	} else {
		var type = Object.keys(tree)[0];
		typeMatrix[type] = [type];
		for (var child of tree[type]) {
			fillTypeMatrix(child);
			if (typeof child === "string") {
				typeMatrix[type].push(...typeMatrix[child]);
			} else {
				typeMatrix[type].push(...typeMatrix[Object.keys(child)[0]]);
			}
		}
	}
}
for (var elem of typeTree) {
	fillTypeMatrix(elem);
}
typeMatrix["Vector"].push("Direction", "Position", "Velocity");

reservedNames.push(...Object.keys(typeMatrix));

export const reservedMemberNames = ["x", "y", "z"];

//An array of functions for ast parsing (to not have a 4k lines file with all the functions and be able to handle each function in a separate file).
export var astParsingFunctions: Record<string, (content: any) => any> = {};
