
/**
 *  @fileOverview Helpers for reading data from the HTTP request.
 */

/** @ignore */
var _ajn = appjet._native;

/**
 * Note: you can call print(request) to see a nice display for debugging.
 *
 * @type object
 */
var request = {};

/**
 * The request path following the hostname.  For example, if the user
 * is visiting yourapp.appjet.net/foo, then this will be set to
 * "/foo".
 *
 * This does not include CGI parameters or the domain name, and always
 * begins with a "/".
 *
 * @type string
 */
request.path = _ajn.request_path();

/**
 * The value request query string.
 *
 * For example, if the user visits "yourapp.appjet.net/foo?id=20", then
 * request.query will be "id=20".
 *
 * @type string
 */
request.query = _ajn.request_query();

/**
 * Either "GET" or "POST" (uppercase).
 * @type string
 */
request.method = _ajn.request_method().toUpperCase();

/**
 * Whether the curent HTTP request is a GET request.
 * @type boolean
 */
request.isGet = (request.method == "GET");

/** @ignore COMPAT */
request.isGET = request.isGet;

/**
 * Whether the current HTTP request is a POST request.
 * @type boolean
 */
request.isPost = (request.method == "POST");

/** @ignore COMPAT */
request.isPOST = request.isPost;

/** 
 * Whether the current HTTP request is a CRON request.
 * @type boolean
 */
request.isCron = (request.method == "CRON");

/**
 * Holds the IP address of the user making the request.
 * @type string
 */
request.clientAddr = _ajn.request_remoteAddr();

/** @ignore COMPAT */
request.param = function (paramName) {
  return request.params[paramName];
};

/**
 * Parameters associated with the request, either from the query string
 * or from the contents of a POST, e.g. from a form.  Parameters are accessible
 * by name as properties of this object.  The property value is either a
 * string (typically) or an array of strings (if the parameter occurs
 * multiple times in the request).
 *
 * @type object
 */
request.params = {};

/** @ignore */
(function () {
  var paramNameArray = _ajn.request_paramNames();
  if (!paramNameArray) { return; }
  paramNameArray.forEach(function (paramName) {
    var val = _arrayToStringOrArray(_ajn.request_param(paramName));
    if (val != undefined) {
      _addIfNotPresent(request.params, paramName, val);
    }
  });
 })();


/**
 * Used to access the HTTP headers of the current request.  Properties are
 * header names, and each value is either a string (typically) or an
 * array of strings (if the header occurs multiple times in the request).
 *
 * @example
print(request.headers["User-Agent"]);
 *
 * @type object
 */
request.headers = {};

/** @ignore */
(function () {
  var headerNameArray = _ajn.request_headerNames();
  if (!headerNameArray) { return; }
  headerNameArray.forEach(function (headerName) {
    var val = _arrayToStringOrArray(_ajn.request_header(headerName));
    if (val != undefined) {
      _addIfNotPresent(request.headers, _headerCapitalize(headerName), val);
    }
  });
 })();

/** @ignore COMPAT */
request.getHeader = function(headerName) {
  return request.headers[headerName];
}

function _headerCapitalize(str) {
  function initialCapitalize(str) {
    if (str.length < 1) return str;
    return str.substring(0,1).toUpperCase()+str.substring(1).toLowerCase();
  }
  return str.split("-").map(initialCapitalize).join("-");
}

/**
 * Contains a map of name:value of all the cookies sent with the
 * request.  All values are strings.
 *
 * @example
if (request.cookies['SessionID'] == "25") {
  // process session number 25
}
 *
 * @type object
 */
request.cookies = {};

/** @ignore */
(function () {
  var cookieHeaderArray = _ajn.request_header('Cookie');
  if (!cookieHeaderArray) { return; }
  var name, val;
  cookieHeaderArray.forEach(function (cookieHeader) {
    cookieHeader.split(';').forEach(function(cs) {
      var parts = cs.split('=');
      if (parts.length == 2) {
	name = trim(parts[0]);
	val = trim(unescape(parts[1]));
	_addIfNotPresent(request.cookies, name, val);
      }
    });
  });
 })();

function _addIfNotPresent(obj, key, value) {
  if (!(key in obj)) obj[key] = value;
}

function _arrayToStringOrArray(value) {
  if (value == undefined || !(value instanceof Array)) return undefined;
  if (value.length < 1) return undefined;
  if (value.length == 1) return value[0];
  return value;
}

/**
 * Enables pretty-printing of request object for debugging.
 *
 * @return {string} html-formatted string.
 */
request.toHTML = function() {
  function paramlist() {
    var ul = UL();
    for(p in request.params) {
      ul.push(LI(I(p), ": ", request.params[p]));
    }
    return ul;
  }
  function cookielist() {
    var ul = UL();
    eachProperty(request.cookies, function(n, v) {
      ul.push(LI(I(n), ": ", v.toString()));
    });
    return ul;
  }
  var t = TABLE({border: 1, cellspacing: 0, cellpadding: 2});
  var fields = [
    ['method', this.method],
    ['path', this.path],
    ['query', this.query],
    ['clientAddr', this.clientAddr],
    ['params', paramlist()],
    ['cookies', cookielist()]
  ];
  fields.forEach(function(f) {
    var v = f[1] !== undefined ? f[1] : '';
    t.push(TR(TD(f[0]), TD(v)));
  });
  return t.toHTML();
};

