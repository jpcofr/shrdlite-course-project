///<reference path="Util.ts"/>
///<reference path="World.ts"/>
///<reference path="Interpreter.ts"/>
///<reference path="Graph.ts"/>
///<reference path="lib/collections.ts"/>

/**
* Planner module
*
* The goal of the Planner module is to take the interpetation(s)
* produced by the Interpreter module and to plan a sequence of actions
* for the robot to put the world into a state compatible with the
* user's command, i.e. to achieve what the user wanted.
*
* The planner should use your A* search implementation to find a plan.
*/
module Planner {

    //////////////////////////////////////////////////////////////////////
    // exported functions, classes and interfaces/types

    /**
     * Top-level driver for the Planner. Calls `planInterpretation` for each given interpretation generated by the Interpreter.
     * @param interpretations List of possible interpretations.
     * @param currentState The current state of the world.
     * @returns Augments Interpreter.InterpretationResult with a plan represented by a list of strings.
     */
    export function plan (
       interpretations : Interpreter.InterpretationResult[],
       currentState : WorldState
    ) : PlannerResult[] {
        var errors : Error[] = [];
        var plans : PlannerResult[] = [];
        interpretations.forEach((interpretation) => {
            try {
                var result : PlannerResult = <PlannerResult>interpretation;
                result.plan = planInterpretation(result.interpretation, currentState);
                if (result.plan.length == 0) {
                    result.plan.push("That is already true!");
                }
                plans.push(result);
            } catch(err) {
                errors.push(err);
            }
        });
        if (plans.length) {
            return plans;
        } else {
            // only throw the first error found
            throw errors[0];
        }
    }

    export interface PlannerResult extends Interpreter.InterpretationResult {
        plan : string[];
    }

    export function stringify(result : PlannerResult) : string {
        return result.plan.join(", ");
    }

    //////////////////////////////////////////////////////////////////////
    // private functions

    /*
    class WorldEdge extends Edge<WorldState> {
        from : WorldState;
        to   : WorldState;
        cost : number;
        cmds : string[];
    }
    */

    function makeCommands (sourceCol : number, destCol : number) : string[] {
        var result : string[] = [];
        var atomic = sourceCol < destCol ? "r" : "l";

        var distance = sourceCol - destCol;
        distance = distance < 0 ? -distance : distance;

        for (var i = 0; i < distance; i ++) {result.push(atomic);}

        return result;
    }

    class SearchEdge extends Edge<WorldState> {
      cmds : string[];
    }

    class SearchSpace implements Graph<WorldState> {
        outgoingEdges = function (state : WorldState) : SearchEdge[] {
            var result : SearchEdge[] = [];

            if (state.holding == null) {
                for (var sourceCol in state.stacks)
                    if(state.stacks[sourceCol].length > 0) {
                        var sourceRow = state.stacks[sourceCol].length - 1;
                        var sourceLast = state.stacks[sourceCol][sourceRow];

                        var newState : WorldState = {
                            stacks: cloneMatrix(state.stacks),
                            holding: sourceLast,
                            arm: parseInt(sourceCol),
                            objects: state.objects,
                            examples: state.examples
                        }
                        newState.stacks[sourceCol].pop();

                        var commands : string[] = [];
                        commands = commands.concat(makeCommands(state.arm, parseInt(sourceCol)));
                        commands.push("p");

                        result.push( { from : state           ,
                                       to   : newState        ,
                                       cost : commands.length ,
                                       cmds : commands        } );
                    }
            }
            else { // (state.holding != null) {
                var heldObj = state.holding;
                for (var destCol in state.stacks) {
                    var destRow = state.stacks[destCol].length - 1;
                    var destLast = state.stacks[destCol][destRow];
                    if ( state.stacks[destCol].length == 0
                         || againstPhysics("ontop", heldObj, destLast, state)
                         || againstPhysics("inside", heldObj, destLast, state)
                       ) {
                        var newState : WorldState = {
                            stacks: cloneMatrix(state.stacks),
                            holding: null,
                            arm: parseInt(destCol),
                            objects: state.objects,
                            examples: state.examples
                        }
                        newState.stacks[destCol].push(state.holding);

                        var commands : string[] = [];
                        commands = commands.concat(makeCommands(state.arm, parseInt(destCol)));
                        commands.push("d");

                        result.push( { from : state           ,
                                       to   : newState        ,
                                       cost : commands.length ,
                                       cmds : commands        } );
                    }
                }
            }

            return result;
        }

        compareNodes = function (s1 : WorldState, s2 : WorldState) : number
        {return stringifyState(s1).localeCompare(stringifyState(s2));}
    }

    /**
     * Checks whether the given literal is satisfied in the given
     * world state.
     */
    function isValid(lit : Interpreter.Literal, state : WorldState) : boolean {
        // literal has polarity (boolean), relation (string), args (string list)
        // either the relation is "holding" with one argument, or there are 2 args?
        var isTrue : boolean = false;
        var ob1 : string = lit.args[0];
        if (lit.relation == "holding") {
            isTrue = (ob1 == state.holding);
        }
        else {
            // we have 2 arguments
            var ob2 = lit.args[1];
            var loc1 = Interpreter.locateObjectId(ob1, state);
            var loc2 = Interpreter.locateObjectId(ob2, state);
            if (ob1 == "floor") {
                isTrue = lit.relation == "under";
            }
            else if (ob2 == "floor") {
                isTrue = lit.relation == "above";
                if (lit.relation == "ontop") {
                    isTrue = loc1.row == 0;
                }
            }
            else {
                // we are not dealing with the floor
                switch(lit.relation) {
                case "ontop" :
                    // objects are "inside" boxes but "ontop" of other objects
                    isTrue = (loc1.col == loc2.col && loc1.row == loc2.row + 1 && state.objects[ob2].form != "box");
                    break;
                case "inside" :
                    isTrue = (loc1.col == loc2.col && loc1.row == loc2.row + 1 && state.objects[ob2].form == "box");
                    // special case for nested boxes
                    var inside = state.stacks[loc2.col][loc2.row+1];
                    if (inside != null && state.objects[inside].form == "box") {
                        isTrue = isTrue || (loc1.col == loc2.col && loc1.row == loc2.row + 2);
                    }
                    break;
                case "above" :
                    isTrue = (loc1.col == loc2.col && loc1.row > loc2.row);
                    break;
                case "under" :
                    isTrue = (loc1.col == loc2.col && loc1.row < loc2.row);
                    break;
                case "beside" :
                    isTrue = (Math.abs(loc1.col - loc2.col) == 1);
                    break;
                case "leftof" :
                    isTrue = (loc1.col == loc2.col - 1);
                    break;
                case "rightof" :
                    isTrue = (loc1.col == loc2.col + 1);
                    break;
                }
            }
        }
        return (lit.polarity == isTrue);
    }

   /**
    * Checks whether the given formula is satisfied in the given state
    */
    function isSatisfied(formula : Interpreter.DNFFormula, state : WorldState) : boolean {
        var result : boolean = false;
        for (let conjunction of formula) {
            result = true;
            for (let literal of conjunction) {
                if (!isValid(literal,state)) {
                    result = false;
                }
            }
            if (result) {
                // all the literals in the conjunction are true in the current state
                return true;
            }
        }
        return false;
    }
   /**
    * A heuristic for the minimum number of steps needed for the robot arm to pick
    * pick up an object assuming it is already positioned above the correct column
    */
    function minAccess(obj: string, state: WorldState) : number {
        if (obj == "floor" || obj == state.holding) {
            return 0;
        }
        else {
            var loc = Interpreter.locateObjectId(obj,state);
            // height of stack
            var height = state.stacks[loc.col].length;
            // number of objects above obj
            var above = height - loc.row - 1;
            // for each object above obj we need at least 4 moves
            // (pick it up, move it at least 1 stack, release it, move back into position)
            return above*4;
        }
    }
   /**
    * A heuristic for how far a given state is from a goal literal.
    * Assumes that the cost is the length of a path (# of l,r,p, or d)
    */
    function litHeuristic(state: WorldState, lit: Interpreter.Literal) : number {
        if (isValid(lit,state)) {
            return 0;
        }
        else {
            // The goal has not been reached
            var minSteps = 0;
            var ob1 : string = lit.args[0];
            var loc1 = Interpreter.locateObjectId(ob1, state);
            var armPos : number = state.arm;
            if (lit.relation == "holding") {
                minSteps = Math.abs(loc1.col - armPos) + 1;
            }
            else {
                // we have 2 arguments
                var ob2 = lit.args[1];
                var loc2 = Interpreter.locateObjectId(ob2, state);
                // minimum moves to access ob1
                var access1 = minAccess(ob1,state);
                if (ob2 == "floor") {
                    if (ob1 == state.holding) {
                        // at best, we just need to put the object down
                        minSteps = 1;
                    }
                    else {
                        // we need to access the object, pick it up, move it, put it down
                        minSteps = access1 + 3;
                    }
                }
                else {
                    // we are not dealing with the floor

                    // minimum number of arm moves to the position of the object to be moved
                    var minArm = Math.min(Math.abs(armPos - loc1.col), Math.abs(armPos - loc2.col));
                    // minimum moves to access ob2
                    var access2 = minAccess(ob2,state);
                    switch(lit.relation) {
                    case "ontop" :
                    case "above" :
                    case "under" :
                        // minimum moves from original object position to new one
                        var minMove = Math.abs(loc1.col - loc2.col);
                        break;
                    case "inside" :
                        var minMove = Math.abs(loc1.col - loc2.col);
                        // nested box exception, less moves needed to access box if it's sufficient
                        // to place the object in a box inside the box
                        var inside = state.stacks[loc2.col][loc2.row + 1];
                        if (inside != null && state.objects[inside].form == "box" && state.objects[ob1].size == "small") {
                            access2 = access2 - 4;
                        }
                        break;
                    case "beside" :
                        var minMove = Math.abs(loc1.col - loc2.col) - 1;
                        break;
                    case "leftof" :
                    case "rightof" :
                        var minMove = Math.abs(loc1.col - loc2.col) + 1;
                        break;
                    }
                    // We add 1 step for dropping the object into position
                    minSteps = minArm + access1 + access2 + minMove + 1;
                }
            }
        }
        return minSteps;
    }

   /**
    * A heuristic for how far a given state is from a goal DNF formula.
    * based on the cost being the length of a path (# of l,r,p and d commands)
    */
    function heuristic(state : WorldState, goal : Interpreter.DNFFormula) : number {
        var min = Number.MAX_VALUE;
        for (let conjunction of goal) {
            var lHs = conjunction.map(function (x) { return litHeuristic(state,x);})
            var maxH = Math.max(...lHs);
            if (maxH < min) {
                min = maxH;
            }
        }
        return min;
    }

    /**
     * The core planner function.
     * @param interpretation The logical interpretation of the user's desired goal. The plan needs to be such that by executing it, the world is put into a state that satisfies this goal.
     * @param state The current world state.
     * @returns Basically, a plan is a
     * stack of strings, which are either system utterances that
     * explain what the robot is doing (e.g. "Moving left") or actual
     * actions for the robot to perform, encoded as "l", "r", "p", or
     * "d". The code shows how to build a plan. Each step of the plan can
     * be added using the `push` method.
     */
    function planInterpretation(interpretation : Interpreter.DNFFormula, state : WorldState) : string[] {
        var plan : string[] = [];
        var graph = new SearchSpace();
        var startNode = state;
        var goal = interpretation;
        var isGoal = (s: WorldState) => isSatisfied(goal,s);
        var h = (s: WorldState) => heuristic(s,goal);
        var toStr = (s: WorldState) => stringifyState(s);

        try {
            var result = <SearchEdge[]> aStarSearch(graph, startNode, isGoal, h, 10, toStr);
            for (let edge of result) {
                plan = plan.concat(edge.cmds);
            }
        }
        catch (e) {
            console.log("Planner failure!");
        }
        return plan;
    }

}
