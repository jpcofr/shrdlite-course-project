/*** General purpose utilites ***/

// A function to clone matrices.
function cloneMatrix (matrix : any[][]) : any[][] {
    var newMatrix = [];

    for(var row of matrix) {
      var newRow = [];
        for(var obj of row) {
          newRow.push(obj);
        }
      newMatrix.push(newRow);
    }

    return newMatrix;
}

// Computes the sorted, duplicate-free version of a list.
function uniqueSort(xs : any[], cmp : (x:any, y:any) => number) : any[] {
   var sorted : any[] = xs.sort(cmp);
   var result : any[] = [];

   for(var i = 0; i < sorted.length - 1; i++)
       if(cmp(sorted[i], sorted[i + 1]) != 0)
           {result.push(sorted[i]);}

   if(sorted.length > 0)
       {result.push(sorted[sorted.length - 1]);}

   return result;
}

// Computes the intersection of two lists.
function intersect(xs : any[], ys : any[], cmp : (x:any, y:any) => number) {
   var sorted1 : any[] = xs.sort(cmp);
   var sorted2 : any[] = ys.sort(cmp);
   var result  : any[] = [];

   for(var i = 0, j = 0; i < sorted1.length && j < sorted2.length;) {
       var r = cmp(sorted1[i], sorted2[j]);
       if (r == 0) {result.push(sorted1[i]); i++; j++;}
       else {r == -1 ? i++ : j++;}
   }

   return result;
}
