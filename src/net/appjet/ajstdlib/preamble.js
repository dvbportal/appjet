var _tstart = (new Date()).valueOf();

/*
 * @overview
 *
 * AppJet standard library preamble.
 *
 * This is run at the beginning of every request, right after all
 * native calls are loaded into _appjetnative_.  This file is run
 * in the same scope as the app, the global scope, which is also
 * accessible from all modules.
 */

//----------------------------------------------------------------
// delete pesky rhino built-in string stuff
//----------------------------------------------------------------
(function() {
  // rhino strings come with a bunch of random "html helpers"
  // that we don't want
  var htmlStuff = ["bold", "italics", "fixed", "strike",
    "small", "big", "sub", "fontsize", "fontcolor", "link",
    "anchor", "sup", "blink"];
  for(var i in htmlStuff) {
    delete String.prototype[htmlStuff[i]];
  }
})();

//----------------------------------------------------------------
// the import function
//----------------------------------------------------------------
/**
 * You may pass multiple strings to this function to import modules of
 * those names.
 *
 * If the first argument is an object, it will import the modules into
 * that object's properties instead of the global object.
 *
 * Example: var html = {}; import(html, "html"); html.print("foo");
 *      vs. import("html"); print("foo");
 *
 * @function
 * @param String moduleName
 */
function import(optionalScope, moduleName1, moduleName2, etc) {
  // will be set later
}

/**
 * Used only by appjet internal libraries.
 */
function importLocal(scope, moduleName) {
  // will be set later
}

//----------------------------------------------------------------
// the rest of this file happens inside a private function scope
//----------------------------------------------------------------
(function(globalScope) {
  
  //----------------------------------------------------------------
  // a little bootstrappin to get this party started
  //----------------------------------------------------------------
  /** @ignore */
  function copyScope(src, dst) {
    for (k in src) {
      if (src.hasOwnProperty(k) && (k.length > 0) && (k.charAt(0) != '_')) {
	if (!(src.__dontexport__ && src.__dontexport__[k])) {
	  dst[k] = src[k];
	}
      }
    }
  }
  /** @ignore */  
  function importGlobal(m) {
    var ss = _appjetnative_.runLibrary('global/'+m);
    copyScope(ss, globalScope);
  }
  // global libraries
  ['appjet',
   'utilities',
   'tags',
   'page',
   'printing',
   'request',
   'response',
   'dispatching'].forEach(function(m) { importGlobal(m); });

  //----------------------------------------------------------------
  // the "import" function
  //----------------------------------------------------------------
  //var internalError = _appjetnative_.internalError;
  //var apiError = _appjetnative_.apiError;
  function internalError(m) {
    throw new Error("Internal Error: "+m);
  }
  function apiError(m) {
    throw new Error("AppJet API Error: "+m);
  }

  // Module import cache... hidden from other scopes.
  // TODO: turn this into Map and Set data structures that we provide?
  var moduleObjects = {};
  var modulesBeingLoaded = {};
  
  // importing a single module
  /** @ignore */
  function importModule(dst, moduleName, isApp) {
    var subscope;
    if (modulesBeingLoaded[moduleName]) {
      // already loading this module
      internalError("Cyclic module dependency: "+moduleName);
    }
    if (moduleObjects[moduleName]) {
      subscope = moduleObjects[moduleName];
    } else {
      modulesBeingLoaded[moduleName] = true;
      if (isApp)
	subscope = appjet._native.importApp(moduleName);
      else 
	subscope = appjet._native.runLibrary('lib/'+moduleName);
      if (!subscope) {
	apiError("No such module: "+moduleName);
      }
      moduleObjects[moduleName] = subscope;  // cache
      delete modulesBeingLoaded[moduleName];
    }
    copyScope(subscope, dst);
  }

  /** @ignore */
  globalScope.import = function(optionalDst, moduleName1, moduleName2, etc) {
    var dst = globalScope;
    var i = 0;
    if (arguments.length < 1) {
      apiError("import() takes the name of at least one module as an argument.");
    }
    if (typeof(arguments[0]) == 'object') {
      dst = arguments[0];
      i++;
    }
    for (; i < arguments.length; i++) {
      var moduleName = arguments[i];
      if (typeof(moduleName) != 'string') {
	apiError("modules should be referred to with string, not "+typeof(moduleName));
      } else {
	importModule(dst, moduleName, moduleName.substr(0, 4) == "lib-");
      }
    }
    if (typeof(arguments[0]) == 'object')
      return dst;
  };

  /** @ignore */
  globalScope.importLocal = function(scope, moduleName1, moduleName2, etc) {
    for (var i = 1; i < arguments.length; i++) {
      var m = arguments[i];
      import(scope, m);
      scope.__dontexport__ = {};
      for (k in moduleObjects[m]) {
	if (moduleObjects[m].hasOwnProperty(k)) {
	  scope.__dontexport__[k] = true;
	}
      }
    }
  }
  
})(this);


//----------------------------------------------------------------
// we put jsdoc for these things so that users realize they are in the
// global scope.
//
// TODO: we should really link them to their jsdoc pages.
//----------------------------------------------------------------

/**
 * the global request object for interacting with the HTTP request.
 *
 * @type request
 */
request = request;

/**
 * the global response object for customizing the HTTP response.
 *
 * @type response
 */
response = response;
response.setContentType('text/html; charset=UTF-8');

/**
 * the global "appjet" object for various appjet-related utility.
 *
 * @type appjet
 */
appjet = appjet;

/**
 * the global "page" object for manipulating how the page will be
 * displayed.
 *
 * @type page
 */
page = page;

