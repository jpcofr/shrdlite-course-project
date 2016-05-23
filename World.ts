/*** World-related interfaces. ***/

type Stack = string[];

// A reference to an object in the world, given as a combination of a
// form, a size and a color. Might be ambiguous.
interface ObjectDefinition {
    // "brick", "plank", "ball", "box", "table", etc.
    form: string;
    // "large", "small", etc.
    size: string;
    // "red", "black", "white", etc.
    color: string;
}

// The state of the world.
interface WorldState {
    // The stack of objects in each column, given as a list of stacks.
    // Each stack is a list of strings. The strings themselves are
    // keys into the `objects` map, i.e. identifiers.
    stacks: Stack[];
    // Which object the robot is currently holding.
    holding: string;
    // The column position of the robot arm.
    arm: number;
    // A mapping from strings to `ObjectDefinition`s.
    //The strings are meant to be identifiers for the
    //objects (see ExampleWorlds.ts for an example).
    objects: { [s:string]: ObjectDefinition; };
    // List of predefined example sentences/utterances that the user
    //can choose from in the UI.
    examples: string[];
}

// Interface for a world. Abstracts over the I/O required to read user
// input, print the world and perform a plan. This is needed to support
// several backends, e.g. the SVG backend that is used in the browser,
// and the text-based console backend.
interface World {
    currentState : WorldState;

    printWorld(callback? : () => void) : void;
    performPlan(plan: string[], callback? : () => void) : void;

    readUserInput(prompt : string, callback : (input:string) => void) : void;
    printSystemOutput(output : string, participant? : string) : void;
    printDebugInfo(info : string) : void;
    printError(error : string, message? : string) : void;
}

/*** World-related utility functions. ***/

// The following function is a comparison tool, not a pretty
// printer. Note that, as no object can enter or exit the world,
// a state is completely described by its stacks, the state of
// the arm can be deduced from them.
function stringifyState (state : WorldState) : string {
    var result = "";

    for(var row of state.stacks) {
        for(var obj of row) {
            result += obj + ",";
        }
        result += ";";
    }

    return result;
}

// Checks whether the application of a relation goes against phisical laws.
 function againstPhysics( rel    : string     ,
                          source : string     ,
                          dest   : string     ,
                          state  : WorldState ) {
    return source == dest

        || rel == "ontop"  && state.objects[source].form == "ball"
                           && dest != "floor"

        || rel == "inside" && state.objects[dest].form != "box"

        || rel == "inside" && (  state.objects[dest].size
                              == state.objects[source].size)
                           && (  state.objects[source].form == "pyramid"
                              || state.objects[source].form == "plank"
                              || state.objects[source].form == "box"     )

        || rel == "ontop"  && dest != "floor"
                           && ( state.objects[dest].form == "ball"
                              || state.objects[dest].form == "box" )

        || (rel == "inside" || rel == "ontop" || rel == "above")
                           && dest != "floor"
                           && state.objects[dest].size == "small"
                           && state.objects[source].size == "large"

        || rel == "under"  && source != "floor"
                           && state.objects[dest].size == "large"
                           && state.objects[source].size == "small"

        || rel == "under"  && dest == "floor"

        || rel == "ontop"  && state.objects[source].form == "box"
                           && state.objects[source].size == "small"
                           && dest != "floor"
                           && state.objects[dest].size == "small"
                           && (  state.objects[dest].form == "pyramid"
                              || state.objects[dest].form == "brick"   )

        || rel == "ontop"  && state.objects[source].form == "box"
                           && state.objects[source].size == "large"
                           && dest != "floor"
                           && state.objects[dest].form == "pyramid"
}
