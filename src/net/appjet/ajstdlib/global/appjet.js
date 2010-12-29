//----------------------------------------------------------------
// global static "appjet" object
//----------------------------------------------------------------

/**
 * @fileOverview The global appjet object contains access to the AppJet runtime,
 * app meta-data, and other information.
 */

/**
 * @type object
 */
appjet = {};

/**
 * This is the interface to the native AppJet VM.  You probably won't need
 * to use this, but if you do, be careful!
 * @type object
 */
appjet._native = _appjetnative_;

/**
 * Holds whether the current request is a preview request.
 * @type boolean
 */
appjet.isPreview = _appjetnative_.isPreview();

/**
 * Holds whether we are currently executing in a shell session.
 * @type boolean
 */
appjet.isShell = _appjetnative_.isShell();

/**
 * Holds whether the app is "transient", that is, created by a user
 * without an account.
 * @type boolean
 */
appjet.isTransient = _appjetnative_.isTransient();

/**
 * The domain this app is running on.  For app "foo" hosted at
 * "foo.appjet.net", for example, this will be "appjet.net".
 * When AppJet eventually supports hosting at other domains, this
 * may be something other than "appjet.net".
 * @type string
 */
appjet.mainDomain = _appjetnative_.mainDomain();

/**
 * The current app's encoded app key.  This is useful for constructing
 * links to AppJet pages, such as http://appjet.com/app/&lt;appKey&gt;/source.
 * @type number
 */
appjet.encodedAppKey = _appjetnative_.encodedAppKey();

/**
 * Holds the name of the current app.
 * @type String
 */
appjet.appName = _appjetnative_.appName();

//----------------------------------------------------------------
// internal appjet stuff
//----------------------------------------------------------------

/** @ignore */
appjet._internal = {};
/** @ignore */
appjet._internal.global = this;  // store definitive reference to global scope

