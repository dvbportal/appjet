/**
 * @fileOverview A collection of miscellaneous utilities.
 */

if (!appjet) {
  throw new Error('appjet library is required for util library.');
}

/**
 * Returns a string version of the MD5 signature of x.
 *
 * @example print(md5("appjet")); // prints "9b458805f67473b49761c13e48c5de35"
 *
 * @param {String} x a string
 * @return {String} the md5 hash of x
 */
function md5(x) {
  return appjet._native.md5(x);
}

/**
 * Iterator convenience for JavaScript Objects.
 *
 * Note that if func returns false, the iteration will be immediately terminated.
 * (Returning undefined, or not specifying a return type, does not terminate the iteration).
 *
 * @example
var pastels = {
  red: "#fcc",
  green: "#cfc",
  blue: "#ccf"
};
eachProperty(pastels, function(key, value) {
  print(DIV({style: 'background: '+value+';'}, key));
});
 *
 * @param {object} obj The object over which to iterate.
 * @param {function} func The function to run on each [key,value] pair.
 */
function eachProperty(obj, func) {
  var r;
  for (k in obj) {
    if (obj.hasOwnProperty(k)) {
      r = func(k,obj[k]);
      if (r === false) {
	break;
      }
    }
  }
}

/**
 * Douglas Crockford's "object" function for prototypal inheritance, taken from
 * http://javascript.crockford.com/prototypal.html
 *
 * @param {object} parent The parent object.
 * @return {object} A new object whose prototype is parent.
 */
function object(parent) {
  function f() {};
  f.prototype = parent;
  return new f();
}

/**
 * Creates an array of the properties of <code>obj</code>,
 * <em>not</em> including built-in or inherited properties.  If no
 * argument is given, applies to the global object.
 *
 * @example
// Prints "abc"
keys({a: 1, b: 2, c: 3}).forEach(function(k) {
  print(k);
}
 *
 * @example
// Prints all the functions and object members of the global "appjet" object,
// one per line.
print(keys(appjet).join('\n'));
 *
 * @param {object} obj
 */
function keys(obj) {
  var array = [];
  var o = obj;
  if (o == undefined) {
    o = this;
  }
  for(var k in o) {
    if (o.hasOwnProperty(k)) {
      array.push(k);
    }
  }
  return array;
}

/**
 * Comparator that returns -1, +1, or 0 depending on whether a &lt; b, or a &gt; b, or
 * neither, respectively.
 * @param {object} a
 * @param {object} b
 * @return {number} -1, 0, or +1
 */
function cmp(a,b) {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
}

/**
 * Removes leading and trailing whitespace from a string.
 * @param {string} str
 * @return {string} The trimmed string.
 */
function trim(str) {
  return str.replace(/^\s+|\s+$/g, "");
}

//----------------------------------------------------------------
// string set
//----------------------------------------------------------------

// TODO: unit-test the string set, or just switch it over to
// java.util.HashSet or something.

/**
 * Constructor for an object that holds a set of strings, with basic
 * set operations.  This is better for keeping track of a set than
 * using an associative arrays, because it avoids key collisions with
 * javascript built-ins like 'toString', 'class', etc.
 *
 * @constructor
 * @param {string} initialString1
 * @param {string} initialString2
 * @param {string} etc ...
 *
 */
StringSet = function(initialElement1, initialElement2, etc) {
  this._obj = {};
  for (var i = 0; i < arguments.length; i++) {
    if (typeof(arguments[i]) != 'string') {
      throw new Error('StringSet constructor must take only string arguments.');
    } else {
      this._obj['$$'+arguments[i]] = true;
    }
  }
};

/** @ignore */
StringSet.prototype.key = function(x) {
  return '$$'+x;
}

/**
 * Returns whether this set contains the given string.
 *
 * @param {string} x
 * @return {boolean} Whether x exits in this set.
 */
StringSet.prototype.contains = function(x) {
  return (this._obj.hasOwnProperty(this.key(x)) &&
	  this._obj[this.key(x)] === true);
};

/**
 * Adds the given string to the set if it is not already in it.
 * @param {string} x
 */
StringSet.prototype.add = function(x) {
  this._obj[this.key(x)] = true;
};

/**
 * Removes the given string from the set if it is contained in it.
 * @param {string} x The string to remove from the set.
 */
StringSet.prototype.remove = function(x) {
  if (this._obj[this.key(x)]) {
    delete this._obj[this.key(x)];
  }
};

/**
 * Iterators over the strings in the set, calling the provided
 * function on each element.
 * @param {function} f The function to call on each string in the
 * set.
 */
StringSet.prototype.forEach = function(f) {
  var self = this;
  eachProperty(this._obj, function(name) {
    var realName = name.substring(2);
    if (self.contains(realName)) f(realName);
  });
}

//----------------------------------------------------------------
// wget/wpost
//----------------------------------------------------------------

/**
 * The error thrown by wget and wpost if there's a problem retrieveing the requested URL.
 *
 * @constructor
 * @param {string} message A status message describing why the action failed.
 * @param {HttpResponse} info Additional info, including headers and received data, if any.
 */
function HttpRequestError(message, info) {
  this.message = message;
  this.info = info;
  this.name = "HttpRequestError";
}
HttpRequestError.prototype = new Error();

/**
 * @class Description of an object containing the properties of the HTTP response returned by <code>wget</code> and <code>wpost</code>
 *
 * @name HttpResponse
 */

/**
 * The status code of the server's response, or an internal status code if connecting to the server failed.
 * @name status
 * @type number
 * @memberOf HttpResponse
 */
/**
 * An explanation of the status code if it is an internal code (that is, less than 0)
 * @name statusInfo
 * @type string
 * @memberOf HttpResponse
 */
/**
 * The data returned by the server, if any.
 * @name data
 * @type string
 * @memberOf HttpResponse
 */
/**
 * The content type returned by the server, if any.
 * @name contentType
 * @type string
 * @memberOf HttpResponse
 */
/**
 * An object containing property names and values corresponding to the headers returned by the server.
 * @name headers
 * @type object
 * @memberOf HttpResponse
 */

function _paramObjectToParamArray(params, enc) {
  var pa = [];
  eachProperty(params, function(k, v) {
    pa.push(enc ? encodeURIComponent(k.toString()) : k.toString());
    pa.push(enc ? encodeURIComponent(v.toString()) : v.toString());
  });
  return pa;
}


/**
 * Fetches the text of a URL and returns it as a string.
 *
 * @example
g = wget("google.com");
page.setMode("plain");
print(raw(g));
 *
 * @param {string} url The name of the url to retreive. If the
 * transport is not specified, HTTP is assumed.
 * @param {object} [params] Optional parameters to include with the
 * GET, as a dictionary of {name: value} entries.
 * @param {object} [options] Optional object with three optional
 * properties:<ul>
 * <li><strong>headers:</strong> HTTP request headers to send
 * with the GET, as a dictionary of {name: value} entries.</li>
 * <li><strong>followRedirects:</strong> A boolean indicating
 * whether to follow redirect headers returned by the server.
 * Defaults to <code>true</code>.</li>
 * <li><strong>complete:</strong> If <code>true</code>, wget returns
 * an object containing all information about the response, not just
 * its contents.  Otherwise, wget throws a HttpRequestError if it
 * encounters an error GETing.
 * </ul>
 * @return {string} The full text of the url's content.
 * @return {HttpResponse} The "complete" response, returned if the "complete" parameter is <code>true</code>.
 */
function wget(url, params, options) {
  if (!url.match(/^\w+\:\/\//)) {
    url = "http://" + url;
  }
  var pa = _paramObjectToParamArray(params, false);
  var ha = _paramObjectToParamArray(options ? options.headers : undefined, false);
  var followRedir = (options === true ? true : (options && options.followRedirects === false ? false : true));
  var ret = appjet._native.simplehttpclient_get(url, pa, ha, followRedir);
  if ((options === true) || (options && options.complete))
    return ret;
  if (ret.status >= 200 && ret.status < 300) {
    return ret.data;
  } else {
    throw new HttpRequestError(ret.statusInfo || ret.status, ret);
  }
}

/**
 * Simple way to POST data to a URL and get back the response.  Values of params will
 * automatically be escaped.
 *
 * @example
result = wpost("example.com", {id: 25, value: "here is the post value"});
 *
 * @param {string} url The url to POST to.
 * @param {object} [params] Optional parameters to include with the
 * POST, as a dictionary of {name: value} entries.
 * @param {object} [options] Optional object with three optional
 * properties:<ul>
 * <li><strong>headers:</strong> HTTP request headers to send
 * with the POST, as a dictionary of {name: value} entries.</li>
 * <li><strong>followRedirects:</strong> A boolean indicating
 * whether to follow redirect headers returned by the server.</li>
 * <li><strong>complete:</strong> If <code>true</code>, wpost returns
 * an object containing all information about the response, not just
 * its contents.  Otherwise, wpost throws a HttpRequestError if it
 * encounters an error POSTing.
 * </ul>
 * @return {string} The full text returned from the server POSTed to.
 * @return {HttpResponse} The complete response, returned if the "complete" parameter is <code>true</code>.
 */
function wpost(url, params, options) {
  if (!url.match(/^\w+\:\/\//)) {
    url = "http://" + url;
  }
  var pa = _paramObjectToParamArray(params, true);
  var ha = _paramObjectToParamArray(options ? options.headers : undefined, false);
  var followRedir = (options === true ? true : (options && options.followRedirects === false ? false : true));
  var ret = appjet._native.simplehttpclient_post(url, pa, ha, followRedir);
  if ((options === true) || (options && options.complete))
    return ret;
  if (ret.status >= 200 && ret.status < 300) {
    return ret.data;
  } else {
    throw new HttpRequestError(ret.statusInfo || ret.status, ret);
  }
}

/**
 * Simple way to send an email to a single recipient. Emails will have a
 * "from" address of <code>noreply@{appjet.appName}.{appjet.mainDomain}</code>.
 *
 * Sending is limited to 100 emails per developer account per day.  However,
 * emails sent to the address on file for the app's owner are not counted
 * toward this limit.
 *
 * @example
result = sendEmail("noone@example.com", "Test Subject",
                   "Greetings!", {"Reply-To": "sender@example.com"});
 *
 * @param {string} toAddress The one email address to send a message to.
 * @param {string} subject The message subject.
 * @param {string} body The message body.
 * @param {object} [headers] Optional headers to include in the
 * message, as a dictionary of {name: value} entries.
 */
function sendEmail(toAddress, subject, body, headers) {
  var pa = _paramObjectToParamArray(headers, false);
  var ret = appjet._native.email_sendEmail(toAddress, subject, body, pa);
  if (ret != "")
    throw new Error(ret);
}

