=== Planner ===


=== Extensions ===

* Logging extension

Checks if an object exists on the world
existsObjectId(id: string, state: WorldState) : boolean

Creates a text description of each object in the world and
stores it by the object's id.
objectDescriptions(state : WorldState):Dictionary<string, string>

planInterpretation has been modified to add the action description to the plan
array. It decides what how to construct the phrase by being aware of the arm's
state and what has happened just before in the world.

class SearchEdge extends Edge<WorldState> has been modified to allow information
about the arm's current action and the object and location it is interacting
with.


* Language extension
