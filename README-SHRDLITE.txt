=== SHRDLITE PROJECT BY TEAM A-STARS ===

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

Planner.ts : Implemented planner (more on that below).

Shrdlite.ts : We made modifications in order to implement our clarification
              extension.

TestAStar.ts : Slightly modified after we modified the search to return edges
               rather than nodes.

TextWorld.ts : Upon more extensive testing of the interpreter we decided to
                modify TextWorld.ts to be able to start with an object held in
                the arm.

World.ts : We extended the WorldState interface in order to implement our
           clarification extension.
           We added some utility functions concerning the world.

shrdlite-html.ts : We commented out the code that made a popup appear and demand
                   affirmation on reload, since we found it unnecessary and
                   annoying.

shrdlite-offline.ts : We modified this file very slightly so the offline version
                      would still work after the clarification extension was
                      implemented.

=== New files we have added ===

Util.ts : Contains various utility functions.

=== Discussion of implementation ===

* A* search

* Interpreter

The core interpretation function is interpretCommand, which takes a parsed command
and returns a DNF formula. It interprets the different parts of the command
(entities and locations), and combines the results.
The functions interpretLocation, interpretEntity, and interpretObject interpret the
corresponding parse tree components and return all possibilities.
Since both entities and locations refer to objects, we look at the attributes of the
world objects and their locations relative to each other in order to interpret the
meaning of the command (i.e. what object could "the ball in the box" refer to?).

* Planner

We use the class SearchSpace to generate a graph to search in.
The graph has WorldStates as nodes, with an edge from one state
to another if the latter is reachable from the former by:
 - Putting the object in the arm down in a free location
   (if the arm is holding an object)
 - Picking up an object that is at the top of a stack
   (if the arm is empty).

The cost of an edge is the number of arm moves ("l", "r", "p" or "d")
needed.

We extended the edge class to contain information about the commands
needed to perform the edge's changes so we can easily find the commands
once the search is complete. The edges also contain information about
what object is being moved to/from which location and whether it is
being picked up or dropped, in order to aid our logging extension.

Our heuristic function, heuristic, takes a WorldState and a DNFFormula
and returns a meaningful non-zero underestimate of the number of arm
moves required for the Formula to be satisfied starting from the given
state.
The function minAccess returns the minimum number of arm moves required to
access an object (we must get all the objects on top of it out of the
way, requiring at least 4 arm moves for each of those objects),
and the function litHeuristic gives a heuristic of a single literal
by combining the minAccess values of the involved objects with the minimum
number of arm moves required to move one of the objects to a position
satisfying the literal's relation.
The heuristic value for a conjunction of literals is the maximum heuristic
value of the literals involved, since all the conjunction's literals must
be satisfied in order for the conjunction to be satisfied, in particular
the one with the highest heuristic value, but the other literals may be
satisfied as well in the process of satisfying the max value one.
The heuristic value for a disjunction of literals is the minimum heuristic
value of the literals involved, since is suffices to satisfy one of the
literals.

The function planInterpretation uses the A* search implemented in Graph.ts
to search the graph of WorldStates and find the shortest path to a goal.

=== Extensions ===

* Logging extension
We extended the system to print descriptions of the actions it is performing
in each step, such as "moving the black ball from the yellow box to the floor".
We noticed that the GUI discriminates between commands ("l", "r", "p" or "d")
and other strings, so it is possible to exploit this property to display
information to the user.
Therefore, we decided to extend the search graph edges to contain the
information needed to be able to describe the action being performed.
After an optimal path is found the information in its edges is processed
into descriptions that are pushed to the same array as the arm commands
and are printed as the commands are performed.

The following methods were defined/modified:

- objectDescriptions(state : WorldState):Dictionary<string, string>
Creates a text description of each object in the world and stores it by the
object's id. We look at all the objects in order to make the most concise
description for each one, i.e. if there is only one ball we just say "ball"
and not "small red ball".
The purpose is to be able to recall the object description using
the data on the SearchEdge.

- planInterpretation has been modified to add the action description to the plan
array. It constructs this phrase by being aware of the arm's state and what has
happened in the pervious edge/action.

- class SearchEdge extends Edge<WorldState> has been modified to allow information
about the arm's current action and the object and location it is interacting
with.

How to test it?
The only requirement is to enter a command that can be parseda and interpreted
and describes a reachable goal.
The system will output the description of every action on the interaction panel
just before performing it.

* Clarification extension

We wrote an extension to ask the user for clarification when their command can
be parsed in more than one way.
Whenever there are more that one plan, a clarification process begins. The
clarification consists on generating a description of the action to be taken
for each of the options the system could find a plan for. All the clarifications
are shown to the user on the GUI, so the user just has to write the number
associated to them. Finally, the system executes the chosen option.

World: added a variable to signal that the current processing state is
clarification.

interactive(world : World) : void: Modified to be able to manage user input
regarding the chosen interpretation. Also takes care of prompting the user if
further clarification is needed after processing a given command.

function grammarDisambiguationQuestions(parses : Parser.ParseResult[],
plans : Planner.PlannerResult[]): string[]
Generates command descriptions from every plan using describeCommand.

describeCommand(cmd : Parser.Command): string
Builds a textual description of a command.

How to test it?
Utter a command whose parse is ambiguous:
           'put the black ball in a box on the floor'
The system will show the user the possible parses it found: each one of them is
numbered. The system expects the user for any of those numbers in order to
explicitly execute that interpretation.

* Quantifier handling extension
This extension can be naturally divided into two parts:
- Handling universal quantifiers (all): we managed these quantifiers only in
  the "Entity" node which is immediate child of the "Command" node, as in all
  pre-defined questions universal quantification affected only such entity.
  We wrote a function, named "cnfToDnf",
  to convert CNF formulae into DNF ones. Then, we added code (to the
  interpreter) that checks whether the mentioned entity is universally
  quantified, in which case we straightforwardly generate a CNF formula
  which is then converted into a DNF one.
- Handling singleton quantifiers (the): we managed these quantifiers in
  every node of the parse tree, relying on exception handling. Our approach
  has been to warn the user whenever such a quantifier is applied to an
  "Object" node that has zero or more than one interpretation.

How to test it?
