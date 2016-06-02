In your repository you should also include a file called README-SHRDLITE, again describing what’s in each file (outside of what we expect) and any relevant high-level descriptions or discussion of your implementations.
This file is very important! This is where you describe what extensions you have implemented and how they work. Don’t forget to suggest examples that show off your extensions and other peculiarities of your system.

=== Note about duplicate usernames on github ===

By Michele Bizzoca : after having updated my linux distribution, by mistake I 
started using a new github username, "gentzen", instead of the original one, 
"mbx_uni_aka". Then, please, consider commits from both these usernames as mine. 

=== Files we have edited after forking ===

ExampleWorlds.ts : Since we extended the WorldState interface when implementing
                   our clarification extension, we needed to add the property
                   "clarifying" to all of the example worlds.

Graph.ts : We implemented the A* search and created some data structures to use
           for the search (more on that below).
           While implementing the planner we decided to modify the search to
           return a list of edges rather than a list of nodes.

Interpreter.ts : Implemented interpreter (more on that below).

InterpreterTestCases.ts : We added some extra test cases for more extensive
                          testing.

Planner.ts	: Implemented planner (more on that below).

Shrdlite.ts : We made modifications in order to implement our clarification
              extension.

TestAStar.ts : Slightly modified after we modified the search to return edges
               rather than nodes.

TextWorld.ts :	Upon more extensive testing of the interpreter we decided to
                modify TextWorld.ts to be able to start with an object held in
                the arm.

World.ts : We extended the WorldState interface in order to implement our
           clarification extension.
           We added some utility functions concerning the world.

shrdlite-html.ts : We commented out the code that made a popup appear and demand
                   affirmation on reload, since we found it unnecessary and
                   annoying.

shrdlite-offline.ts	: We modified this file very slightly so the offline version
                      would still work after the clarification extension was
                      implemented.

=== New files we have added ===

Util.ts : Contains various utility functions.

=== Discussion of implementation ===

* A* search

* Interpreter

* Planner

=== Extensions ===

* Logging extension

We noticed that the GUI discriminates between actions and random strings, so
it is possible to exploit this property to show information to the user.
Therefore, we decide to extend the search edge with enough knowledge to be able
to describe what had just happened and what is happening during the processing
of a plan. For such ends, this methods were defined/modified:

- existsObjectId(id: string, state: WorldState) : boolean
Checks if an object exists on the world based on its id

- objectDescriptions(state : WorldState):Dictionary<string, string>
Creates a text description of each object in the world and stores it by the
object's id. The purpose is to be able to recall the object description using
the data on the SearchEdge.

- planInterpretation has been modified to add the action description to the plan
array. It decides what how to construct the phrase by being aware of the arm's
state and what has happened just before in the world.

- class SearchEdge extends Edge<WorldState> has been modified to allow information
about the arm's current action and the object and location it is interacting
with.


* Clarification extension
We wrote an extension to ask the user for clarification when their command can be
parsed in more than one way.
Whenever there are more that one plan, a clarification process begins. The
clarification consists on generating a description of the action to be taken
for each of the options the system could find a plan for. All the clarifications
are shown to the user on the GUI, so the user just has to write the number
associated to them. Finally, the system executes the chosen option.

World: added a variable to signal that the current processing state is
clarification.

interactive(world : World) : void: Modified to be able to manage user input
regarding the chosen interpretation. Also takes care of promting the user if
further clarification is needed after processing a given command.

function grammarDisambiguationQuestions(parses : Parser.ParseResult[],
plans : Planner.PlannerResult[]): string[]
Generates command descriptions from every plan using describeCommand.

describeCommand(cmd : Parser.Command): string
Builds a textual description of a command.

* Quantifier handling extension
This extension can be naturally divided into two parts:
- Handling of the universal quantifiers: we noticed that in all pre-defined 
  questions, universal quantification affected only the "entity" which is
  immediate child of "command". Then, we wrote 
