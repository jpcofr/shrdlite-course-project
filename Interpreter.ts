///<reference path="Util.ts"/>
///<reference path="World.ts"/>
///<reference path="Parser.ts"/>

/*** Interpreter module. ***/

module Interpreter {

    /*** Public part. ***/

    // Result of the interpretation of a parse tree.
    export interface InterpretationResult extends Parser.ParseResult {
        interpretation : DNFFormula;
    }

    // Top-level function for the Interpreter.
    export function interpret ( parses : Parser.ParseResult[] ,
                                currentState : WorldState     )
    : InterpretationResult[] {
        var errors = <any[]> [];
        var interpretations = <InterpretationResult[]> [];
        parses.forEach((parseResult) => {
            try {
                var result = <InterpretationResult> parseResult;
                result.interpretation = interpretCommand( result.parse ,
                                                          currentState );
                if(result.interpretation.length > 0) {
                    interpretations.push(result);
                }
            } catch (err) {
                errors.push(err);
            }
        });
        if (interpretations.length > 0) {
            return interpretations;
        } else {
            throw errors[0]; // THROW THE FIRST ERROR FOUND
        }
    }

    // Alias for formulae in disjunctive NF.
    export type DNFFormula  = Conjunction[];

    // Alias for a conjunctions of literals.
    export type Conjunction = Literal[];

    // A Literal represents a relation that is intended to
    // hold among some objects.
    export interface Literal {
        // When true, negates the "relation" field.
        polarity: boolean;
        // The name of the relation in question.
        relation: string;
        // The arguments to the relation. Usually these will be either
        // objects // or special strings such as "floor" or "floor-N"
        // (where N is a column).
        args: string[];
    }

    export function stringify(result: InterpretationResult): string {
        return stringifyDNF(result.interpretation);
    }

    export function stringifyDNF(interpretation: DNFFormula): string {
        return interpretation.map((literals) => {
            return stringifyConjunction(literals);
        }).join(" | ");
    }

    export function stringifyConjunction(con: Conjunction): string {
        return con.map((lit) => stringifyLiteral(lit)).join(" & ")
    }

    export function stringifyLiteral(lit: Literal): string {
        return (lit.polarity ? "" : "-") +
               lit.relation              +
               "("                       +
               lit.args.join(",")        +
               ")"                       ;
    }

    // Literal comparator.
    export function compareLiteral(l1 : Literal, l2 :Literal) : number {
        return stringifyLiteral(l1).localeCompare(stringifyLiteral(l2));
    }

    // Conjunction comparator.
    export function compareConjunction(c1 : Conjunction, c2 :Conjunction) : number {
        return stringifyConjunction(c1).localeCompare(stringifyConjunction(c2))
    }

    /*** Private part. ***/

    // A relative location.
    type Location = {rel: string, id: string};

    // The additional information that turns the original parse tree
    // into its augmented counterpart.
    type ObjectInfo = string[];
    type EntityInfo = string[];
    type LocationInfo = Location[];
    type CommandInfo = DNFFormula;

    // Checks wether placing an object into a location goes against
    // physical laws.
    function badPlacement ( obj : string        ,
                            loc   : Location    ,
                            state  : WorldState ) {
        return againstPhysics(loc.rel, obj, loc.id, state);
    }

    // The core interpretation function.
    // @param cmd The actual command. Note that it is *not* a string,
    //    but rather an object of type `Command` (as it has been parsed
    //    by the parser).
    // @param state The current state of the world. Useful to look up
    //    objects in the world.
    // @returns A list of list of Literal, representing a formula in
    //   disjunctive normal form (disjunction of conjunctions).
    // @throws An error when no valid interpretations can be found
    function interpretCommand ( cmd : Parser.Command ,
                                state : WorldState   )
    : CommandInfo {
        var result: CommandInfo = [];

        if (cmd.command == "take") { // TAKE AN OBJECT INTO THE ARM
            for (let ent of interpretEntity(cmd.entity, state)) {
                // We are conforming to the example that runs on the website,
                // which is in contrast with one interpretation test.
                // Conforming to tests would need : if (ent != state.holding)
                result.push([{polarity: true, relation: "holding", args: [ent]}]);
            }
        }
        else if (!cmd.entity) { // PUT THE OBJECT IN THE ARM SOMEWHERE
            for (let loc of interpretLocation(cmd.location, state)) {
                if (!badPlacement(state.holding,loc,state)) {
                    result.push([{polarity: true, relation: loc.rel, args: [state.holding, loc.id]}]);
                }
            }
        }
        else { // MOVE AN OBJECT SOMEWHERE
            if(cmd.entity.quantifier == "any" || cmd.entity.quantifier == "the") {
                for (let loc of interpretLocation(cmd.location, state)) {
                    for (let ent of interpretEntity(cmd.entity, state)) {
                        if (!badPlacement(ent,loc,state)) {
                          result.push([{polarity: true, relation: loc.rel, args: [ent, loc.id]}]);
                        }
                    }
                }
            }
            if(cmd.entity.quantifier == "all") {
                var conjunction = <Literal[][]> [];

                for (let ent of interpretEntity(cmd.entity, state)) {
                    var disjunction = <Literal[]> [];

                    for (let loc of interpretLocation(cmd.location, state)) {
                        if (!badPlacement(ent,loc,state)) {
                            disjunction.push({polarity: true, relation: loc.rel, args: [ent, loc.id]});
                        }
                    }

                    conjunction.push(disjunction);
                }

                console.log(stringifyDNF(conjunction));
                result = result.concat(cnfToDnf(conjunction));
            }
        }

        // Computes a DNF formula equivalent to the given CNF one.
        function cnfToDnf(formula : Literal[][]) : DNFFormula {
            if(formula.length == 0) {return [[]];}
            if(formula[0].length == 0) {return [];}

            var headHead = formula[0][0];
            var noHeadHead = formula.slice(); noHeadHead[0].shift();
            var tail = formula.slice(); tail.shift();

            var ifTrue = cnfToDnf(tail);
            var ifFalse = cnfToDnf(noHeadHead);

            var positive = headHead;
            var negative = { polarity : ! positive.polarity ,
                             relation : positive.relation   ,
                             args     : positive.args       } ;

            for(var t of ifTrue)  {t.push(positive);}
            for(var t of ifFalse) {t.push(negative);}

            return ifTrue.concat(ifFalse);
        }

        for (var i = 0; i < result.length; i++) {
            result[i] = uniqueSort(result[i], compareLiteral);
        }
        result = uniqueSort(result, compareConjunction);

        return result;
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
        for(let col of state.stacks) for(let elem of col)
            if(elem == id) {
                return {col : state.stacks.indexOf(col), row : col.indexOf(elem)};
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
                        for (let col of state.stacks) {
                            if (col.length > 0) {
                                objects2.push(col[0]);
                            }
                        }
                    }
                    if (location.rel == "above") {
                        for (let col of state.stacks) {
                            for (let elem of col) {
                                objects2.push(elem);
                            }
                        }
                    }
                }
                else { // We are not dealing with the floor
                    var target = state.stacks[rc.col][rc.row];
                    var justAbove  = state.stacks[rc.col][rc.row + 1];

                    switch(location.rel) {
                    case "ontop"   :
                        if (justAbove != null && state.objects[target].form != "box") {
                            objects2.push(justAbove);
                        }
                        break;
                    case "above"   :
                        for (let t of state.stacks[rc.col]) {
                            if (state.stacks[rc.col].indexOf(t) > rc.row) {
                                objects2.push(t);
                            }
                        }
                        break;
                    case "under"   :
                        for (let t of state.stacks[rc.col]) {
                            if (state.stacks[rc.col].indexOf(t) < rc.row) {
                                objects2.push(t);
                            }
                        }
                        break;
                    case "inside"  :
                        if (justAbove != null && state.objects[target].form == "box") {
                            objects2.push(justAbove);
                            if (state.objects[justAbove].form == "box" && state.stacks[rc.col][rc.row + 2] != null) {
                                // nested boxes
                                objects2.push(state.stacks[rc.col][rc.row + 2]);
                            }
                        }
                        break;
                    case "beside"  : // check bad row case
                        for (let t of state.stacks[rc.col - 1]) {objects2.push(t);}
                        for (let t of state.stacks[rc.col + 1]) {objects2.push(t);}
                        break;

                    case "leftof"  :
                        for (let s of state.stacks) {
                            if (state.stacks.indexOf(s) < rc.col) {
                                for (let t of s) {
                                    objects2.push(t);
                                }
                            }
                        }
                        break;
                    case "rightof" :
                        for (let s of state.stacks) {
                            if (state.stacks.indexOf(s) > rc.col) {
                                for (let t of s) {
                                    objects2.push(t);
                                }
                            }
                        }
                        break;
                    }
                }
                foundObjs = uniqueIntersect(objects1, objects2,
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
