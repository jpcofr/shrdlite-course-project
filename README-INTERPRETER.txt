All of the code for the interpreter is in the file Interpreter.ts.

The core interpretation function is interpretCommand, which takes a parsed command and returns
a DNF formula.
It interprets the different parts of the command and combinines the results.

The functions interpretLocation, interpretEntity, and interpretObject interpret the corresponding parse tree
components and return all possibilities.

We made a small change to the given interpret function in order to handle empty results.
