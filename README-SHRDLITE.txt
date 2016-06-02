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
           The function stringifyState is useful for comparing two WorldStates,
           which is necessary since our planner uses a graph with WorldStates as
           nodes.
           The function againstPhysics checks whether a given relation between
           two objects goes against the world's physical laws.
           The function existsObjectId checks whether a given object id refers to
           an object that can be found in the given world.
           The function objectDescriptions creates a mapping from each object
           in the world to its most concise description.

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

The A* search algorithm is based on two data structures:
  - A priority queue, implemented as a binary search tree, representing the
      frontier. Its elements are structures consisting of a node and a priority
      value, which is the cost of the current shortest path to the node plus 
      the value of the heuristic function.
  - A dictionary, containing information about each explored node, including
    the frontier. To each node is associated:
    - A reference to an element of the priority queue, where null indicates
        that the node is not in the frontier.
    - The parent edge in the current shortest path to it.
    - The cost of the shortest path to it.
    - The heuristic value, which is stored to avoid to compute it many times.

For what concerns initialization, both data structures initially contain a
single entry for the start node. 

Then, as long as the queue is not empty and the
top of the queue is not a goal node, we proceed with the usual A* search loop.

Finally, in case of success, we compute the list of edges proceeding backwards
from the goal node. We preferred a list of edges to a list of nodes as this
easily allows carry additional information, as needed by other parts of the 
code.

It is important to note that the usage of a binary search tree is crucial,
as we want to perform a graph search, not a tree search. In fact, when we
encounter an explored node with a new shortest path, we modify it without
invalidating the invariant of the priority queue. This is achieved by 
removing the old record from the binary search tree and adding a new one.

When we run "make aStarTests" we are warned that heuristics do not give the
expected speedup. We tried to improve the code in several ways, but nothing
avoided such message. We also tried, as suggested by the TA, to replace the BST
with a heap-based structure, but tests show that this doesn't avoid the message
and leads to worse peformance.

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
happened in the previous edge/action.

- class SearchEdge extends Edge<WorldState> has been modified to allow information
about the arm's current action and the object and location it is interacting
with.

How to test it?
The only requirement is to enter a command that can be parsed and interpreted
and describes a reachable goal.
The system will output the description of every action on the interaction panel
just before performing it.

* Clarification extension

We wrote an extension to ask the user for clarification when their command can
be parsed in more than one way.
Whenever the function parseUtteranceIntoPlan in Shrdlite.ts finds more than one
plan for a given utterance (since there is one plan returned for each interpretation
and one interpretation for each parse, this means there must be more than one parse),
a clarification process begins.
The clarification consists of generating a description of the action to be taken
for each of the options the system could find a plan for. All the descriptions
are shown to the user on the GUI, and the user just has to enter the number
associated with the option they prefer.
Finally, the system executes the chosen option.

The following modifications were made to implement this:

World: added a variable to WorldState to signal that the current processing state
is clarification, in order to be able to properly handle input from the user.

interactive(world : World) : void: Modified to be able to manage user input
regarding the chosen interpretation. Also takes care of prompting the user if
further clarification is needed after processing a given command.

function grammarDisambiguationQuestions(plans : Planner.PlannerResult[])
                                                : string[]
Generates command descriptions for each given plan using describeCommand.

describeCommand(cmd : Parser.Command): string
Builds a textual description of a command by describing the involved object
and location, using the describeObject and describeLocation functions.

How to test it?
Utter a command whose parse is ambiguous, for instance:
           'put the black ball in a box on the floor'
(Here the parser will not know whether the black ball is in a box, or if we should
put it in a box on the floor).
The system will show the user the possible parses it found: each one of them is
numbered. The system expects the user to enter one of those numbers in order to
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
Utter a command to move all objects matching a description:
         'put all large balls inside a box'
The system will try to reach a world state where each large ball is inside 
a box.