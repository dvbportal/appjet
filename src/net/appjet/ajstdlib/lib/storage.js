/** @fileOverview An easy-to-use database for persisting objects between requests.<br />
 * <p>Importing the "storage" module gives you access to a root
 * <code>storage</code> object. Any property you assign to this object
 * in one request will be avialable in any subsequent requests.
 * <p>The typical way to define a top-level property of
 * <code>storage</code> is to check if it's defined and &ndash; if not
 * &ndash; set it to some default value, as in the example below.</p>
 * <p>Performance Note: storage can be quite fast, depending on how it's used, but performance
 * tuning is beyond the scope of this reference.  We suggest that for starters
 * you just do whatever is simplest for your app, and for help performance-tuning,
 * ask for help in <a href="http:/forum.appjet.com/">The AppJet Forums</a>.</p>
 * @example
import("storage");

if (! storage.counter) {
    storage.counter = 0;
}
storage.counter++;

printp("Hits to this page: ", storage.counter);
 */

var _a = _appjetnative_;

function _objectToArray(obj) {
  var arr = [];
  eachProperty(obj,
    function(k,v) {
      arr.push(k, (v instanceof Array ? v : [v]).map(function(poss) {
        var sh = _coerceToHolder(poss);
        if (! sh)
	  throw new Error("Invalid property type on matching object: "+v);
        return sh; 
      }));
    });
  return arr;
}

function _Storage() {
  this.create = function(id) {
    var ret = _a.storage_create(id);
    if (ret.status != 0)
      throw new Error(ret.message);
    return _getObjectForId(ret.value);
  };
  this.get = function(id, key) {
    var ret = _a.storage_get(id, key);
    if (ret.status == 0 || ret.status == -2) {
      switch (ret.type) {
      case 'object':
	// _print("...got object back: "+ret.value);
	return _getObjectForId(ret.value);
      case 'date':
	return new Date(ret.value);
      default:
	return ret.value;
      }
    } else {
      throw new Error(ret.message);
    }
  };
  this.getIds = function(id) {
    var ret = _a.storage_getIds(id);
    if (ret.status != 0) {
      throw new Error(ret.message);
    }
    return ret.value;
  };
  this.getById = function(id) {
    var ret = _a.storage_getById(id);
    if (ret.status != 0)
      throw new Error(ret.message);
    return _proxy(ret.value); // better be a new object!
  };
  this.put = function(id, key, tv) {
    var ret = _a.storage_put(id, key, tv.type, tv.value);
    if (ret.status != 0)
      throw new Error(ret.message);
  };
  this.erase = function(id, key) {
    var ret = _a.storage_delete(id, key);
    if (ret.status != 0)
      throw new Error(ret.message);
  };
}

function _Collections() {
  this.create = function(id) {
    var ret = _a.storage_coll_create(id);
    if (ret.status != 0)
      throw new Error(ret.message);
    return _getObjectForId(ret.value);
  };
  this.add = function(id, obj) {
    var ret = _a.storage_coll_add(id, obj.id);
    if (ret.status != 0)
      throw new Error(ret.message);
  };
  this.remove = function(id, obj) {
    var ret;
    if ((obj instanceof StorableObject) || (obj instanceof _Iterable)) {
      ret = _a.storage_coll_remove(id, obj.id);
    } else {
      ret = _a.storage_coll_remove(id, _objectToArray(obj));
    }
    if (ret.status != 0)
      throw new Error(ret.message);
  };
  this.iterator = function(id, newId) {
    var ret = _a.storage_coll_iterator(id, newId);
    if (ret.status != 0)
      throw new Error(ret.message);
    return _getObjectForId(newId);
  };
}

function _Iterators() {
  this.next = function(id) {
    var ret = _a.storage_itr_next(id);
    if (ret.status != 0) {
      if (ret.status == -2) // empty iterator!
	return undefined;
      throw new Error(ret.message);
    }
    return _getObjectForId(ret.value);
  };
  this.hasNext = function(id) {
    var ret = _a.storage_itr_hasNext(id);
    if (ret.status != 0)
      throw new Error(ret.message);
    return ret.value;
  };
  this.filter = function(id, newId, match) {
    var ret = _a.storage_itr_filter(id, newId, _objectToArray(match));
    if (ret.status != 0)
      throw new Error(ret.message);
    return _getObjectForId(newId);
  };
  this.skip = function(id, newId, n) {
    var ret = _a.storage_itr_skip(id, newId, n);
    if (ret.status != 0)
      throw new Error(ret.message);
    return _getObjectForId(newId);
  };
  this.limit = function(id, newId, n) {
    var ret = _a.storage_itr_limit(id, newId, n);
    if (ret.status != 0)
      throw new Error(ret.message);
    return _getObjectForId(newId);
  };
  this.sort = function(id, newId, f) {
    var comparator;
    if (typeof(f) == 'function')
      comparator = function(id1, id2) {
	return f(_getObjectForId(id1), _getObjectForId(id2));
      };
    var ret = _a.storage_itr_sort(id, newId, comparator);
    if (ret.status != 0)
      throw new Error(ret.message);
    return _getObjectForId(newId);
  };
  this.sortBy = function(id, newId, propertyNames) {
    var ret = _a.storage_itr_sort(id, newId, propertyNames);
    if (ret.status != 0)
      throw new Error(ret.message);
    return _getObjectForId(newId);
  };
  this.reverse = function(id, newId) {
    var ret = _a.storage_itr_reverse(id, newId);
    if (ret.status != 0)
      throw new Error(ret.message);
    return _getObjectForId(ret.value);
  };
  this.first = function(id) {
    var ret = _a.storage_itr_first(id);
    if (ret.status != 0) {
      if (ret.status == -2)
	return undefined;
      throw new Error(ret.message);
    }
    return _getObjectForId(ret.value);
  };
  this.size = function(id) {
    var ret = _a.storage_itr_size(id);
    if (ret.status != 0)
      throw new Error(ret.message);
    return ret.value;
  };
  this.name = function(id) {
    var ret = _a.storage_viewName(id);
    if (ret.status != 0)
      throw new Error(ret.message);
    return ret.value;
  }
}

var _s = new _Storage();
var _c = new _Collections();
var _i = new _Iterators();
// var debugstorage = _s;

_radixChars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
_radix = _radixChars.length;

function _longToString(n) {
  if (n < _radix) return _radixChars[n];
  else return _longToString(Math.floor(n/_radix)) + _radixChars[n%_radix];
}

function _newUniqueId(prefix) {
  return prefix + _longToString(appjet._native.storage_time()) +  _longToString(Math.floor(Math.random()*_radix*_radix));
}

function _proxy(id) {
  if (id.slice(0, 5) == "coll-") {
    return _a.createProxyObject(_coll_getHandler(id), _coll_setHandler(id), _coll_deleteHandler(id),
				_coll_getIdsHandler(id), StorableCollection.prototype);
  } else if (id.slice(0, 4) == "obj-") {
    return _a.createProxyObject(_getHandler(id), _setHandler(id), _deleteHandler(id),
				_getIdsHandler(id), StorableObject.prototype);
  } else if (id.slice(0, 4) == "itr-") {
    return _a.createProxyObject(_itr_getHandler(id), _itr_setHandler(id), _itr_deleteHandler(id),
				_itr_getIdsHandler(id), _Iterable.prototype);
  } else {
    throw new Error("Unknown type for object id");
  }
}

/**
 * Gets a StorableObject or StorableCollection by its id.
 * <p>Each StorableObject or StorableCollection has an id
 * that never changes, and this id can be used
 * to refer to the object in a URL or form parameter.
 * @param {string} id The id of the object to be gotten.
 * @example
import("quickforms");
import("storage");

if (! storage.things) {
    storage.things = new StorableCollection();
    storage.things.add({message: "Hello world!"});
}

if (! request.param("idToDisplay")) {
    var firstId = storage.things.first().id;
    // show a button that creates a request with idToDisplay = firstId
    printp(new QuickButton("Show first thing.", {}, {idToDisplay: firstId}));
}
else {
    // display the "foo" property of whatever object has an id of idToDisplay
    printp(getStorable(request.param("idToDisplay")).message);
}
 * @return {StorableObject} The StorableObject whose id is <code>id</code>,
 * or <code>undefined</code> if no such object exists.
 */
function getStorable(id) {
  if (id)
    return _getObjectForId(id);
}

function _coerceToHolder(obj) {
  if (typeof(obj) == 'function')
    return false;
  if (typeof(obj) != 'object')
    return {type: typeof(obj), value: obj};
  if (obj instanceof String)
    return {type: 'string', value: obj.valueOf()};
  if (obj instanceof Date)
    return {type: 'date', value: obj.getTime()};
  if (obj instanceof Number)
    return {type: 'number', value: obj.valueOf()};
  if (obj instanceof Boolean)
    return {type: 'boolean', value: obj.valueOf()};
  if (obj instanceof StorableObject)
    return {type: 'object', value: obj.id};
  return false;
}

function _coerceToStorableHolder(obj) {
  // _print("Coercing to storableHolder: "+obj);
  var test = _coerceToHolder(obj);
  if (test) {
    // _print("...coerced to plain holder: "+test);
    return test;
  }
  // _print("...failed to coerce to holder, trying object");
  return {type: 'object', value: _coerceToStorableObject(obj).id};
}

function _coerceToStorableObject(obj) {
   // _print("Coercing to storableObject: "+obj);

  if (typeof(obj) != 'object')
    throw new TypeError(""+obj+" could not be made storable!");

  if (obj instanceof StorableObject)
    return obj;

  if (obj instanceof Array)
    throw new TypeError("Can't store an array; use a StorableCollection instead.");

  eachProperty(obj, function(k, v) {
      // _print("...testing each property; now: "+k+", value: "+v);
      if (k == 'id' || k == 'toString' || k == 'hasOwnProperty' || (! _coerceToStorableHolder(v)))
	throw new TypeError("Couldn't make object storable; property "+k+" failed to convert ("+v+")");
    });

  var ret = new StorableObject();
  eachProperty(obj, function(k, v) {
      // bypass the usual setting mechanism, since we have a holder here.
      _setHandler(ret.id)(k, v);
    });

  return ret;
}

// function _print(msg) {
//   var _debug = false;
//   if (_debug)
//     print(msg, BR());
// }

var _idMap = {};
function _getObjectForId(id) {
  if (id == null || id == undefined)
    throw new Error("Bad ID: "+id);
  if (!(id in _idMap)) {
    // _print("...wasn't available, making new");
    var o = _s.getById(id);
    // _print("...o is: "+o.id);
    _idMap[id] = o;
    // _print("...id is in _idMap? "+(id in _idMap));
    var v = _idMap[id];
    // _print("...v is: "+typeof(v));
  }
  // _print("...and returning: "+_idMap[id].id);
  return _idMap[id];
}

function _iteratingToString(obj) {
  var visited = {}; visited[obj.id] = true;
  var helper = function(obj) {
    var s = "S{ ";
    var props = [ "id: "+obj.id ];
    for (var i in obj) {
      if (obj[i] instanceof StorableObject) {
	if (visited[obj[i].id] == true) {
	  props.push(i+": [seen "+obj[i].id+"]");
	} else {
	  visited[obj[i].id] = true;
	  props.push(i+": "+(obj[i] instanceof StorableCollection ? obj[i] : helper(obj[i])));
	}
      } else {
	props.push(i+": "+obj[i]);
      }
    }
    s += props.join(", ") + " }";
    return s;
  };
  return helper(obj);
}

function _getHandler(id) {
  return function(name) {
    // _print("on object id: "+id+", request for property: "+name);
    if (name == "id")
      return id;
    if (name == "toString") {
      return function() { return _iteratingToString(this) };
    }
    if (name == "toHTML") {
      return function() {
	var t = TABLE({border: 1, cellpadding: 2, cellspacing: 0});
	t.push(TR(TD("id"), TD(id)));
	eachProperty(this, function(name, value) {
	  t.push(TR(TD(String(name)), TD(String(value))));
	});
	return toHTML(t);
      };
    }
    if (name == "hasOwnProperty") {
      return function(name) {
	// XXX: This should be in ".has"
	return (_a.storage_get(id, name).status == 0);
      };
    }
    return _s.get(id, name);
  };
}

function _setHandler(id, raw) {
  return function(name, value) {
    if (name == "id")
      throw new Error("Can't set id property.");
    if (name == "toString")
      throw new Error("Can't set toString property.");
    if (name == "hasOwnProperty")
      throw new Error("Can't set hasOwnProperty property.");
    // _print("on object id: "+id+", setting property: "+name+" to "+value);

    _s.put(id, name, (raw ? value : _coerceToStorableHolder(value)));
  };
}

function _deleteHandler(id) {
  return function(name) {
    _s.erase(id, name);
  };
}

function _getIdsHandler(id) {
  return function() {
    return _s.getIds(id);
  };
}


/**
 * <p>A StorableObject is an object that can be persisted between requests.</p>
 * <p>To create a StorableObject, call <code>new StorableObject()</code>.</p>
 * <p>You can optionally pass any JavaScript object to the constructor, and the
 * properties and values of the object will become properties and values
 * of the newly-created StorableObject, as in 
 * <code>new StorableObject({username: "aiba", password: "sex"})</code>.</p>
 * <p>StorableObjects are very similar to normal JavaScript objects, except that
 * StorableObjects can't have properties that are functions.  Properties that
 * are objects must be StorableObjects, and assigning a normal JavaScript object
 * will cause a StorableObject to be created (in other words, <code>storage.foo
 * = {a: 1}</code> behaves like <code>storage.foo = new StorableObject({a: 1})</code>).
 * <p>Once a StorableObject is constructed, it may be persisted in two different 
 * ways: You can assign it as the property of another StorableObject, such as
 * the root StorableObject called <code>storage</code>.  Or you can add it
 * to a <a href="#StorableCollection">StorableCollection</a>.</p>
 * 
 * @constructor
 * 
 * @param {object} [obj] An optional object
 * whose properties will be copied into the returned
 * StorableObject. <code>obj</code> cannot have any functions, and any
 * properties of <code>obj</code>'s prototype are ignored. Any objects
 * that <code>obj</code> references will also be copied. (Note that
 * because properties are <i>copied</i>, any subsequent modifications 
 * to <code>obj</code> will not be reflected in the returned
 * StorableObject).
 * 
 * @example
// Storing a string

var obj = new StorableObject();
obj.message = "Hi there!";
storage.foo = obj;
 * @example
// Alternative code to do the same thing

storage.foo = new StorableObject({message: "Hi there!"});
 * @example
// Adding StorableObjects to a StorableCollection

storage.people = new StorableCollection();

var person1 = new StorableObject({name: "Aaron", age: 25});
var person2 = new StorableObject({name: "David", age: 24});
var person3 = new StorableObject({name: "JD", age: 25});

storage.people.add(person1);
storage.people.add(person2);
storage.people.add(person3);
 */
function StorableObject(obj) {
  if (typeof(obj) == 'object')
    return _coerceToStorableObject(obj);

  var id = _newUniqueId("obj-");
  // _print("making object for id: "+id);
  var o = _s.create(id);
  // _print("...and it is: "+o.id);
  return o;
}
StorableObject.prototype = {};

/**
 * The id of a StorableObject is auto-generated and can't be changed. You can get the
 * object associated with a given id using <code>getStorable</code>.
 * @name id
 * @memberOf StorableObject
 * @type string
 */

var storage = _getObjectForId("obj-root");

/**
 * <p>A StorableCollection is a way of grouping together many StorableObjects.</p>
 * <p>StorableObjects in a StorableCollection are not stored in any particular order,
 * but you can use the <code><a
 * href="#StorableCollection.sort">sort</a></code> or <code><a
 * href="#StorableCollection.sortBy">sortBy</a></code> methods to access the objects in order.
 * A collection usually contains objects of the same "type" in that they have a similar
 * set of properties, but this is not strictly required.</p>
 * 
 * <p>If you are familiar with SQL databases, a StorableCollection provides
 * much of the same functionality that a <em>table</em> provides in SQL,
 * and you can think of each StorableObject in the collection as analogous to a
 * <em>row</em> in a SQL table.  Unlike SQL tables, StorableCollections do not
 * have pre-defined columns.  You can add StorableObjects with
 * any properties you want.</p>
 * 
 * <p>After a StorableCollection is created, you add StorableObjects
 * to it by calling <code>StorableCollection.add()</code>, as documented below.</p>
 * 
 * <p>StorableCollections are also StorableObjects.  Therefore, each
 * StorableCollection has an "id" property, and may be retreived with a call to <a href="#getStorable">getStorable()</a>.
 * Usually, however, StorableCollections are assigned to properties of
 * the global <code>storage</code> object, as in the examples below.</p>
 *
 * @constructor
 * @extends StorableObject
 * 
 * @inherits {string} StorableObject.id
 * @example
import("storage");

// A collection of books
storage.books = new StorableCollection();

// Here we add a new StorableObject to the collection
storage.books.add(new StorableObject({title: "Shantaram", author: "Gregory David Roberts" }));

// If you call add with an object that is not a StorableObject, it
// gets converted to a StorableObject.  So this is a more compact way
// of doing the same thing.
storage.books.add({title: "Musashi", author: "Eiji Yoshikawa"});
storage.books.add({title: "Hackers & Painters", author: "Paul Graham"});

function printBook(book) {
  printp(html("&lt;i&gt;", book.title, "&lt;/i&gt; (by ", book.author, ")"));
}

// Print books sorted by their StorableObject creation date.
storage.books.sort().forEach(printBook);
print(html("<hr>"));

// Print books sorted alphabetically by title.
storage.books.sortBy("title").forEach(printBook);
print(html("<hr>"));

// Print books sorted reverse-alphabetically by author.
storage.books.sortBy("-author").forEach(printBook);
 */
function StorableCollection() {
  var id = _newUniqueId("coll-");
  // _print("making collection for id: "+id);
  var o = _c.create(id);
  return o;
}
StorableCollection.prototype = _a.createProxyObject(function() { }, function() { }, function() { }, function() { return []; },
 						    StorableObject.prototype);

/**
 * Adds a StorableObject to this collection.
 * @name add
 * @function
 * @memberOf StorableCollection
 * @param {object} obj The object to add to this collection. If
 * <code>obj</code> is not a StorableObject, a new StorableObject is
 * created from <code>obj</code> by passing it to the StorableObject
 * constructor, copying its properties.
 * @example
var c = new StorableCollection();
c.add({name: "John"});
 * @return {StorableObject} The added object.
 */
function _coll_add(id, o) {
  if (typeof(o) != 'object')
    throw new TypeError("Not a storable object!");

  // Option to do an "addAll"; an iterable can't be part of a collection.
  if (o instanceof _Iterable) {
    // _print("doing an 'add-all'");
    _c.add(id, o);
    return true;
  }

  var obj = _coerceToStorableObject(o);
  // _print("coercing argument to storable obejct, got: "+obj);
  _c.add(id, obj);

  return obj;
}

/**
 * Removes StorableObjects from this collection.
 * @name remove
 * @function
 * @memberOf StorableCollection
 * @param {object} obj The object to remove from this collection. If
 * <code>obj</code> is a StorableObject, <code>obj</code> itself is
 * removed from this collection. If <code>obj</code> is an collection
 * or a view on a collection (such as one created by <a
 * href="#StorableCollection.filter">filter</a>), then all objects
 * provided in that collection are removed. Finally, if
 * <code>obj</code> is just a plain object, then all members of this
 * collection that have the same properties and values as
 * <code>obj</code> are removed. Note: passing an <code>{}</code>
 * removes <em>all</em> objects form this collection.
 * @example
var c = storage.users; // a StorableCollection
c.remove({name: "John"});
 * @see #StorableCollection.filter
 */
function _coll_remove(id, obj) {
  if (typeof(obj) != 'object')
    throw new TypeError("Not a storable object!");

  _c.remove(id, obj);
}

function _coll_iterator(id) {
  var newId = _newUniqueId("itr-");
  return _c.iterator(id, newId);
}

function _Iterable(id) {
}
_Iterable.prototype = {};

/**
 * <p>Filters this collection based on a matching object.</p>
 * <p>Like other operations on StorableCollection, filter() returns a <i>view</i>
 * of the collection.  Views are temporary subsets of a collection which
 * can be iterated over or chained with other StorableCollection operations.</p>
 * <p><code>filter</code> is a "chainable" operation, along with sort(), sortBy(),
 * and limit().  For example, it is common to perform calls such as
 * <code>storage.mycollection.filter(...).sort(...).forEach(...)</code>.</p>
 * @name filter
 * @scope StorableCollection
 * @function
 * @memberOf StorableCollection
 * @param {object} match The object to base a filter on. The returned
 * view contains only those members of this StorableCollection whose
 * properties have the same value as the ones in
 * <code>match</code>. (Properties in the collection's members not
 * present in <code>match</code> are ignored.) 
 * @return A filtered view of this collection.
 * @example
storage.people = new StorableCollection();
storage.people.add({firstName: "Bob", lastName: "Smith", age: 30});
storage.people.add({firstName: "John", lastName: "Smith", age: 29});
storage.people.add({firstName: "John", lastName: "Sanders", age: 29});
storage.people.add({firstName: "John", lastName: "Jacobs", age: 29});

function printPerson(p) {
  printp(p.firstName, " ", p.lastName, " (age: ", p.age, ")");
}

printp("Everyone with firstName John:");
storage.people.filter({firstName: "John"}).sortBy("lastName").forEach(printPerson);

printp("Everyone with lastName Smith:");
storage.people.filter({lastName: "Smith"}).sortBy("firstName").forEach(printPerson);
*/
function _itr_filter(id, match) {
  var newId = _newUniqueId("itr-");
  return _i.filter(id, newId, match);
}

/**
 * <p>Returns a sorted view of this collection based
 * on a sorting function, or by object creation date
 * if no sorting function is given.</p>
 * 
 * <p><code>sort()</code> does not modify the StorableCollection is is called on.
 * Instead, it returns a view of the StorableCollection, which can be further
 * sorted, limited, or iterated over.</p>
 * 
 * <p><code>sort()</code> is a "chainable" operation:
 * it can be applied to other filtered, sorted, or limited views, as in
 * the example below.</p>
 * @name sort
 * @function
 * @memberOf StorableCollection
 * @param {function} [compare] <p>As with the function argument to
 * Array.sort, <code>compare</code> should take two arguments
 * <em>a</em> and <em>b</em>, and return a negative value, 0, or a
 * positive value, if <em>a</em> &lt; <em>b</em>, <em>a</em> =
 * <em>b</em>, or <em>a</em> &gt; <em>b</em>, respectively.</p>
 * <p>If no sort function is passed in, the returned view is sorted by 
 * object creation time, oldest objects first.</p>
 * @return A sorted view of this collection.
 * @example
function ageCompare(p1, p2) { return p2.age - p1.age; }
function printPerson(p) { printp(p.name); }

storage.people.sort(ageCompare).forEach(printPerson);
 */
function _itr_sort(id, compare) {
  var newId = _newUniqueId("itr-");
  return _i.sort(id, newId, compare);
}

/**
 * <p>Returns a sorted view of this collection based on a property name.
 * This is sometimes more convienent than calling the more general <code>sort()</code> method
 * and writing your own comparator function.</p>
 * 
 * <p><code>sortBy</code> is a "chainable" operation: it can be applied to
 * other filtered, sorted, or limited views.</p>
 * 
 * @name sortBy
 * @function
 * @memberOf StorableCollection
 * @param {string} propertyName1 Which property to use to compare the
 * collected objects on. Optionally prepend the property name with a "-"
 * to reverse the sort order.
 * @param {string} propertyName2 A secondary property to further sort the
 * objects.
 * @param {string} etc etc.
 * @return A sorted view of this collection.
 * @example
// sorts by "lastName" property, descending, and then 
// secondarily by "firstName" property, ascending.

storage.people.sortBy("-lastName", "firstName").forEach(printp);

 */
function _itr_sortBy(id, propertyNames) {
  var newId = _newUniqueId("itr-");
  return _i.sortBy(id, newId, propertyNames);
}

/**
 * <p>Executes a function once on each member of this collection.</p>
 * 
 * @name forEach
 * @function
 * @memberOf StorableCollection
 * @param {function} f The function to call on each member of this
 * collection. Returning <code>false</code> will cause forEach to
 * abort.
 * @example
// prints most recent 10 items of a collection.
storage.mycollection.sort().reverse().forEach(function(o) {
  printp("recent object: ", o);
});
 */

/**
 * Returns the number of elements in a collection. Can also be applied
 * to filtered and sorted views of a collection. (This number may be
 * approximate if your collection is very large or if many requests are
 * modifying it simultaneously.)
 * @name size
 * @function
 * @memberOf StorableCollection
 * @example
var size = storage.mycollection.filter({status: 3}).size();
 * @return {number} The size of this collection.
 */
function _itr_size(id) {
  return _i.size(id);
}


/**
 * Gets the first object in this StorableCollection.
 * @name first
 * @function
 * @memberOf StorableCollection
 * @return {number} The first object in this collection.
 * @example
print(storage.mycollection.filter({status: 3}).first());
 */
function _itr_first(id) {
  return _i.first(id);
}

/**
 * Returns a view consisting of the first <code>n</code> elements of
 * this collection or view. Useful in combination with <a
 * href="#StorableCollection.sort">sort</a> to get, for example, the
 * 10 most recent items in a collection.</p>
 * <p><code>limit()</code> is a
 * "chainable" operation: it can be applied to other filtered, sorted, or
 * limited views.</p>
 * @name limit
 * @function
 * @memberOf StorableCollection
 * @param {number} n How many elements to limit the new view to.
 * @return A limited view of this collection.
 * @example
storage.mycollection.filter({user: "bob"}).limit(10).forEach(printp);
 */
function _itr_limit(id, n) {
  var newId = _newUniqueId("itr-");
  return _i.limit(id, newId, n);
}

/**
 * <p>Returns a view that skips the first <code>n</code> elements of this
 * collection or view.</p>
 * 
 * <p><code>skip()</code> is a "chainable" operation: it
 * can be applied to other filtered, sorted, or limited views.</p>
 *
 * <p>This is particularly useful for paginating elements in a storable 
 * collection. If there are <i>n</i> elements per page, and you want to
 * display page <i>p</i>, then you can get a view of this page's elements
 * with <code>collection.skip(n*(p-1)).limit(n)</code>, as in the example 
 * below.
 *
 * @name skip
 * @function
 * @memberOf StorableCollection
 * @param {number} n How many elements to skip.
 * @return A new view of this collection with the first <code>n</code> elements skipped.
 * 
 * @example
// rendering part of a paginated collection
var p = request.param("pageNum");
var n = 10; // items per page
var view = mycollection.sort().skip(n*(p-1)).limit(n);
view.forEach(printp);
 */
function _itr_skip(id, n) {
  var newId = _newUniqueId("itr-");
  return _i.skip(id, newId, n);
}

/**
 * <p>Returns a view with the order of elements reversed.</p> 
 * 
 * <p><code>reverse()</code> is a "chainable" operation:
 * it can be applied to other filtered, sorted, or limited views.</p>
 * 
 * @name reverse
 * @function
 * @memberOf StorableCollection
 * @return A new view of this collection
 */
function _itr_reverse(id) {
  var newId = _newUniqueId("itr-");
  return _i.reverse(id, newId);
}

function _coll_toHTML(obj, id) {
  return appjet._internal.likeObjectsToHTML(
    function(f) {
      obj.forEach(function(obj) {
		    f({id: obj.id}, obj, {});
   });}, TH({colspan: 100}, _i.name(id)));
}

function _coll_getHandler(id) {
  return function(name) {
    switch (name) {
    case 'id':
      return id;
    case 'toString':
      return function() {
	return "Collection id #"+id;
      };
    case 'add':
      return function(obj) { return _coll_add(id, obj); };
    case 'remove':
      return function(obj) { return _coll_remove(id, obj); };
    case 'iterator':
      return function() { return _coll_iterator(id); };
    case 'forEach':
      return function(f) { return _coll_iterator(id).forEach(f); };
    case 'size':
      return function() { return _coll_iterator(id).size(); };
    case 'hasOwnProperty':
      return function() { return false; }; // XXX: This should be in ".has"
    case 'filter':
      return function(obj) { return _itr_filter(id, obj); };
    case 'sort':
      return function(f) { return _itr_sort(id, f); };
    case 'sortBy':
      return function(f1, f2, etc) { 
	return _itr_sortBy(id, Array.prototype.slice.call(arguments));
      };
    case 'first':
      return function() { return _itr_first(id); };
    case 'limit':
      return function(n) { return _itr_limit(id, n); };
    case 'reverse':
      return function() { return _itr_reverse(id); };
    case 'skip':
      return function(n) { return _itr_skip(id, n); };
    case 'toHTML':
      return function() { return _coll_toHTML(this, id); };
    default:
      return undefined;
    }
  };
}
function _coll_setHandler(id) {
  return function() { };
}
function _coll_getIdsHandler(id) {
  return function() {
    return ['id', 'toString', 'add', 'remove', 'iterator', 'forEach', 
            'size', 'skip', 'sort', 'sortBy', 'filter', 'first', 'limit', 'reverse'];
  };
}
function _coll_deleteHandler(id) {
  return function() { };
}

function _itr_getHandler(id) {
  return function(name) {
    switch (name) {
    case 'id':
      return id;
    case 'next':
      return function() {
	return _i.next(id);
      };
    case 'hasNext':
      return function() {
	return _i.hasNext(id);
      };
    case 'forEach':
      return function(f) {
	var o;
	while (_i.hasNext(id)) {
	  if ((o = f(_i.next(id))) === false)
	    break;
	}
      };
    case 'filter':
      return function(obj) { return _itr_filter(id, obj); };
    case 'sort':
      return function(f) { return _itr_sort(id, f); };
    case 'sortBy':
      return function(f1, f2, etc) { 
	return _itr_sortBy(id, Array.prototype.slice.call(arguments));
      };
    case 'size':
      return function() { return _itr_size(id); };
    case 'first':
      return function() { return _itr_first(id); };
    case 'limit':
      return function(n) { return _itr_limit(id, n); };
    case 'reverse':
      return function() { return _itr_reverse(id); };
    case 'skip':
      return function(n) { return _itr_skip(id, n); };
    case 'toHTML':
      return function() { return _coll_toHTML(this, id) }
    default:
      return undefined;
    }
  };
}
function _itr_setHandler(id) {
  return function() { };
}
function _itr_getIdsHandler(id) {
  return function() {
    return ['id', 'toString', 'add', 'remove', 'forEach', 'next', 'hasNext',
	    'size', 'skip', 'sort', 'sortBy', 'filter', 'first', 'limit', 'reverse'];
  };
}
function _itr_deleteHandler(id) {
  return function() { };
}
