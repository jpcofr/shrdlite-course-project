///<reference path="lib/collections.ts"/>
///<reference path="lib/node.d.ts"/>

/** Graph module
*
*  Types for generic A\* implementation.
*
*  *NB.* The only part of this module
*  that you should change is the `aStarSearch` function. Everything
*  else should be used as-is.
*/

/** An edge in a graph. */
class Edge<Node> {
    from : Node;
    to   : Node;
    cost : number;
}

/** A directed graph. */
interface Graph<Node> {
    /** Computes the edges that leave from a node. */
    outgoingEdges(node : Node) : Edge<Node>[];
    /** A function that compares nodes. */
    compareNodes : collections.ICompareFunction<Node>;
}

/** Type that reports the result of a search. */
class SearchResult<Node> {
    /** The path (sequence of Nodes) found by the search algorithm. */
    path : Node[];
    /** The total cost of the path. */
    cost : number;
}

/**
* A\* search implementation, parameterised by a `Node` type. The code
* here is just a template; you should rewrite this function
* entirely. In this template, the code produces a dummy search result
* which just picks the first possible neighbour.
*
* Note that you should not change the API (type) of this function,
* only its body.
* @param graph The graph on which to perform A\* search.
* @param start The initial node.
* @param goal A function that returns true when given a goal node. Used to determine if the algorithm has reached the goal.
* @param heuristics The heuristic function. Used to estimate the cost of reaching the goal from a given Node.
* @param timeout Maximum time (in seconds) to spend performing A\* search.
* @returns A search result, which contains the path from `start` to a node satisfying `goal` and the cost of this path.
*/
function aStarSearch<Node> (
    graph : Graph<Node>,
    start : Node,
    goal : (n:Node) => boolean,
    heuristics : (n:Node) => number,
    timeout : number
) : SearchResult<Node> {
    var failure : SearchResult<Node> = {path : [], cost : 0};
    var timer = setTimeout(function () {return failure;}, timeout * 1000);

    var explored = new collections.Dictionary<Node, Info<Node>> ();
    var frontier = new collections.BSTree<Prio<Node>>
      ( function(x,y) {
          var d = x.rank - y.rank;
          return d != 0 ? d : graph.compareNodes(x.node, y.node); } );

    var startHeur = heuristics(start);

    var startPrio = { node      : start     ,
                      rank      : startHeur } ;

    var startInfo = { parent    : start      ,
                      cost      : 0          ,
                      heuristic : startHeur  ,
                      priority  : startPrio  } ;

    explored.setValue(start, startInfo);
    frontier.add(startPrio);

    var result = goal(start) ? start : null;

    while(!frontier.isEmpty() && result == null) { // FOR EACH NODE IN THE FRONTIER
      var min = frontier.minimum();
      var minInfo = explored.getValue(min.node);
      var minEdges = graph.outgoingEdges(min.node);

      minEdges = minEdges.sort(function (x,y) {return x.cost - y.cost;});

      frontier.remove(min);
      minInfo.priority = null;

      for (var edge of minEdges) { // FOR EACH NEIGHBOUR NODE
        var toCost = minInfo.cost + edge.cost;
        var toInfo = explored.getValue(edge.to);

        if(toInfo != null) { // IF IT HAS BEEN EXPLORED
          var toPrio = toInfo.priority;

          if (toPrio != null && toInfo.cost > toCost) {
            explored.remove(edge.to);
            frontier.remove(toPrio);

            toInfo.cost = toCost; toInfo.parent = min.node;
            toPrio.rank = toInfo.cost + toInfo.heuristic;

            explored.setValue(edge.to, toInfo);
            frontier.add(toPrio);
          }
        }
        else { // IF IT HAS NOT BEEN EXPLORED
           var newHeur = heuristics(edge.to);

           var newPrio = { node : edge.to          ,
                           rank : toCost + newHeur } ;

           var newInfo = { parent    : min.node ,
                           cost      : toCost   ,
                           heuristic : newHeur  ,
                           priority  : newPrio  } ;

           explored.setValue(edge.to, newInfo);
           frontier.add(newPrio);

           if(goal(edge.to)) {result = edge.to;}
        }
      }
    }

    if(result == null) return failure;

    var cost = explored.getValue(result).cost;
    var path = [result];

    while(result != start) {
      result = explored.getValue(result).parent;
      path.push(result);
    }
    path.reverse();

    clearTimeout(timer);
    return {path : path, cost : cost};
}

class Info<Node> {
  parent    : Node       ;
  cost      : number     ;
  heuristic : number     ;
  priority  : Prio<Node> ;
}

class Prio<Node> {
  node : Node   ;
  rank : number ;
}
