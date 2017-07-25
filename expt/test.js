function multiplyBy10(num) {
    return helperM10(num, num);
}
function helperM10(adder, count){
    if(count === 0) return adder;
    return adder + helperM10(adder, count-1);
}
console.log(multiplyBy10(9));

function countEvens(arr) {
    return helperCE(arr, 0);
}
function helperCE(arr, count){
    if(arr.length === 0) return count;
    return helperCE(arr.slice(1), count + ((arr[0]%2 === 0) ? 1 : 0));
}
console.log(countEvens([1,2,3,4,8,5,6]));