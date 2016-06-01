=== Planner ===


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
