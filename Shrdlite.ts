///<reference path="World.ts"/>
///<reference path="Parser.ts"/>
///<reference path="Interpreter.ts"/>
///<reference path="Planner.ts"/>

module Shrdlite {

    export function interactive(world : World) : void {
        function endlessLoop(utterance : string = "") : void {
            var inputPrompt = "What can I do for you today? ";
            var nextInput = () => world.readUserInput(inputPrompt, endlessLoop);
            if (utterance.trim()) {
                var plan : string[] = splitStringIntoPlan(utterance);
                if (!plan) {
                    if (world.currentState.clarifying) {
                        var num = parseInt(utterance);
                        if (isNaN(num) || num < 1 || num >= world.currentState.plans.length) {
                            // Invalid input, try again
                        }
                        else {
                            plan = world.currentState.plans[num -1];
                            world.currentState.clarifying = false;
                        }
                    }
                    else {
                        var plans = parseUtteranceIntoPlan(world, utterance);
                        if (plans.length > 1){ // We ask the user to clarify what they want.

                            // Clarification questions have already been generated.
                            var questions = plans[plans.length-1];

                            world.printSystemOutput("I found the following interpretations for your command:");
                            questions.forEach((question,n) => {
                                world.printSystemOutput("  (" + (n+1) + ") " + question);
                            });
                            world.currentState.clarifying = true;
                            world.currentState.plans = plans;
                        }
                        else {plan = plans[0];}
                    }
                }
                if (plan) {
                    world.printDebugInfo("Plan: " + plan.join(", "));
                    world.performPlan(plan, nextInput);
                    return;
                }
            }

            // Update prompt in case we are asking for clarification.
            inputPrompt = world.currentState.clarifying ? "Which interpretation should I execute? " : inputPrompt;
            nextInput();
        }
        world.printWorld(endlessLoop);
    }


    /**
     * Generic function that takes an utterance and returns a plan. It works according to the following pipeline:
     * - first it parses the utterance (Parser.ts)
     * - then it interprets the parse(s) (Interpreter.ts)
     * - then it creates plan(s) for the interpretation(s) (Planner.ts)
     *
     * Each of the modules Parser.ts, Interpreter.ts and Planner.ts
     * defines its own version of interface Result, which in the case
     * of Interpreter.ts and Planner.ts extends the Result interface
     * from the previous module in the pipeline. In essence, starting
     * from ParseResult, each module that it passes through adds its
     * own result to this structure, since each Result is fed
     * (directly or indirectly) into the next module.
     *
     * There are two sources of ambiguity: a parse might have several
     * possible interpretations, and there might be more than one plan
     * for each interpretation. In the code there are placeholders
     * that you can fill in to decide what to do in each case.
     *
     * @param world The current world.
     * @param utterance The string that represents the command.
     * @returns A plan in the form of a stack of strings, where each element is either a robot action, like "p" (for pick up) or "r" (for going right), or a system utterance in English that describes what the robot is doing.
     */
    export function parseUtteranceIntoPlan(world : World, utterance : string) : string[][] {
        // Parsing
        world.printDebugInfo('Parsing utterance: "' + utterance + '"');
        try {
            var parses : Parser.ParseResult[] = Parser.parse(utterance);
            world.printDebugInfo("Found " + parses.length + " parses");
            parses.forEach((result, n) => {
                world.printDebugInfo("  (" + n + ") " + Parser.stringify(result));
            });

        }
        catch(err) {
            world.printError("Parsing error", err);
            return;
        }

        // Interpretation
        try {
            var interpretations : Interpreter.InterpretationResult[] = Interpreter.interpret(parses, world.currentState);
            world.printDebugInfo("Found " + interpretations.length + " interpretations");
            interpretations.forEach((result, n) => {
                world.printDebugInfo("  (" + n + ") " + Interpreter.stringify(result));
            });

            if (interpretations.length > 1) {
                // More than one parse tree has a reasonable interpretation,
                // we let the user clarify which is the correct interpretation.
            }
        }
        catch(err) {
            world.printError("Interpretation error", err);
            return;
        }

        // Planning
        try {
            var plans : Planner.PlannerResult[] = Planner.plan(interpretations, world.currentState);
            var results = <string[][]> [];
            world.printDebugInfo("Found " + plans.length + " plans");
            plans.forEach((result, n) => {
                world.printDebugInfo("  (" + n + ") " + Planner.stringify(result));
                results.push(result.plan);
            });

            if (plans.length > 1) {
                // several plans were found -- how should this be handled?
                // this means that we have several interpretations.
                results.push(grammarDisambiguationQuestions(parses,plans));
            }
        }
        catch(err) {
            world.printError("Planning error", err);
            return;
        }

        //var finalPlan : string[] = plans[0].plan;
        //world.printDebugInfo("Final plan: " + finalPlan.join(", "));
        //return finalPlan;
        return results;
    }
    function grammarDisambiguationQuestions(parses : Parser.ParseResult[],
                                    plans : Planner.PlannerResult[]
                                   ): string[] {
        var result = <string[]> [];
        plans.forEach((planResult) => {
            result.push(describeCommand(parses[planResult.whichParse].parse));
        });
        return result;
    }

    // Generates a description of a command in a way that distinguishes
    // different interpretations of an ambiguous command.
    function describeCommand(cmd : Parser.Command): string {
        var result = "Take " + cmd.entity.quantifier
            + " " + describeObject(cmd.entity.object) +
            " and put it "
            + describeLocation(cmd.location) + ".";
        return result;
    }

    // Generates an object description.
    function describeObject(obj : Parser.Object) : string {
        var result = "";
        if (obj.object) {
            result = describeObject(obj.object) + " which is "
                + describeLocation(obj.location);
        }
        else {
            if (obj.size) {result += obj.size + " ";}
            if (obj.color) {result += obj.color + " ";}
            if (obj.form == "anyform") {result += "object";}
            else {result += obj.form;}
        }
        return result;
    }

    // Generates a location description.
    function describeLocation(loc : Parser.Location) : string {
        var rel = loc.relation == "ontop" ? "on" : loc.relation;
        return rel + " " + loc.entity.quantifier + " " +
            describeObject(loc.entity.object);
    }

    /** This is a convenience function that recognizes strings
     * of the form "p r r d l p r d"
     */
    export function splitStringIntoPlan(planstring : string) : string[] {
        var plan : string[] = planstring.trim().split(/\s+/);
        var actions : {[act:string] : string}
            = {p:"Picking", d:"Dropping", l:"Going left", r:"Going right"};
        for (var i = plan.length-1; i >= 0; i--) {
            if (!actions[plan[i]]) {
                return;
            }
            plan.splice(i, 0, actions[plan[i]]);
        }
        return plan;
    }

}
