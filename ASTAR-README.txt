The implementation is based on two data structures:
  - A priority queue containing the frontier, sorted by (cost + heuristic)
  - A dictionary which maps every explored node to (parent, cost, heuristic, priority queue element)

At start, both the priority queue and the dictionary are initialized using only the start node.

The search is carried out by a loop that works as follows:
  - As long as the frontier is not empty, and we haven't found a goal node
    - Pop the minimum out of the priority queue, and inspect each neighbor node
      - If the neighbor is defined in the dictionary (i.e. we already explored it)
        - Then, if the reference to the priority queue is null (i.e. it is not in the frontier)
          - Then skip this neighbour
          - Otherwise, we got a better path, then we update the information record and the data structures.
        - Otherwise, we create a new information record, update the data structures, and check wether 
          the neighbor is a goal node.
      
NOTE : the priority is implemented as a binary search tree, as heaps and priority queues from the
       collections library does not allow to update their elements.