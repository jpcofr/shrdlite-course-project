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
                if(result.interpretation.length>0){
                    interpretations.push(result);
                }
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
            return stringifyConjunction(literals);
        }).join(" | ");
    }

    export function stringifyConjunction(con: Conjunction): string {
        return con.map((lit) => stringifyLiteral(lit)).join(" & ")
    }

    export function stringifyLiteral(lit: Literal): string {
        return (lit.polarity ? "" : "-") + lit.relation + "(" + lit.args.join(",") + ")";
    }

    //////////////////////////////////////////////////////////////////////
    // Comparators

    function compareLiteral(l1 : Literal, l2 :Literal) : number {
        return stringifyLiteral(l1).localeCompare(stringifyLiteral(l2));
    }

    function compareConjunction(c1 : Conjunction, c2 :Conjunction) : number {
        return stringifyConjunction(c1).localeCompare(stringifyConjunction(c2))
    }

    //////////////////////////////////////////////////////////////////////
    // Sorting-based algorithms

   /**
    * Sorts the input list and removes duplicates
    */
    function unique(xs : any[], cmp : (x:any, y:any) => number) : any[] {
        var sorted : any[] = xs.sort(cmp);
        var result : any[] = [];

        for(var i = 0; i < sorted.length - 1; i++)
            if(cmp(sorted[i], sorted[i + 1]) != 0)
                {result.push(sorted[i]);}

        if(sorted.length > 0)
            {result.push(sorted[sorted.length - 1]);}

        return result;
    }

   /**
    * Computes the intersection of two lists
    */
    function intersect(xs : any[], ys : any[], cmp : (x:any, y:any) => number) {
        var sorted1 : any[] = xs.sort(cmp);
        var sorted2 : any[] = ys.sort(cmp);
        var result  : any[] = [];

        for(var i = 0, j = 0; i < sorted1.length && j < sorted2.length;) {
            var r = cmp(sorted1[i], sorted2[j]);
            if (r == 0) {result.push(sorted1[i]); i++; j++;}
            else {r == -1 ? i++ : j++;}
        }

        return result;
    }

    //////////////////////////////////////////////////////////////////////
    // Type Synonyms

    /**
     * A relative location
     */
    type Location = {rel: string, id: string};

    /**
     * The additional information that turns the oronTests
     iginal parse tree into
     * its augmented counterpart.
     */
    type ObjectInfo = string[];
    type EntityInfo = string[];
    type LocationInfo =  Location[];
    type CommandInfo = DNFFormula;

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
     * @throws An error when no valid interpretations can be found
     */
    function interpretCommand(cmd: Parser.Command, state: WorldState): CommandInfo {
        var result: CommandInfo = [];

        if (cmd.command == "take") {
            for (let ent of interpretEntity(cmd.entity, state)) {
                if (ent != state.holding) {
                    result.push([{polarity: true, relation: "holding", args: [ent]}]);
                }
            }
        }
        else if (!cmd.entity) {
            for (let loc of interpretLocation(cmd.location, state)) {
                if (!badLocation(state.holding,loc,state)) {
                    result.push([{polarity: true, relation: loc.rel, args: [state.holding, loc.id]}]);
                }
            }
        }
        else { // command is either "put" or "move"
            for (let ent of interpretEntity(cmd.entity, state)) {
                for (let loc of interpretLocation(cmd.location, state)) {
                    if (!badLocation(ent,loc,state)) {
                      result.push([{polarity: true, relation: loc.rel, args: [ent, loc.id]}]);
                    }
                }
            }
        }

        for (var i = 0; i < result.length; i++) {
            result[i] = unique(result[i], compareLiteral);
        }
        result = unique(result, compareConjunction);

        return result;
    }

    /**
    * Checks whether placing the given object in the given location follows the physical laws
    */
    export function badLocation(obj: string, loc: Location, state: WorldState) {
        return  obj == loc.id
            || loc.rel == "ontop"  && state.objects[obj].form == "ball"
                                   && loc.id != "floor"
            || loc.rel == "inside" && state.objects[loc.id].form != "box"

            || loc.rel == "inside" && state.objects[loc.id].size == state.objects[obj].size
                                   && (state.objects[obj].form == "pyramid"
                                      || state.objects[obj].form == "plank"
                                      || state.objects[obj].form == "box")
            || loc.rel == "ontop"  && loc.id != "floor"
                                   && (state.objects[loc.id].form == "ball"
                                      || state.objects[loc.id].form == "box")
            || (loc.rel == "inside" || loc.rel == "ontop" || loc.rel == "above")
                                  && loc.id != "floor"
                                  && state.objects[loc.id].size == "small"
                                  && state.objects[obj].size    == "large"
            || loc.rel == "under" && obj != "floor"
                                  && state.objects[loc.id].size == "large"
                                  && state.objects[obj].size    == "small"
            || loc.rel == "under" && loc.id == "floor"
            || loc.rel == "ontop" && state.objects[obj].form == "box"
                                  && state.objects[obj].size == "small"
                                  && loc.id != "floor"
                                  && state.objects[loc.id].size == "small"
                                  && (state.objects[loc.id].form == "pyramid"
                                      || state.objects[loc.id].form == "brick")
            || loc.rel == "ontop" && state.objects[obj].form == "box"
                                  && state.objects[obj].size == "large"
                                  && loc.id != "floor"
                                  && state.objects[loc.id].form == "pyramid"
    }
    /**
    * Checks whether an object with the given id is in the world stacks or arm
    */
    function existsObjectId(id: string, state: WorldState): boolean {
        if (id == state.holding) { return true; }
        for (let stack of state.stacks)
            if (stack.indexOf(id) >= 0) { return true; }
        return false;
    }

    /**
    * Retrives the coordinates of an existing object, null for the floor
    */
    export function locateObjectId(id: string, state: WorldState): {row : number; col : number} {
        for(let row of state.stacks) for(let elem of row)
            if(elem == id) {
                return {row : state.stacks.indexOf(row), col : row.indexOf(elem)};
            }
        if (id == state.holding) {
            // does this work?
            return {row : null, col : state.arm};
        }
        return null;
    }

    /**
    * Returns the list of strings representing the relevant objects
    */
    function interpretObject(obj: Parser.Object, state: WorldState): ObjectInfo {
        var foundObjs: string[] = [];

        if (obj.location == null) { // Attribute-based reference
            for (var id in state.objects) {
                if (existsObjectId(id,state)
                    && (obj.form  == null || obj.form  == "anyform" || obj.form == state.objects[id].form)
                    && (obj.size  == null || obj.size  == state.objects[id].size                         )
                    && (obj.color == null || obj.color == state.objects[id].color                        ))
                {foundObjs.push(id);}
            }
            if (obj.form == "floor") { foundObjs.push("floor"); }
        }
        else { // Location-based reference
            var objects1 : string [] = interpretObject(obj.object, state);
            var objects2 : string [] = [];

            var locations = interpretLocation(obj.location, state);

            for (let location of locations) {
                var rc = locateObjectId(location.id, state);

                if (rc == null) { // We are dealing with the floor
                    if (location.rel == "ontop") {
                        for (let row of state.stacks) {
                            if (row.length > 0) {
                                objects2.push(row[0]);
                            }
                        }
                    }
                    if (location.rel == "above") {
                        for (let row of state.stacks) {
                            for (let elem of row) {
                                objects2.push(elem);
                            }
                        }
                    }
                }
                else { // We are not dealing with the floor
                    var target = state.stacks[rc.row][rc.col];
                    var ontop  = state.stacks[rc.row][rc.col + 1];

                    switch(location.rel) {
                    case "ontop"   :
                        if (ontop != null) {
                            objects2.push(ontop);
                        }
                        break;
                    case "above"   :
                        for (let t of state.stacks[rc.row]) {
                            if (state.stacks[rc.row].indexOf(t) > rc.col) {
                                objects2.push(t);
                            }
                        }
                        break;
                    case "under"   :
                        for (let t of state.stacks[rc.row]) {
                            if (state.stacks[rc.row].indexOf(t) < rc.col) {
                                objects2.push(t);
                            }
                        }
                        break;
                    case "inside"  : // handle double nesting
                        if (ontop != null && state.objects[target].form == "box") {
                            objects2.push(ontop);
                            if (state.objects[ontop].form == "box" && state.stacks[rc.row][rc.col + 2] != null) {
                                objects2.push(state.stacks[rc.row][rc.col + 2]);
                            }
                        }
                        break;
                    case "beside"  : // check bad row case
                        for (let t of state.stacks[rc.row - 1]) {objects2.push(t);}
                        for (let t of state.stacks[rc.row + 1]) {objects2.push(t);}
                        break;
                    case "leftof"  :
                        for (let t of state.stacks[rc.row - 1]) {objects2.push(t);}
                        break;
                    case "rightof" :
                        for (let t of state.stacks[rc.row + 1]) {objects2.push(t);}
                        break;
                    }
                }
                foundObjs = intersect(objects1, objects2,
                                      function (x,y){return x.localeCompare(y);});
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
