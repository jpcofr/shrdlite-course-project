///<reference path="lib/collections.ts"/>
///<reference path="lib/node.d.ts"/>

/***  Types for generic A\* implementation. ***/

// An edge in a graph.
class Edge<Node> {
    from : Node;
    to   : Node;
    cost : number;
}

// A directed graph.
interface Graph<Node> {
    /** Computes the edges that leave from a node. */
    outgoingEdges(node : Node) : Edge<Node>[];
    /** A function that compares nodes. */
    compareNodes : collections.ICompareFunction<Node>;
}

// The result of an A\* search.
type SearchResult<Node> = Edge<Node>[];

/*** A\* search implementation. ***/

// Search function, parameterised by a `Node` type.
//   @param graph The graph on which to perform A\* search.
//   @param start The initial node.
//   @param goal A function that returns true when given a goal node.
//      Used to determine if the algorithm has reached the goal.
//   @param heuristics The heuristic function. Used to estimate
//      the cost of reachEdge<Node>[]ing the goal from a given Node.
//   @param timeout Maximum time (in seconds) to spend performing A\*
//      search.
//   @param stringize Function to convert nodes into unique string
//      representations.
//   @returns The list of edges that brings from the start node to
//            a goal node, or null if such path does not exists.
function aStarSearch<Node> ( graph : Graph<Node>             ,
                             start : Node                    ,
                             goal : (n:Node) => boolean      ,
                             heuristics : (n:Node) => number ,
                             timeout : number                ,
                             stringize? : (n:Node) => string )
: SearchResult<Node> {
    var timer = setTimeout(function () {return null;}, timeout * 1000);

    var explored = new collections.Dictionary<Node, Info<Node>> (stringize);
    var frontier = new collections.BSTree<Prio<Node>>
      ( (x, y) => { var d = x.rank - y.rank;
                    return d != 0 ? d : graph.compareNodes(x.node, y.node); } );

    var startHeur = heuristics(start);

    var startPrio = { node      : start     ,
                      rank      : startHeur } ;

    var startInfo = { parent    : <Edge<Node>> null ,
                      cost      : 0                 ,
                      heuristic : startHeur         ,
                      priority  : startPrio         } ;

    explored.setValue(start, startInfo);
    frontier.add(startPrio);

    while (!frontier.isEmpty()) { // FOR EACH NODE IN THE FRONTIER
        var min = frontier.minimum ();
        if (goal(min.node)) {break;}

        var minInfo = explored.getValue(min.node);
        var minEdges = graph.outgoingEdges(min.node);

        frontier.remove (min);
        minInfo.priority = null;

        for (var edge of minEdges) { // FOR EACH NEIGHBOUR NODE
            var toNode = edge.to;
            var toCost = minInfo.cost + edge.cost;
            var toInfo = explored.getValue (toNode);

            if(toInfo != null) { // IF IT HAS BEEN EXPLORED
                var toPrio = toInfo.priority;

                if (  toPrio != null // IF IT IS IN THE FRONTIER
                   && toInfo.cost > toCost ) { // IF WE FOUND A SHORTER PATH
                    explored.remove(toNode);
                    frontier.remove(toPrio);

                    toInfo.cost = toCost; toInfo.parent = edge;
                    toPrio.rank = toInfo.cost + toInfo.heuristic;

                    explored.setValue(toNode, toInfo);
                    frontier.add(toPrio);
                }
            }
            else { // IF IT HAS NOT BEEN EXPLORED
                var newHeur = heuristics(toNode);

                var newPrio = { node : toNode           ,
                                rank : toCost + newHeur } ;

                var newInfo = { parent    : edge     ,
                                cost      : toCost   ,
                                heuristic : newHeur  ,
                                priority  : newPrio  } ;

                explored.setValue(toNode, newInfo);
                frontier.add(newPrio);
            }
        }
    }

    if(frontier.isEmpty()) return null;

    var cursor = frontier.minimum().node;
    var result = <SearchResult<Node>> [];

    while(cursor != start) {
        edge = explored.getValue(cursor).parent;
        result.push(edge);
        cursor = edge.from;
    }

    result.reverse();

    clearTimeout(timer);
    return result;
}

// Data associated to each explored node.
interface Info<Node> {
    parent    : Edge<Node> ;
    cost      : number     ;
    heuristic : number     ;
    priority  : Prio<Node> ;
}

// An entry of the priority queue.
interface Prio<Node> {
    node : Node   ;
    rank : number ;
}

/*** Edge-related utility functions. ***/

// Computes the list of nodes along a given path.
function getPath<Node> (start : Node, edges : Edge<Node>[]) : Node[] {
    var result = [start];

    for(var edge of edges) {
        result.push(edge.to);
    }

    return result;
}

// Computes the cost of a given path.
function getCost<Node> (edges : Edge<Node>[]) : number {
    var result = 0;

    for(var edge of edges) {
        result += edge.cost;
    }

    return result;
}
