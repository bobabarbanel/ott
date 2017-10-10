// Stringify should convert anything into a string
describe('the function stringify', function() {
  
  // We'll need different approaches for different types of
  // data, so it only makes sense that we'll use our very own
  // type function on stringify's input.
  it('invokes our custom "type" function', function() {
    spyOn(window, 'type').and.callThrough();
    stringify(null);
    expect(type).toHaveBeenCalled();
  });
  
  // Things that aren't Arrays and Objects we'll simply cast
  // into strings.
  it('handles everything but Arrays and Objects', function() {
    expect(stringify(und)).toEqual('undefined');
    expect(stringify(nll)).toEqual('null');
    expect(stringify(bool)).toEqual('true');
    expect(stringify(num)).toEqual('123');
    expect(stringify(str)).toEqual('"abc"');
    expect(stringify(fnc)).toEqual('function () {}');
  });

  describe('on Arrays', function() {
    beforeEach(function() {
      spyOn(window, 'stringify').and.callThrough();
    });
    it('invokes itself on each element', function() {
      var testArr = [1, 'something', []];
      stringify(testArr);
      expect(stringify.calls.count()).toEqual(testArr.length + 1); // + 1 because of the array itself
    });
    it('can handle nesting', function() {
      var testArr = [1, 'a', [true, 'b', [null], 'c'], 3];
      stringify(testArr);
      // we expect it to be called 10 times because there
      // are 3 arrays with (all combined) 7 elements
      expect(stringify.calls.count()).toEqual(10);
    });
    it('wraps with brackets and concatenates with commas', function() {
      var result = stringify([1, 'a', [true, 'b', [null], 'c'], 3]),
        expected = '[1,"a",[true,"b",[null],"c"],3]';
      expect(result).toEqual(expected);
    });
    
    // The native Array.prototype.toString method actually does
    // exactly what we want. But we'd like you to figure it out
    // yourself.
    //
    // You might find Array.prototype.join useful.
    it('does not use native string conversion', function() {
      spyOn(Array.prototype, 'toString');
      stringify([1, 2, 3]);
      expect(Array.prototype.toString).not.toHaveBeenCalled();
    });
  });

  describe('on Objects', function() {
    it('invokes itself on each value', function() {
      var testObj = {
        a: 1,
        b: 2
      };
      spyOn(window, 'stringify').and.callThrough();
      stringify(testObj);
      // If you are getting a much higher number of stringify calls, you
      // may be calling stringify when you don't need to... 
      expect(stringify.calls.count()).toEqual(Object.keys(testObj).length + 1);
    });
    it('wraps with curly braces, inserts colons, and concatenates with commas', function() {
      var result = stringify({
          a: 1,
          b: 2
        }),
        expected = '{"a": 1,"b": 2}';
      expect(result).toEqual(expected);
    });
    it('can handle arbitrary nesting', function() {
      var result = stringify({
          a: {
            b: true,
            c: [null, {
              d: 1
            }],
            e: {
              f: "abc"
            }
          },
          g: undefined
        }),
        expected = '{"a": {"b": true,"c": [null,{"d": 1}],"e": {"f": "abc"}},"g": undefined}';
      expect(result).toEqual(expected);
    });
  });
});