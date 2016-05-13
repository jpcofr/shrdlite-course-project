GENERAL DESCRIPTION:

The core interpretation function is interpretCommand, which takes a parsed command and returns a DNF formula.
It interprets the different parts of the command and combines the results.

File list:
- Interpreter.ts.

ADDED FUNCTIONS (Inerpreter.ts):
The functions interpretLocation, interpretEntity, and interpretObject interpret the corresponding parse tree components and return all possibilities.

CHANGES TO ORIGINAL (Inerpreter.ts):
We made a small change to the given interpret function in order to handle empty results.
