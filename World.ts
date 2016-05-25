///<reference path="lib/collections.ts"/>

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

// Checks whether the application of a relation goes against physical laws.
 function againstPhysics( rel    : string     ,
                          source : string     ,
                          dest   : string     ,
                          state  : WorldState ) : boolean {
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


// Checks whether an object with the given id can be found in the
// world stacks or arm.
function existsObjectId(id: string, state: WorldState): boolean {
    if (id == state.holding) { return true; }
    for (let stack of state.stacks)
        if (stack.indexOf(id) >= 0) { return true; }
    return false;
}


// A function that creates a mapping from each object
// to its most concise description.
function objectDescriptions(state : WorldState) : collections.Dictionary<string, string> {
    // Group the objects by form.
    var forms = new collections.MultiDictionary<string, string> ();
    for (var id in state.objects) {
        if (existsObjectId(id, state)) {
            var form = state.objects[id].form;
            forms.setValue(form,id);
        }
    }
    var result = new collections.Dictionary<string, string> ();
    for (var form of forms.keys()) {
        if (forms.getValue(form).length == 1) {
            // If there is only one object of this form,
            // we refer to it by its form.
            var id = forms.getValue(form)[0];
            result.setValue(id,"the " + form);
        }
        else {
            for (var id of forms.getValue(form)) {
                var col = state.objects[id].color;
                var size = state.objects[id].size;
                var colInclude = false;
                var sizeInclude = false;
                for (var otherId of forms.getValue(form)) {
                    if (otherId != id) {
                        if (state.objects[otherId].color == col) {
                            // If we have 2 objects of the same form and color,
                            // we must distinguish by size.
                            sizeInclude = true;
                        }
                        if (state.objects[otherId].size == size) {
                            // If we have 2 objects of the same form and size,
                            // we must distinguish by color.
                            colInclude = true;
                        }
                    }
                }
                if (!colInclude && !sizeInclude) {
                    // If an object differs in both size and color from all
                    // others of the same form, we distinguish it by size.
                    sizeInclude = true;
                }
                var sizeDescr = sizeInclude ? size + " " : "";
                var colDescr = colInclude ? col + " " : "";
                var description = "the " + sizeDescr + colDescr + form;
                result.setValue(id,description);
            }
        }
    }
    return result;
}
