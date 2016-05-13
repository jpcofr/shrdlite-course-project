///<reference path="World.ts"/>
///<reference path="Parser.ts"/>

/**
* Interpreter module
*
* The goal of the Interpreter module is to interpret a sentence
* written by the user in the context of the current world state. In
* particular, it must figure out which objects in the world,
* i.e. which elements in the `objects` field of WorldState, correspond
* to the ones referred to in the sentence.
*
* Moreover, it has to derive what the intended goal state is and
* return it as a logical formula described in terms of literals, where
* each literal represents a relation among objects that should
* hold. For example, assuming a world state where "a" is a ball and
* "b" is a table, the command "put the ball on the table" can be
* interpreted as the literal ontop(a,b). More complex goals can be
* written using conjunctions and disjunctions of these literals.
*
* In general, the module can take a list of candidates parses and return
* a list of candidates interpretations, but the code to handle this has
* already been written for you. The only part you need to implement is
* the core interpretation function, namely `interpretCommand`, which produces a
* single interpretation for a single command.
*/
module Interpreter {

    //////////////////////////////////////////////////////////////////////
    // exported functions, classes and interfaces/types

    /**
    Top-level function for the Interpreter. It calls `interpretCommand` for each candidates parse of the command. No need to change this one.
    * @param parses List of parses produced by the Parser.
    * @param currentState The current state of the world.
    * @returns Augments ParseResult with a list of interpretations. Each interpretation is represented by a list of Literals.
    */
    export function interpret(parses: Parser.ParseResult[], currentState: WorldState): InterpretationResult[] {
        var errors: Error[] = [];
        var interpretations: InterpretationResult[] = [];
        parses.forEach((parseresult) => {
            try {
                var result: InterpretationResult = <InterpretationResult>parseresult;
                result.interpretation = interpretCommand(result.parse, currentState);
                interpretations.push(result);
            } catch (err) {
                errors.push(err);
            }
        });
        if (interpretations.length) {
            return interpretations;
        } else {
            // only throw the first error found
            throw errors[0];
        }
    }

    export interface InterpretationResult extends Parser.ParseResult {
        interpretation: DNFFormula;
    }

    export type DNFFormula = Conjunction[];
    type Conjunction = Literal[];

    /**
    * A Literal represents a relation that is intended to
    * hold among some objects.
    */
    export interface Literal {
        /** Whether this literal asserts the relation should hold
         * (true polarity) or not (false polarity). For example, we
         * can specify that "a" should *not* be on top of "b" by the
         * literal {polarity: false, relation: "ontop", args:
         * ["a","b"]}.
         */
        polarity: boolean;
        /** The name of the relation in question. */
        relation: string;
        /** The arguments to the relation. Usually these will be either objects
         * or special strings such as "floor" or "floor-N" (where N is a column) */
        args: string[];
    }

    export function stringify(result: InterpretationResult): string {
        return result.interpretation.map((literals) => {
            return literals.map((lit) => stringifyLiteral(lit)).join(" & ");
            // return literals.map(stringifyLiteral).join(" & ");
        }).join(" | ");
    }

    export function stringifyLiteral(lit: Literal): string {
        return (lit.polarity ? "" : "-") + lit.relation + "(" + lit.args.join(",") + ")";
    }

    //////////////////////////////////////////////////////////////////////
    // private functions

    /**
     * The additional information that turns the original parse tree into
     * its augmented counterpart.
     */
    type ObjectInfo = string[];
    type EntityInfo = string[];
    type LocationInfo = { rel: string; id: string }[];
    type CommandInfo = DNFFormula;

    /**
     * The core interpretation function. The code here is just a
     * template; you should rewrite this function entirely. In this
     * template, the code produces a dummy interpretation which is not
     * connected to `cmd`, but your version of the function should
     * analyse cmd in order to figure out what interpretation to
     * return.
     * @param cmd The actual command. Note that it is *not* a string, but rather an object of type `Command` (as it has been parsed by the parser).
     * @param state The current state of the world. Useful to look up objects in the world.
     * @returns A list of list of Literal, representing a formula in disjunctive normal form (disjunction of conjunctions). See the dummy interpetation returned in the code for an example, which means ontop(a,floor) AND holding(b).
     */
    function interpretCommand(cmd: Parser.Command, state: WorldState): CommandInfo {
        // This returns a dummy interpretation involving two random objects in the world
        //        var objects: string[] = Array.prototype.concat.apply([], state.stacks);
        //        var a: string = objects[Math.floor(Math.random() * objects.length)];
        //        var b: string = objects[Math.floor(Math.random() * objects.length)];
        //        var interpretation: DNFFormula = [[
        //            { polarity: true, relation: "ontop", args: [a, "floor"] },
        //            { polarity: true, relation: "holding", args: [b] }
        //        ]];

        var result: CommandInfo = [];

        for (let ent of interpretEntity(cmd.entity, state)) {
            if (cmd.command == "take") {
                result.push([{
                    polarity: true,
                    relation: "holding",
                    args: [ent]
                }]);
            }
            else {
                for (let loc of interpretLocation(cmd.location, state)) {
                    var obj = ent ? ent : state.holding;

                    // some exceptions for impossible cases:
                    // we can't position an object in relation to itself
                    if (obj == loc.id) { continue; }
                    // balls can't go on top of things, they would roll off
                    if (loc.rel == "ontop" && state.objects[obj].form == "ball") { continue; }
                    if (loc.rel == "inside") {
                        // objects can only go inside boxes
                        if (state.objects[loc.id].form != "box") { continue; }
                        // large objects can't go inside small boxes
                        if (state.objects[loc.id].size == "small" && state.objects[obj].size == "large") { continue; }
                    }

                    result.push([{
                        polarity: true,
                        relation: loc.rel,
                        args: [obj, loc.id]
                    }]);
                }
            }
        }

        return result;
    }

    /**
    * Checks whether an object with the given id is in the world stacks or arm
    */
    function existsObjectId(id: string, state: WorldState): boolean {
        if (id == state.holding) { return true; }
        var stacks = state.stacks;
        for (let stack of stacks) {
            if (stack.indexOf(id) >= 0) { return true; }
        }
        return false;
    }

    /**
    * Returns the list of strings representing the relevant objects
    */
    function interpretObject(obj: Parser.Object, state: WorldState): ObjectInfo {
        var foundObjs: string[] = [];
        if (obj.form) { // Basic case
            var worldObjs = state.objects;

            if (obj.form == "floor") { foundObjs.push("floor"); }

            if (obj.form == "anyform") { // needs to be a form that can be taken
                for (var objId in state.objects) {

                    if ((state.objects[objId].form == "ball" ||
                        state.objects[objId].form == "table" ||
                        state.objects[objId].form == "box") &&
                        (state.objects[objId].color == obj.color)
                        &&
                        existsObjectId(objId, state)) {
                        foundObjs.push(objId);
                    }
                }
            }
            if (obj.size && obj.color) { // No missing information
                for (var objId in state.objects) {
                    if (worldObjs[objId].form == obj.form &&
                        worldObjs[objId].color == obj.color &&
                        worldObjs[objId].size == obj.size &&
                        existsObjectId(objId, state)) {
                        foundObjs.push(objId);
                    }
                }
            }
            else if (obj.size) { // Size known but not color
                for (var objId in state.objects) {
                    if (worldObjs[objId].form == obj.form &&
                        worldObjs[objId].size == obj.size &&
                        existsObjectId(objId, state)) {
                        foundObjs.push(objId);
                    }
                }
            }
            else if (obj.color) { // Color known but not size

                for (var objId in state.objects) {
                    if (worldObjs[objId].form == obj.form &&
                        worldObjs[objId].color == obj.color &&
                        existsObjectId(objId, state)) {
                        foundObjs.push(objId);
                    }
                }
            }
            else { // Only form is known
                for (var objId in state.objects) {
                    if (state.objects[objId].form == obj.form &&
                        existsObjectId(objId, state)) {
                        foundObjs.push(objId);
                    }
                }
            }
        }

        else if (obj.location) {
            var candidates = interpretObject(obj.object, state);
            var pLocations = interpretLocation(obj.location, state);
            var stacks = state.stacks;
            for (var candidate of candidates) {
                for (var location of pLocations) {
                    // the possible relations cannot refer to an object's location in
                    // relation to itself
                    if (candidate == location.id) { continue; }
                    switch (location.rel) {
                        case "inside":
                            for (var currStack of stacks) {
                                var candidatePosition = currStack.indexOf(candidate);
                                var objectPosition = currStack.indexOf(location.id);
                                if (objectPosition < 0 ||
                                    state.objects[location.id].form != "box") break;
                                if (candidatePosition == objectPosition + 1) {
                                    foundObjs.push(candidate);
                                }
                                if (candidatePosition == objectPosition + 2) {
                                    // nested boxes
                                    var between = currStack[objectPosition + 1];
                                    if (state.objects[between].form == "box" &&
                                        state.objects[between].size == "small" &&
                                        state.objects[location.id].size == "large") {
                                        foundObjs.push(candidate);
                                    }
                                }
                            }
                            break;
                        case "above":
                            for (var currStack of stacks) {
                                var candidatePosition = currStack.indexOf(candidate);
                                var objectPosition = currStack.indexOf(location.id);
                                // everything is above the floor
                                if (objectPosition < 0 && location.id != "floor") break;
                                if (candidatePosition > objectPosition) {
                                    foundObjs.push(candidate);
                                }
                            }
                            break;
                        case "beside":
                            var firstObjStack = 0;
                            var secondObjStack = 0;
                            for (firstObjStack = 0; firstObjStack < stacks.length; firstObjStack++) {
                                if (stacks[firstObjStack].indexOf(candidate) >= 0) break;
                            }
                            for (secondObjStack = 0; secondObjStack < stacks.length; secondObjStack++) {
                                if (stacks[secondObjStack].indexOf(location.id) >= 0) break;
                            }
                            if (Math.abs(firstObjStack - secondObjStack) == 1) {
                                foundObjs.push(candidate);
                            }
                            break;
                        case "ontop":
                            for (var currStack of stacks) {
                                var candidatePosition = currStack.indexOf(candidate);
                                var objectPosition = currStack.indexOf(location.id);
                                if (objectPosition < 0 && location.id != "floor") break;
                                if (candidatePosition == objectPosition + 1) {
                                    foundObjs.push(candidate);
                                }
                            }
                            break;
                        case "leftof":
                            var firstObjStack = 0;
                            var secondObjStack = 0;
                            for (firstObjStack = 0; firstObjStack < stacks.length; firstObjStack++) {
                                if (stacks[firstObjStack].indexOf(candidate) >= 0) break;
                            }
                            for (secondObjStack = 0; secondObjStack < stacks.length; secondObjStack++) {
                                if (stacks[secondObjStack].indexOf(location.id) >= 0) break;
                            }
                            if (firstObjStack < secondObjStack) {
                                foundObjs.push(candidate);
                            }
                            break;
                        case "rightof":
                            var firstObjStack = 0;
                            var secondObjStack = 0;
                            for (firstObjStack = 0; firstObjStack < stacks.length; firstObjStack++) {
                                if (stacks[firstObjStack].indexOf(candidate) >= 0) break;
                            }
                            for (secondObjStack = 0; secondObjStack < stacks.length; secondObjStack++) {
                                if (stacks[secondObjStack].indexOf(location.id) >= 0) break;
                            }
                            if (firstObjStack > secondObjStack) {
                                foundObjs.push(candidate);
                            }
                            break;
                    }
                }
            }
        }

        return foundObjs;
    }

    function interpretEntity(ent: Parser.Entity, state: WorldState): EntityInfo {
        // calls interpretObject, handling quantifiers != any is an extension
        return interpretObject(ent.object, state);
    }

    function interpretLocation(loc: Parser.Location, state: WorldState): LocationInfo {
        // gets objects from interpretEntity and pairs them with the input relation
        var result: LocationInfo = [];

        for (let candidate of interpretEntity(loc.entity, state)) {
            result.push({ rel: loc.relation, id: candidate });
        }

        return result;
    }
}
