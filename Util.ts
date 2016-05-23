/*** General purpose utilites ***/

// A function to clone matrices.
function cloneMatrix (matrix : any[][]) : any[][] {
    var newMatrix = [];
    for(var row of matrix) {newMatrix.push(row.slice());}

    return newMatrix;
}

// Computes the sorted, duplicate-free version of a list.
function uniqueSort ( xs : any[]                     ,
                      cmp : (x:any, y:any) => number )
: any[] {
    var sorted = xs.slice().sort(cmp);
    var result = [];

    for(var i = 0; i < sorted.length - 1; i++)
        if(cmp(sorted[i], sorted[i + 1]) != 0)
            {result.push(sorted[i]);}

    if(sorted.length > 0)
        {result.push(sorted[sorted.length - 1]);}

    return result;
}

// Computes the duplicate-free intersection of two lists.
function uniqueIntersect ( xs : any[]                     ,
                           ys : any[]                     ,
                           cmp : (x:any, y:any) => number )
: any[] {
    var sorted1 = xs.slice().sort(cmp);
    var sorted2 = ys.slice().sort(cmp);
    var result  = [];

    for(var i = 0, j = 0; i < sorted1.length && j < sorted2.length;) {
        var t1 = sorted1[i];
        var t2 = sorted2[j];

        var r = cmp(t1, t2);

        if (r == 0) {
            result.push(t1); i++; j++;
            while(cmp(sorted1[i], t1) == 0) {i++;}
            while(cmp(sorted2[j], t1) == 0) {j++;}
        }
        else {r == -1 ? i++ : j++;}
    }

   return result;
}
