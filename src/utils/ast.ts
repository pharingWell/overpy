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

"use strict";
// @ts-check
import { funcKw } from "../data/other.js";
import { currentRuleHasVariableGoto, currentRuleLabelAccess, fileStack } from "../globalVars.js";
import { error, functionNameToString } from "./logging.js";
import {FileStackMember, type ReturnType} from "../types.js";
import { isTypeSuitable } from "./types.js";

export class Ast {
    name: string;
    args: any[];
    children: any[];
    type: ReturnType | ReturnType[];
    numValue?: number;
    fileStack: FileStackMember[];
    argIndex = 0;
    childIndex = 0;
    wasParsed = false;
    ruleAttributes: {
        isDelimiter: boolean,
        isDisabled: boolean,
        name: string,
        event: string
    } & Record<string, any> = {isDelimiter: false, isDisabled: false, name: "", event: ""};
    doNotOptimize = false;
    originalName?: string;
    parent?: Ast;
    expectedType?: ReturnType | ReturnType[];

    constructor(name: string, args?: any[], children?: any[], type?: any) {
        if (name === null || name === undefined) {
            error("Got no name for AST");
        }
        this.name = name;
        this.args = args ? args : [];
        this.children = children ? children : [];

        if (!type) {
            if (name in funcKw) {
                this.type = funcKw[name].return;
            } else {
                this.type = "undefined";
                error("Unknown function name '"+name+"'");
            }
        } else {
            this.type = type;
        }
        if (isTypeSuitable("FloatLiteral", this.type, false)) {
            this.numValue = Number(name);
        }

        for (var arg of this.args) {
            //console.log(arg);
            if (!(arg instanceof Ast)) {
                console.log(arg);
                error("Arg '"+arg+"' of '"+name+"' is not an AST");
            }
            arg.parent = this;
        }
        for (var child of this.children) {
            if (!(child instanceof Ast)) {
                console.log(child);
                error("Child '"+child+"' of '"+name+"' is not an AST");
            }
            child.parent = this;
        }
        //console.log("Creating AST for '"+name+"', filestack = "+JSON.stringify(fileStack))
        this.fileStack = fileStack;
    }
}

//Used for when the body of a control flow statement will never execute, such as "if false".
export function makeChildrenUseless(children: Ast[]) {

    /*for (var i = 0; i < children.length; i++) {
        makeChildrenUseless(children[i].children);
        children[i].isPotentiallyUseless = true;
    }
    return;*/

    var foundLabel = false;

    //Recursively check through the tree to see if there are labels that we must decrement the amount of references to.
    function checkForDistanceTo(content) {
        for (var arg of content.args) {
            if (arg.name === "__distanceTo__") {
                currentRuleLabelAccess[arg.args[0].name]--;
            } else {
                checkForDistanceTo(arg);
            }
        }
    }

    function _makeChildrenUseless(children) {
        for (var i = 0; i < children.length; i++) {
            //Check if there is a label that is accessed at least once. If yes, then the actions below could still be executed; therefore, don't make them useless.

            if (foundLabel) {
                break;
            }
            checkForDistanceTo(children[i]);
            makeChildrenUseless(children[i].children);
            if (children[i].type === "Label") {
                if (currentRuleLabelAccess[children[i].name] > 0) {
                    foundLabel = true;
                }
            } else {
                children[i] = getAstForUselessInstruction();
            }
        }
    }

    //If the current rule has a variable goto, then we cannot make the isntructions useless, as we don't know whether they will execute.
    if (!currentRuleHasVariableGoto) {
        _makeChildrenUseless(children);
    }

    return children;

}

//https://workshop.elohell.gg/wiki/bRQhecrRn/Data+type+comparisons/
//Returns true if, when compared to "false", it returns true.
export function isDefinitelyFalsy(content) {
    if (["__emptyArray__", "false", "null"].includes(content.name)) {
        return true;
    }
    //Test for null vector: vect(0,0,0)
    /*if (content.name === "vect") {
        return (isDefinitelyFalsy(content.args[0]) && isDefinitelyFalsy(content.args[1]) && isDefinitelyFalsy(content.args[2]));
    }*/
    //Test for number 0
    if (content.name === "__number__") {
        return (content.args[0].numValue === 0);
    }
    //Test for arrays, cast as 1st element
    if (content.name === "__array__") {
        return isDefinitelyFalsy(content.args[0]);
    }
    return false;
}

//Returns true if, when compared to "false", it returns false.
//Not the exact opposite of isDefinitelyFalsy, as in most cases, we can't know either.
export function isDefinitelyTruthy(content) {
    if (content.name === "true") {
        return true;
    }
    //Test for null vector: vect(0,0,0)
    if (content.name === "vect") {
        return (isDefinitelyTruthy(content.args[0]) || isDefinitelyTruthy(content.args[1]) || isDefinitelyTruthy(content.args[2]));
    }
    //Test for number other than 0
    if (content.name === "__number__") {
        return (content.args[0].name !== 0);
    }
    //Test for arrays, cast as 1st element
    if (content.name === "__array__") {
        return isDefinitelyTruthy(content.args[0]);
    }
    return false;
}

/**
 * Determines whether the two provided ASTs always evaluate to the same value.
 * @param {Ast} a
 * @param {Ast} b
 * @remarks This function will check for random value functions, and will return false if any are found.
 * @returns Whether AST A and AST B always evaluate to the same value.
 */
export function areAstsAlwaysEqual(a, b) {
    if (a.name !== b.name) {
        return false;
    }
    if (["random.randint", "random.uniform", "random.choice", "random.shuffle"].includes(a.name)) {
        return false;
    }
    if (a.args.length !== b.args.length) {
        return false;
    }
    for (var i = 0; i < a.args.length; i++) {
        if (!areAstsAlwaysEqual(a.args[i], b.args[i])) {
            return false;
        }
    }
    return true;
}

export function astContainsFunctions(ast, functionNames, errorOnTrue=false) {

    if (functionNames.includes(ast.name)) {
        if (errorOnTrue) {
            error("Cannot have the "+functionNameToString(ast)+" in this context");
        }
        return true;
    }
    for (var arg of ast.args) {
        if (astContainsFunctions(arg, functionNames)) {
            if (errorOnTrue) {
                error("Cannot have the "+functionNameToString(ast)+" in this context");
            }
            return true;
        }
    }
    for (var child of ast.children) {
        if (astContainsFunctions(child, functionNames)) {
            if (errorOnTrue) {
                error("Cannot have the "+functionNameToString(ast)+" in this context");
            }
            return true;
        }
    }

    return false;
}


//Most functions, during optimization, will need to replace themselves or their arguments by a few common values.
export function getAstFor0() {
    return new Ast("__number__", [new Ast("0", [], [], "UnsignedIntLiteral")], [], "int");
}
export function getAstFor1() {
    return new Ast("__number__", [new Ast("1", [], [], "UnsignedIntLiteral")], [], "int");
}
export function getAstForMinus1() {
    return new Ast("__number__", [new Ast("-1", [], [], "SignedIntLiteral")], [], "signed int");
}
export function getAstFor2() {
    return new Ast("__number__", [new Ast("2", [], [], "UnsignedIntLiteral")], [], "int");
}
export function getAstFor0_016() {
    return new Ast("__number__", [new Ast("0.016", [], [], "UnsignedFloatLiteral")], [], "unsigned float");
}
export function getAstFor0_001() {
    return new Ast("__number__", [new Ast("0.001", [], [], "UnsignedFloatLiteral")], [], "unsigned float");
}
export function getAstFor0_0001() {
    return new Ast("__number__", [new Ast("0.0001", [], [], "UnsignedFloatLiteral")], [], "unsigned float");
}
export function getAstFor255() {
    return new Ast("__number__", [new Ast("255", [], [], "UnsignedIntLiteral")], [], "int");
}
export function getAstFor10000() {
    return new Ast("__number__", [new Ast("10000", [], [], "UnsignedIntLiteral")], [], "int");
}
export function getAstFor10Million() {
    return new Ast("__number__", [new Ast("10000000", [], [], "UnsignedIntLiteral")], [], "int");
}
export function getAstForInfinity() {
    return new Ast("__number__", [new Ast("999999999999", [], [], "UnsignedIntLiteral")], [], "unsigned int");
}
export function getAstForMinusInfinity() {
    return new Ast("__number__", [new Ast("-999999999999", [], [], "SignedIntLiteral")], [], "signed int");
}
export function getAstForE() {
    return new Ast("__number__", [new Ast("2.718281828459045", [], [], "UnsignedFloatLiteral")], [], "unsigned float");
}
export function getAstForNumber(nb) {
    if (typeof nb !== "number") {
        error("Expected a number, but got '"+nb+"' of type '"+typeof nb+"'");
    }
    var type = nb >= 0 ? "unsigned" : "signed";
    type += " "+(Number.isInteger(nb) ? "int" : "float");
    return new Ast("__number__", [new Ast(nb.toString(), [], [], (nb >= 0 ? "Unsigned" : "Signed")+(Number.isInteger(nb) ? "IntLiteral" : "FloatLiteral"))], [], type);
}
export function getAstForBool(bool) {
    if (bool) {
        return getAstForTrue();
    } else {
        return getAstForFalse();
    }
}
export function getAstForNull() {
    return new Ast("null", [], [], "Player");
}
export function getAstForFalse() {
    return new Ast("false", [], [], "bool");
}
export function getAstForTrue() {
    return new Ast("true", [], [], "bool");
}
export function getAstForColorWhite() {
    return new Ast("__color__", [new Ast("WHITE", [], [], "ColorLiteral")], [], "Color");
}
export function getAstForTeamAll() {
    return new Ast("__team__", [new Ast("ALL", [], [], "TeamLiteral")], [], "Team");
}
export function getAstForUselessInstruction() {
    return new Ast("pass");
}
export function getAstForEnd() {
    return new Ast("__end__");
}
export function getAstForEmptyArray() {
    return new Ast("__emptyArray__");
}
export function getAstForNullVector() {
    return new Ast("vect", [
        getAstFor0(),
        getAstFor0(),
        getAstFor0(),
    ])
}
export function getAstForCurrentArrayIndex() {
    return new Ast("__currentArrayIndex__");
}
export function getAstForCustomString(content, formatArgs = []) {
    const [
        arg1 = getAstForNull(),
        arg2 = getAstForNull(),
        arg3 = getAstForNull()
    ] = formatArgs;
    return new Ast("__customString__", [
        new Ast(content, [], [], "CustomStringLiteral"),
        arg1,
        arg2,
        arg3
    ]);
}
