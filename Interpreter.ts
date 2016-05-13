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
* In general, the module can take a list of possible parses and return
* a list of possible interpretations, but the code to handle this has
* already been written for you. The only part you need to implement is
* the core interpretation function, namely `interpretCommand`, which produces a
* single interpretation for a single command.
*/
module Interpreter {

    //////////////////////////////////////////////////////////////////////
    // exported functions, classes and interfaces/types

    /**
    Top-level function for the Interpreter. It calls `interpretCommand` for each possible parse of the command. No need to change this one.
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
        polarity : boolean;
        /** The name of the relation in question. */
        relation : string;
        /** The arguments to the relation. Usually these will be either objects
         * or special strings such as "floor" or "floor-N" (where N is a column) */
        args : string[];
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
    function interpretCommand(cmd: Parser.Command, state: WorldState): DNFFormula {
        // This returns a dummy interpretation involving two random objects in the world
        //        var objects: string[] = Array.prototype.concat.apply([], state.stacks);
        //        var a: string = objects[Math.floor(Math.random() * objects.length)];
        //        var b: string = objects[Math.floor(Math.random() * objects.length)];
        //        var interpretation: DNFFormula = [[
        //            { polarity: true, relation: "ontop", args: [a, "floor"] },
        //            { polarity: true, relation: "holding", args: [b] }
        //        ]];

        var interpretation: DNFFormula;
        // Classify entity and location, determine the corresponding World objects.
        var entity = interpretEntity(cmd.entity, state);
        var location = interpretLocation(cmd.location, state);

        // Classify cmd.command
        if (cmd.command == "take") { // Pick up entity.

        } else if (cmd.command == "put") { // Put down entity.

        } else if (cmd.command == "move") { // Move entity to location.

        } else {

        }

        // Make DNFFormula from command/entity/location interpretation.


        return interpretation;
    }

    /**
    * Returns the list of strings representing the relevant objects
    */
    function interpretObject(obj: Parser.Object, state: WorldState): string[] {

        var res: string[] = [];
        // TODO : refactor this case, try to make it less copy-pasty!
        // (should be possible using filter)
        if (obj.form) { // Basic case
            var obList = state.objects;
            var f = obj.form;
            if (obj.size && obj.color) { // No missing information
                var c = obj.color;
                var s = obj.size;
                for (var key in state.objects) {
                    if (obList[key].form == f && obList[key].color == c && obList[key].size == s) {
                        res.push(key);
                    }
                }
            }
            else if (obj.size) { // Size known but not color
                var s = obj.size;
                for (var key in state.objects) {
                    if (obList[key].form == f && obList[key].size == s) {
                        res.push(key);
                    }
                }
            }
            else if (obj.color) { // Color known but not size
                var c = obj.color;
                for (var key in state.objects) {
                    if (obList[key].form == f && obList[key].color == c) {
                        res.push(key);
                    }
                }
            }
            else { // Only form is known
                for (var key in state.objects) {
                    if (state.objects[key].form == obj.form) {
                        res.push(key);
                    }
                }
            }
        }

        else if (obj.location) {
            var possible = interpretObject(obj.object, state);
            var pLocations = interpretLocation(obj.location, state);

            for(var candidate of possible ){
                for(var l of pLocations.locations ){
                    switch(l.rel) {
                        case "inside":

                         candidate =null;
                        break;
                        case "above":
                         candidate =null;
                        break;
                        case "beside":
                         candidate =null;
                        break;
                        case "ontop":
                         var stacks = state.stacks;
                         for(var currStack of stacks){
                             var candidatePosition = currStack.indexOf(candidate);
                             var objectPosition = currStack.indexOf(l.id);
                             if (objectPosition < 0) break;
                             if(candidatePosition == objectPosition + 1){
                                 res.push(candidate);
                             }
                         }
                        break;
                        case "leftof":
                         candidate =null;
                        break;
                        case "rightof":
                         candidate =null;
                        break;
                    }
                }
            }

            // list of object ids

            // locations: { rel: string; id: string }[];
            // search state stack to find which objects in possible
            // have relation loc.rel to the object loc.id for a
            // location loc in plocations.
        }

        return res;
    }

    function interpretEntity(ent: Parser.Entity, state: WorldState): ObjectInfo {
        // calls interpretObject, more complex quantifier handling can be added later
        var res: ObjectInfo
        return res;
    }

    function interpretLocation(loc: Parser.Location, state: WorldState): LocationInfo {
        var res: LocationInfo = { locations: [] };


        return res;
    }

    class ObjectInfo {
        objects: { id: string; row: number; col: number }[];
    }

    class LocationInfo {
        locations: { rel: string; id: string }[];
    }

    /*class ObjectMap {
        coords : { [id : string] : {row : number; col : number}};
    }*/
}
