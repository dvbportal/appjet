/**
 * @fileOverview Helpers for the HTTP response.
 */

/** @ignore */
var _ajn = appjet._native;

/**
 * @type object
 */
var response = {};

/**
 * Halts the program immediately and returns 403 Forbidden error to the user.
 */
response.forbid = function() {
  _ajn.response_error(403, "Forbidden");
};

/**
 * Halts the program immediately, optionally printing the page so far.
 *
 * @param {boolean} renderCurrentPage if false, an empty page will be rendered,
 *   otherwise calls to print() so far will be displayed.  Either way, no more
 *   code will be executed.
 */
response.stop = function(renderCurrentPage) {
  if (renderCurrentPage !== false) {
    var p = page.render();
    if (p.length > 0)
      _ajn.write(p.join(''));
  }
  _ajn.response_stop();
};

/**
 * Halts the program immediately and returns a 404 not found error to the user.
 */
response.notFound = function() {
  _ajn.response_error(404, "Not found");
};

/**
 * Halts the program immediately and sends an HTTP redirect response (302),
 * redirecting to the given path (relative or absolute).
 *
 * @param {string} path The new path
 */
response.redirect = function(path) {
  if ((! path) && path != "")
    throw new Error("Invalid redirect: "+path)
  _ajn.response_redirect(path);
};

/**
 * Sets the status code in the HTTP response.
 *
 * @param {number} newCode
 */
response.setStatusCode = function(newCode) {
  _ajn.response_setStatusCode(newCode);
};

/**
 * Sets any header of the HTTP response.
 *
 * @example
response.setHeader('Cache-Control', 'no-cache');
 *
 * @param {string} name
 * @param {string} value
 */
response.setHeader = function(name, value) {
  _ajn.response_setHeader(name, value);
};

/**
 * Adds the name,value pair to the headers.  Useful for headers that are
 * allowed to repeat, such as Set-Cookie.
 *
 * @param {string} name
 * @param {string} value
 */
response.addHeader = function(name, value) {
  _ajn.response_addHeader(name, value);
};

/**
 * Low-level hook for writing raw data to the response.
 * @param {string} data will be written, verbatim, to the HTTP resonse.
 */
response.write = function(data) {
  _ajn.write(data);
};

/**
 * Low-level hook for writing raw byte data to the response. Especially
 * useful for writing the result of a <code>wget</code> of image data,
 * or writing an uploaded file.
 * @param {string} data will be written, verbatim, to the HTTP resonse.
 */
response.writeBytes = function(data) {
  _ajn.writeBytes(data);
};

//----------------------------------------------------------------
// Cookies!
//----------------------------------------------------------------

/**
 * Set a cookie in the response.
 *
 * @example
response.setCookie({
  name: "SessionID",
  value: "25",
  secure: true,
  expires: 14 // 14 days
});
 *
 * @param {object} cookieObject This may contain any of the following:
<ul>
  <li>name (required): The name of the cookie</li>
  <li>value (required): The value of the cookie.  (Note: this value will be escaped).
  <li>expires (optional): If an integer, means number of days until it expires;
        if a Date object, means exact date on which to expire.</li>
  <li>domain (optional): The cookie domain</li>
  <li>path (optional): To restrict the cookie to a specific path.</li>
  <li>secure (optional): Whether this cookie should only be sent securely.</li>
</ul>
 */
response.setCookie = function(cookieObject) {
  response.addHeader('Set-Cookie', _cookiestring(cookieObject));
};


/**
 * Tells the client to delete the cookie of the given name (by setting
 * its expiration time to zero).
 * @param {string} name The name of the cookie to delete.
 */
response.deleteCookie = function(name) {
  response.setCookie({name: name, value: '', expires: 0});
};

/**
 * Sets the Content-Type header of the response.  If the content-type includes
 * a charset, that charset is used to send the response.
 * @param {string} contentType the new content-type
 */
response.setContentType = function(contentType) {
  _ajn.response_setContentType(contentType);
}

/** @ignore */
function _cookiestring(c) {
  var x = '';
  if (!c.name) { throw new Error('cookie name is required'); }
  if (!c.value) { c.value = ''; }
  x += (c.name + '=' + escape(c.value));

  // expires
  if (c.expires instanceof Date) {
    x += ('; expires='+_cookiedate(c.expires));
  }
  if (typeof(c.expires) == 'number') {
    var today = (new Date()).valueOf();
    var d = new Date(today + 86400000*c.expires);
    x += ('; expires='+_cookiedate(d));
  }

  // domain
  if (c.domain) { x += ('; domain='+c.domain); }

  // path
  if (c.path) { x += ('; path='+c.path); }

  // secure
  if (c.secure == true) { x += '; secure'; }

  return x;
}

/** @ignore */
function _cookiedate(d) {
  var x = d.toGMTString();
  var p = x.split(' ');
  return [p[0], [p[1], p[2], p[3]].join('-'), p[4], p[5]].join(' ');
}

/**
 * Tells the client to cache the page. By default, clients are told to
 * not never cache pages. (To send no caching-related headers at all, pass
 * <code>undefined</code>.)
 * @param {boolean} cacheable
 */
response.setCacheable = function(cacheable) {
  appjet._internal.cacheable = cacheable;
}

/** @ignore */
appjet._internal.cacheable = false;
