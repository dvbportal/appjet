
/** @fileOverview Helper functions for working with strings and easily formatting objects as HTML.
 *
 * @example
var person = { firstName: "Ben", lastName: "Bitfiddler" };
person.toString = function() {
  return this.firstName + " " + this.lastName;
}
print(person); // prints "Ben Bitfiddler"
 */


/*
 * Helper function that converts a raw string to an HTML string, with
 * character entities replaced by appropriate HTML codes, and newlines
 * rentered as BRs.
 *
 * <p>A more general version of this function is toHTML(), which can operate
 * on not just strings, but any object.
 *
 * @param {string} str the raw string
 * @return {string} HTML-formatted string
 */
function _stringToHTML(str) {
  // TODO: use an array and call join at the end instead of
  //   concatenation as a performance improvements?
  var result = "";
  var lastCharBlank = false;
  var len = str.length;
  for(var i=0;i<len;i++) {
    var c = str[i];
    if (c == ' ') {
      // every second consecutive space becomes a &nbsp;
      if (lastCharBlank) {
	lastCharBlank = false;
	result += '&nbsp;';
      }
      else {
	lastCharBlank = true;
	result += ' ';
      }
    } else {
      lastCharBlank = false;
      if (c == '&') result += '&amp;';
      else if (c == '<') result += '&lt;';
      else if (c == '>') result += '&gt;';
      else if (c == '\n') result += '<br/>\n';
      else if (c == '\t') {
	for(var j=1;j<=7;j++) {
	  result += '&nbsp;';
	}
	result += ' ';
      }
      else {
	var code = c.charCodeAt(0);
	if (code < 128) {
	  result += c;
	}
	else {
	  // use character code
	  result += ("&#"+code+";");
	}
      }
    }
  }
  return result;
}

// used to convert an object to HTML when the object does not have a
// toHTML method.
//
function _coerceObjectToHTML(obj) {
  var t = TABLE({border: 1, cellpadding: 2, cellspacing: 0});
  eachProperty(obj, function(name, value) {
    t.push(TR(TH(String(name)), TD(String(value))));
  });
  return toHTML(t);
}

// Converts an array to an HTML list by listing its properties and
// recursively converting the values to HTML by calling toHTML() on
// each of them.
function _objectToOL(obj) {
  var l = OL();
  eachProperty(obj, function(name, value) {
      l.push(LI({value: name}, value));
    });
  return l;
}

function _sameProperties(obj1, obj2) {
  if (typeof(obj1) != 'object' || typeof(obj2) != 'object')
    return typeof(obj1) == typeof(obj2);

  var mismatch = 0;
  eachProperty(obj1, function(name) {
    if (! obj2.hasOwnProperty(name)) {
      mismatch++;
    }});
  eachProperty(obj2, function(name) {
    if (! obj1.hasOwnProperty(name)) {
      mismatch++;
    }});
  return mismatch < 2;
}

//
// for pretty-printing arrays.  needs a lot of work.
//
function _arrayToHTML(a) {
  if (a.length === 0) {
    return "";
  }
  if (typeof(a[0]) != 'object') {
    return toHTML(_objectToOL(a));
  } else if (! _sameProperties(a[0], a[1])) {
    return toHTML(_objectToOL(a));
  } else {
    return appjet._internal.likeObjectsToHTML(function (f) {
	a.forEach(function(value, i) {
	    f({index: i}, value, {});
	  })}, null);
  }
}

/** @ignore */

// a foreaching function that takes three arguments: properties to put first,
// properties to put in the middle, and properties to put at the end.
// and a table header (with large colspan)
appjet._internal.likeObjectsToHTML = function(forEachFunction, tophead) {
  objs = [];
  prepnames = new StringSet();
  objpnames = new StringSet();
  postpnames = new StringSet();
  rows = []

  var t = TABLE({border: 1, cellpadding: 2, cellspacing: 0});
  var head = TR();
  if (tophead)
    t.push(tophead);
  t.push(head);

  var butWaitTheresMore = false;
  var howManyMore = 0;

  forEachFunction(function(pre, o, post) {
    if (objs.length >= 10) {
      butWaitTheresMore = true;
      howManyMore++;
      return;
    }
    objs.push({pre: pre, o: o, post: post});
    var tr = TR()
    rows.push(tr);
    t.push(tr);

    eachProperty(pre, function(name) { prepnames.add(name); });
    eachProperty(o, function(name) { objpnames.add(name); });
    eachProperty(post, function(name) { postpnames.add(name); });
  });
  var numpnames = 0;
  var appendTDsForPropName = function (where) {
    return function(name) {
      numpnames++;
      head.push(TH(name));
      for (var j = 0; j < objs.length; ++j) {
	if (! (objs[j][where] === undefined) && ! (objs[j][where][name] === undefined))
	  rows[j].push(TD(String(objs[j][where][name])));
	else
	  rows[j].push(TD());
      }
    }
  }
  prepnames.forEach(appendTDsForPropName("pre"));
  objpnames.forEach(appendTDsForPropName("o"));
  postpnames.forEach(appendTDsForPropName("post"));
  if (butWaitTheresMore) {
    t.push(TR(TD({colspan: numpnames}, "..."+howManyMore+
		 " additional element"+(howManyMore == 1 ? "" : "s")+" omitted...")));
  }
  return toHTML(t);
}


//----------------------------------------------------------------
// print calls
//----------------------------------------------------------------

/**
 * HTML-aware printing.  This function prints its arguments to the
 * body of the page.  Printing a string will cause it to show up as-is
 * on the screen (even if it contains HTML tags or angle-brackets).
 * Printing an HTML tag object will cause it to be rendered on the
 * screen.  Printing a normal Javascript object or array will cause it to be rendered
 * in an easily-readable HTML format.
 *
 * @param {*} thing1 any javascript type
 * @param {*} thing2 any javascript type
 * @param {*} etc ...
 */
function print(thing1, thing2, etc) {
  var args = Array.prototype.slice.call(arguments);

  args.forEach(function(x) {
    _doWrite(toHTML(x));
  });
}

function _doWrite(str) {
  if (appjet.isShell) {
    appjet._native.write(str);
  } else {
    page.body.write(str);
  }
}

/**
 * Like print(...), but prints its arguments inside an HTML p (paragraph) tag.
 *
 * @param {*} thing1 any javascript type
 * @param {*} thing2 any javascript type
 * @param {*} etc ...
 */
function printp(thing1, thing2, etc) {
  var args = Array.prototype.slice.call(arguments);
  args.unshift({}); // no HTML attributes, other args should not be taken as attributes

  // newline before and after -- leaves empty line between printp's in the HTML source,
  // but avoids a printp ever sharing a line with raw stuff, which could look ugly.
  _doWrite("\n");
  print(P.apply(this, args));
  _doWrite("\n");
}

/**
 * Prints a string with any number of variables substituted in, as
 * popularized by C's function of the same name.  Some common substitutions:
 *
 * <ul><li>%d - an integer</li><li>%f - a floating-point number</li><li>%b - a boolean</li>
 * <li>%s - a string</li></ul>
 *
 * <p>Each time one of these "slot" appears in your format string, the next argument is displayed
 * according to the type of slot you specified.
 *
 * <p>AppJet supports <a href="http://java.sun.com/j2se/1.5.0/docs/api/java/util/Formatter.html">
 * Java's specification of printf</a>, which has a ton of features, including selecting
 * arguments out of order, formatting dates and times, and specifying how many characters
 * wide each slot should be.
 *
 * @example
var x = 5;
printf("an integer: %d", x);
printf("Two strings: [%s] and [%s].", "string one", "string two");
 *
 * @param {string} formatString
 * @param {*} arg1
 * @param {*} arg2
 * @param {*} arg3 ...
 */
function printf(formatString, arg1, arg2, etc) {
  print(sprintf.apply(this, arguments));
}

/**
 * Just like printf, but returns the string instead of printing it.
 * @example
var result = sprintf("%f", Math.sqrt(2));
print("The square root of two, as a string, is: ", result);
 *
 * @param {string} formatString
 * @param {*} arg1
 * @param {*} arg2
 * @param {*} arg3 ...
 */
function sprintf(formatString, arg1, arg2, etc) {
  if (typeof(formatString) != 'string') {
    throw new Error('printf takes a string as the first argument.');
  }
  var argList = [];
  for (var i = 1; i < arguments.length; i++) {
    if (arguments[i] instanceof Date)
      argList.push(arguments[i].getTime());
    else
      argList.push(arguments[i]);
  }
  return appjet._native.printf(formatString, argList);
};

/**
 * Replaces keys of data found in string with their corresponding values.
 *
 * <p>(Inspired by http://javascript.crockford.com/remedial.html)
 *
 * @example
var data = {name: "Aaron", age: 25, today: new Date()};
print(supplant(data, """

{name}'s age is {age} years, as of {today}.

"""));

 * @param {object} data dictionary of values
 * @param {string} str
 * @return {string} str with keys of data replaced by their values
 */
function supplant(data, str) {
  var s = str;
  var o = data;
  function rep(a, b) {
    var r = o[b];
    if (typeof(r) != 'undefined') {
      return r;
    } else {
      return a;
    }
  }
  return s.replace(/{([^{}]*)}/g, rep);
};

//----------------------------------------------------------------
// raw printing
//----------------------------------------------------------------
var _raw_prototype = object(Object.prototype);
_raw_prototype.toString = function() { return this._text; };
_raw_prototype.toHTML = function() { return this._text; };

/**
 * Used for printing un-escaped HTML, such as your own HTML tags.
 *
 * <p>Normally, printing a string will cause it to be translated
 * so that it appears the same on the screen as it did in your code.
 * If you're writing your own HTML, you don't want it to be processed
 * this way. Wrapping a string in html(...) by-passes normal printing behavior,
 * so that print(html(" -- html goes here ---")) will write the HTML
 * directly to the page.
 *
 * <p>If you want to mix your own HTML code with HTML code generated from a
 * tag object, you can get the HTML for the tag by calling its toHTML(...) method.
 *
 * <p>Multiple arguments to html(...) will be concatenated into one string.
 *
 * @example
print(html("""
&lt;br /&gt;
&lt;br /&gt;
&lt;div&gt;&lt;p&gt;Here is some text inside a P inside a DIV.&lt;/p&gt;
&lt;/div&gt;
&lt;br /&gt;
"""));
 *
 * @param {string} text the raw text
 * @return {object} an object which, when printed, prints the raw html text
 */
function html(text) {
  var rawObj = object(_raw_prototype);
  rawObj._text = Array.prototype.map.call(arguments, String).join('');
  return rawObj;
}

/**
 * <p><b>The raw() function is deprecated.  Now use <a href="#html">the
 * html() function</a> instead.  (It does the same thing).</b></p>
 *
 * @function
 */
function raw(text) { return html.apply(this, arguments); }

/**
 * This function is used by print(...) to convert a string or object
 * into nice-looking printable HTML.  It may be useful in conjunction
 * with raw(...) if you wish to work directly with HTML.
 *
 * <p>You can control how toHTML(...) (and therefore print(...)) behave on an object
 * by giving that object a .toHTML() function.
 *
 * @param {*} x any javascript variable
 * @return {string} html-formatted string
 */
function toHTML(x) {
  if (typeof(x) == 'undefined') {
    return 'undefined';
  }
  if (x === null) {
    return 'null';
  }
  if (typeof x == "string") {
    return _stringToHTML(x);
  }
  if (typeof(x.toHTML) == "function") {
    return x.toHTML();
  }
  if (typeof(x) == "xml") {
    return _stringToHTML(x.toSource());
  }
  if (x instanceof Array) {
    return _arrayToHTML(x);
  }
  if (x instanceof Date) {
    var pieces = x.toString().split(" ");
    return pieces.slice(0, 5).join(' ') + ' ' + pieces[6];
  }
  if (typeof(x) == "object") {
    return _coerceObjectToHTML(x);
  }
  // TODO: add more types to auto-printing, such as functions,
  // numbers, what else?
  return _stringToHTML(""+x);
}

/**
 * Helper function for printing a link (A HREF tag).
 *
 * @example
print(link("http://appjet.com"));
 *
 * @param {string} url an absolute or relative URL to link to
 * @param {string} [optionalText] the text of the link, defaults to the url if absent
 */

function link(url, optionalText) {
  if (optionalText === undefined) optionalText = url;
  return A({href:url}, optionalText);
}

/**
 * Helper fuction for printing a form.
 *
 * @example
if (request.path == "/bar") {
  printp("Your name is: ", request.param("name"));
  printp(link("/", "back"));
} else {
  printp("Enter your name:");
  print(form("/bar", "name"));
}
 * @param {string} url an absolute or relative URL to post the form data to
 * @param {string} param1 the first form parameter name
 * @param {string} param2 the second form parameter name
 * @param {string} etc ...
 */
function form(path, param1, param2, etc) {
  var f = FORM({method: "post", action: path});
  var args = Array.prototype.slice.call(arguments, 1)
  args.forEach(function(param) {
    if (args.length > 1) {
      f.push(P(param, ": ", INPUT({name: param})));
    } else {
      f.push(INPUT({type: "text", name: param}));
    }
  });
  f.push(INPUT({type: "submit", name: "Submit", value: "Submit"}));
  return f;
}

/**
 * Helper function for printing an image (an IMG tag).
 *
 * @example
print(image("http://i29.tinypic.com/vfwc60.gif"));
 *
 * @param {string} url an absolute or relative URL to an image.
 */
function image(url) {
  return IMG({src:url});
}
