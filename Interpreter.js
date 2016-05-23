var Interpreter;
(function (Interpreter) {
    function interpret(parses, currentState) {
        var errors = [];
        var interpretations = [];
        parses.forEach(function (parseResult) {
            try {
                var result = parseResult;
                result.interpretation = interpretCommand(result.parse, currentState);
                if (result.interpretation.length > 0) {
                    interpretations.push(result);
                }
            }
            catch (err) {
                errors.push(err);
            }
        });
        if (interpretations.length > 0) {
            return interpretations;
        }
        else {
            throw errors[0];
        }
    }
    Interpreter.interpret = interpret;
    function stringify(result) {
        return result.interpretation.map(function (literals) {
            return stringifyConjunction(literals);
        }).join(" | ");
    }
    Interpreter.stringify = stringify;
    function stringifyConjunction(con) {
        return con.map(function (lit) { return stringifyLiteral(lit); }).join(" & ");
    }
    Interpreter.stringifyConjunction = stringifyConjunction;
    function stringifyLiteral(lit) {
        return (lit.polarity ? "" : "-") +
            lit.relation +
            "(" +
            lit.args.join(",") +
            ")";
    }
    Interpreter.stringifyLiteral = stringifyLiteral;
    function compareLiteral(l1, l2) {
        return stringifyLiteral(l1).localeCompare(stringifyLiteral(l2));
    }
    Interpreter.compareLiteral = compareLiteral;
    function compareConjunction(c1, c2) {
        return stringifyConjunction(c1).localeCompare(stringifyConjunction(c2));
    }
    Interpreter.compareConjunction = compareConjunction;
    function badPlacement(obj, loc, state) {
        return againstPhysics(loc.rel, obj, loc.id, state);
    }
    function interpretCommand(cmd, state) {
        var result = [];
        if (cmd.command == "take") {
            for (var _i = 0, _a = interpretEntity(cmd.entity, state); _i < _a.length; _i++) {
                var ent = _a[_i];
                if (ent != state.holding) {
                    result.push([{ polarity: true, relation: "holding", args: [ent] }]);
                }
            }
        }
        else if (!cmd.entity) {
            for (var _b = 0, _c = interpretLocation(cmd.location, state); _b < _c.length; _b++) {
                var loc = _c[_b];
                if (!badPlacement(state.holding, loc, state)) {
                    result.push([{ polarity: true, relation: loc.rel, args: [state.holding, loc.id] }]);
                }
            }
        }
        else {
            for (var _d = 0, _e = interpretEntity(cmd.entity, state); _d < _e.length; _d++) {
                var ent = _e[_d];
                for (var _f = 0, _g = interpretLocation(cmd.location, state); _f < _g.length; _f++) {
                    var loc = _g[_f];
                    if (!badPlacement(ent, loc, state)) {
                        result.push([{ polarity: true, relation: loc.rel, args: [ent, loc.id] }]);
                    }
                }
            }
        }
        for (var i = 0; i < result.length; i++) {
            result[i] = uniqueSort(result[i], compareLiteral);
        }
        result = uniqueSort(result, compareConjunction);
        return result;
    }
    function existsObjectId(id, state) {
        if (id == state.holding) {
            return true;
        }
        for (var _i = 0, _a = state.stacks; _i < _a.length; _i++) {
            var stack = _a[_i];
            if (stack.indexOf(id) >= 0) {
                return true;
            }
        }
        return false;
    }
    function locateObjectId(id, state) {
        for (var _i = 0, _a = state.stacks; _i < _a.length; _i++) {
            var col = _a[_i];
            for (var _b = 0, col_1 = col; _b < col_1.length; _b++) {
                var elem = col_1[_b];
                if (elem == id) {
                    return { col: state.stacks.indexOf(col), row: col.indexOf(elem) };
                }
            }
        }
        if (id == state.holding) {
            return { row: null, col: state.arm };
        }
        return null;
    }
    Interpreter.locateObjectId = locateObjectId;
    function interpretObject(obj, state) {
        var foundObjs = [];
        if (obj.location == null) {
            for (var id in state.objects) {
                if (existsObjectId(id, state)
                    && (obj.form == null || obj.form == "anyform" || obj.form == state.objects[id].form)
                    && (obj.size == null || obj.size == state.objects[id].size)
                    && (obj.color == null || obj.color == state.objects[id].color)) {
                    foundObjs.push(id);
                }
            }
            if (obj.form == "floor") {
                foundObjs.push("floor");
            }
        }
        else {
            var objects1 = interpretObject(obj.object, state);
            var objects2 = [];
            var locations = interpretLocation(obj.location, state);
            for (var _i = 0, locations_1 = locations; _i < locations_1.length; _i++) {
                var location_1 = locations_1[_i];
                var rc = locateObjectId(location_1.id, state);
                if (rc == null) {
                    if (location_1.rel == "ontop") {
                        for (var _a = 0, _b = state.stacks; _a < _b.length; _a++) {
                            var col = _b[_a];
                            if (col.length > 0) {
                                objects2.push(col[0]);
                            }
                        }
                    }
                    if (location_1.rel == "above") {
                        for (var _c = 0, _d = state.stacks; _c < _d.length; _c++) {
                            var col = _d[_c];
                            for (var _e = 0, col_2 = col; _e < col_2.length; _e++) {
                                var elem = col_2[_e];
                                objects2.push(elem);
                            }
                        }
                    }
                }
                else {
                    var target = state.stacks[rc.col][rc.row];
                    var justAbove = state.stacks[rc.col][rc.row + 1];
                    switch (location_1.rel) {
                        case "ontop":
                            if (justAbove != null && state.objects[target].form != "box") {
                                objects2.push(justAbove);
                            }
                            break;
                        case "above":
                            for (var _f = 0, _g = state.stacks[rc.col]; _f < _g.length; _f++) {
                                var t = _g[_f];
                                if (state.stacks[rc.col].indexOf(t) > rc.row) {
                                    objects2.push(t);
                                }
                            }
                            break;
                        case "under":
                            for (var _h = 0, _j = state.stacks[rc.col]; _h < _j.length; _h++) {
                                var t = _j[_h];
                                if (state.stacks[rc.col].indexOf(t) < rc.row) {
                                    objects2.push(t);
                                }
                            }
                            break;
                        case "inside":
                            if (justAbove != null && state.objects[target].form == "box") {
                                objects2.push(justAbove);
                                if (state.objects[justAbove].form == "box" && state.stacks[rc.col][rc.row + 2] != null) {
                                    objects2.push(state.stacks[rc.col][rc.row + 2]);
                                }
                            }
                            break;
                        case "beside":
                            for (var _k = 0, _l = state.stacks[rc.col - 1]; _k < _l.length; _k++) {
                                var t = _l[_k];
                                objects2.push(t);
                            }
                            for (var _m = 0, _o = state.stacks[rc.col + 1]; _m < _o.length; _m++) {
                                var t = _o[_m];
                                objects2.push(t);
                            }
                            break;
                        case "leftof":
                            for (var _p = 0, _q = state.stacks; _p < _q.length; _p++) {
                                var s = _q[_p];
                                if (state.stacks.indexOf(s) < rc.col) {
                                    for (var _r = 0, s_1 = s; _r < s_1.length; _r++) {
                                        var t = s_1[_r];
                                        objects2.push(t);
                                    }
                                }
                            }
                            break;
                        case "rightof":
                            for (var _s = 0, _t = state.stacks; _s < _t.length; _s++) {
                                var s = _t[_s];
                                if (state.stacks.indexOf(s) > rc.col) {
                                    for (var _u = 0, s_2 = s; _u < s_2.length; _u++) {
                                        var t = s_2[_u];
                                        objects2.push(t);
                                    }
                                }
                            }
                            break;
                    }
                }
                foundObjs = intersect(objects1, objects2, function (x, y) { return x.localeCompare(y); });
            }
        }
        return foundObjs;
    }
    function interpretEntity(ent, state) {
        return interpretObject(ent.object, state);
    }
    function interpretLocation(loc, state) {
        var result = [];
        for (var _i = 0, _a = interpretEntity(loc.entity, state); _i < _a.length; _i++) {
            var candidate = _a[_i];
            result.push({ rel: loc.relation, id: candidate });
        }
        return result;
    }
})(Interpreter || (Interpreter = {}));
