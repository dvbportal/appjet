/**
 * @fileOverview 
 * Helper functions for path-based dispatching of the request.
 */

/**
 * Converts the path into a function name and calls that function.  The function
 * name is by replacing '/' characters in the path with underscores, and prepending
 * the request method (get or post).  For requests that end in '/', you can
 * optionally suffix your function name with 'main'.
 *
 * @example
function get_main() {
  // called with user visits http://appname.appjet.net/
  print("hello");
}
function get_page() {
  // called with user visits http://appname.appjet.net/page
}
function post_foo() {
  // called when user POSTs to http://appname.appjet.net/foo
}
dispatch(); // examines request and calls one of the above functions.
 *
 * @param {object} [opts] (optional) if opts.custom404 is a function, then this function will be
 *   called if there is no function corresponding to the request path.  If opts is
 *   is not specified, a default 404 handler displays "404 not found".
 */
function dispatch(opts) {
  var custom404 = null;
  if (opts && opts.custom404) {
    custom404 = opts.custom404;
  }
  var fname = request.method.toLowerCase() + request.path.replace(/\//g, '_');
  var f = appjet._internal.global[fname];
  if (typeof(f) == 'function') {
    f();
    return;
  }
  if (fname.charAt(fname.length - 1) == '_') {
    f = appjet._internal.global[fname + 'main'];
    if (typeof(f) == 'function') {
      f();
      return;
    }
  }
  _404(custom404);
}

function _404(custom404) {
  response.setStatusCode(404);
  if (custom404) {
    custom404();
  } else {
    _default404();
  }
}

function _default404() {
  print(raw(sprintf('<div style="font-size: 200%%;">404 Path not found: %s</div>',
		    request.path)));
  print(P("Request is:"));
  print(request);
}

/**
 * Similar to dispatch(), but you provide your own mapping of regular expresions
 * to functions.
 *
 * @example
function handleIndex() {
  print("this is the main landing page");
}
function handleFoo() {
  print("this is the foo page");
}
function unknown() {
  response.setStatusCode(404);
  print("path not found: ", request.path);
}
patternDispatch(
  [/^\/$/, handleIndex],
  [/^\/foo$/, handleFoo],
  unknown
);
 *
 * @param {array} pattern1 array of [regexp, method]
 * @param {array} pattern2 array of [regexp, method]
 * @param {array} patternN ...
 * @param {function} [optional404] called if none of the previous patterns match
 */
function patternDispatch(pattern1, pattern2, patternN, optional404) {
  var pathfound = false;
  function match(pattern, f) {
    if ((typeof(pattern) == 'string') && (pattern == request.path)) {
      f();
      return true;
    }
    if (pattern instanceof RegExp) {
      var result = pattern.exec(request.path);
      if (result && result.length > 0) {
	f.apply(this, result.slice(1));
	return true;
      }
    }
    return false;
  }
  for (var i = 0; i < arguments.length; i++) {
    if (i == arguments.length - 1 && ! (arguments[i] instanceof Array)) // ok if last arg isn't an array
      continue;
    var pattern = arguments[i][0];
    var f = arguments[i][1];
    if (match(pattern, f)) {
      pathfound = true;
    }
  }
  if (!pathfound) {
    var lastArg = arguments[arguments.length-1];
    if (typeof(lastArg) == 'function')
      _404(lastArg);
    else
      _404();
  }
}
