var Interpreter;
(function (Interpreter) {
    function interpret(parses, currentState) {
        var errors = [];
        var interpretations = [];
        parses.forEach(function (parseresult) {
            try {
                var result = parseresult;
                result.interpretation = interpretCommand(result.parse, currentState);
                interpretations.push(result);
            }
            catch (err) {
                errors.push(err);
            }
        });
        if (interpretations.length) {
            return interpretations;
        }
        else {
            throw errors[0];
        }
    }
    Interpreter.interpret = interpret;
    function stringify(result) {
        return result.interpretation.map(function (literals) {
            return literals.map(function (lit) { return stringifyLiteral(lit); }).join(" & ");
        }).join(" | ");
    }
    Interpreter.stringify = stringify;
    function stringifyLiteral(lit) {
        return (lit.polarity ? "" : "-") + lit.relation + "(" + lit.args.join(",") + ")";
    }
    Interpreter.stringifyLiteral = stringifyLiteral;
    function interpretCommand(cmd, state) {
        var interpretation;
        var entity = interpretEntity(cmd.entity, state);
        var location = interpretLocation(cmd.location, state);
        if (cmd.command == "take") {
        }
        else if (cmd.command == "put") {
        }
        else if (cmd.command == "move") {
        }
        else {
        }
        return interpretation;
    }
    function interpretObject(obj, state) {
        var res = [];
        if (obj.form) {
            var obList = state.objects;
            var f = obj.form;
            if (obj.size && obj.color) {
                var c = obj.color;
                var s = obj.size;
                for (var key in state.objects) {
                    if (obList[key].form == f && obList[key].color == c && obList[key].size == s) {
                        res.push(key);
                    }
                }
            }
            else if (obj.size) {
                var s = obj.size;
                for (var key in state.objects) {
                    if (obList[key].form == f && obList[key].size == s) {
                        res.push(key);
                    }
                }
            }
            else if (obj.color) {
                var c = obj.color;
                for (var key in state.objects) {
                    if (obList[key].form == f && obList[key].color == c) {
                        res.push(key);
                    }
                }
            }
            else {
                for (var key in state.objects) {
                    if (state.objects[key].form == obj.form) {
                        res.push(key);
                    }
                }
            }
        }
        else if (obj.location) {
            var possible = interpretObject(obj.object, state);
            var pLocations = interpretLocation(obj.location, state);
            for (var _i = 0, possible_1 = possible; _i < possible_1.length; _i++) {
                var candidate = possible_1[_i];
                for (var _a = 0, pLocations_1 = pLocations; _a < pLocations_1.length; _a++) {
                    var l = pLocations_1[_a];
                    switch (l.rel) {
                        case "inside":
                            candidate = null;
                            break;
                        case "above":
                            candidate = null;
                            break;
                        case "beside":
                            candidate = null;
                            break;
                        case "ontop":
                            var stacks = state.stacks;
                            for (var _b = 0, stacks_1 = stacks; _b < stacks_1.length; _b++) {
                                var currStack = stacks_1[_b];
                                var candidatePosition = currStack.indexOf(candidate);
                                var objectPosition = currStack.indexOf(l.id);
                                if (objectPosition < 0)
                                    break;
                                if (candidatePosition == objectPosition + 1) {
                                    res.push(candidate);
                                }
                            }
                            break;
                        case "leftof":
                            candidate = null;
                            break;
                        case "rightof":
                            candidate = null;
                            break;
                    }
                }
            }
        }
        return res;
    }
    function interpretEntity(ent, state) {
        var res = [];
        return res;
    }
    function interpretLocation(loc, state) {
        var res = [];
        var rel = loc.relation;
        var ent = loc.entity;
        var candidates = interpretEntity(ent, state);
        for (var _i = 0, candidates_1 = candidates; _i < candidates_1.length; _i++) {
            var candidate = candidates_1[_i];
            res.push({ rel: rel, id: candidate });
        }
        return res;
    }
})(Interpreter || (Interpreter = {}));
