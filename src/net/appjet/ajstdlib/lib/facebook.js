/**
 * @fileOverview
 *
 * Library for building facebook apps.
 * <br />
 * Importing facebook will automatically make all known FBML tags available
 *  as functional HTML tags, with : replaced with _.  For example, the
 *  you can create a FB:FRIEND-SELECTOR tag by calling FB_FRIEND_SELECTOR().
 *
 * See: http://wiki.developers.facebook.com/index.php/Category:FBML_tags
 */

//----------------------------------------------------------------
// dependencies
//----------------------------------------------------------------
importLocal(this, "quickforms", "storage");

//----------------------------------------------------------------
// FBML tags
//----------------------------------------------------------------
var _fbmltags =
[
"FBML",
"FB:18-PLUS",
"FB:21-PLUS",
"FB:CAPTCHA",
"FB:ACTION",
"FB:ADD-SECTION-BUTTON",
"FB:APPLICATION-NAME",
"FB:ATTACHMENT-PREVIEW",
"FB:BOARD",
"FB:COMMENTS",
"FB:CREATE-BUTTON",
"FB:DASHBOARD",
"FB:DEFAULT",
"FB:DIALOG",
"FB:DIALOG-BUTTON",
"FB:DIALOG-CONTENT",
"FB:DIALOG-DISPLAY",
"FB:DIALOG-TITLE",
"FB:EDITOR",
"FB:EDITOR-BUTTON",
"FB:EDITOR-BUTTONSET",
"FB:EDITOR-CANCEL",
"FB:EDITOR-CUSTOM",
"FB:EDITOR-DATE",
"FB:EDITOR-DIVIDER",
"FB:EDITOR-MONTH",
"FB:EDITOR-TEXT",
"FB:EDITOR-TEXTAREA",
"FB:EDITOR-TIME",
"FB:ELSE",
"FB:ERROR",
"FB:EVENTLINK",
"FB:EXPLANATION",
"FB:FBJS_BRIDGE",
"FB:FBML",
"FB:FBMLVERSION",
"FB:FLV",
"FB:FRIEND-SELECTOR",
"FB:GOOGLE-ANALYTICS",
"FB:GROUPLINK",
"FB:HEADER",
"FB:HEADER-TITLE",
"FB:HELP",
"FB:IF",
"FB:IF-CAN-SEE",
"FB:IF-CAN-SEE-EVENT",
"FB:IF-CAN-SEE-PHOTO",
"FB:IF-IS-APP-USER",
"FB:IF-IS-FRIENDS-WITH-VIEWER",
"FB:IF-IS-GROUP-MEMBER",
"FB:IF-IS-OWN-PROFILE",
"FB:IF-IS-USER",
"FB:IF-MULTIPLE-ACTORS",
"FB:IF-USER-HAS-ADDED-APP",
"FB:IFRAME",
"FB:IS-IN-NETWORK",
"FB:IS-IT-APRIL-FOOLS",
"FB:IS-LOGGED-OUT",
"FB:JS-STRING",
"FB:MEDIAHEADER",
"FB:MESSAGE",
"FB:MP3",
"FB:MULTI-FRIEND-INPUT",
"FB:MULTI-FRIEND-SELECTOR",
"FB:NAME",
"FB:NARROW",
"FB:NETWORKLINK",
"FB:NOTIF-EMAIL",
"FB:NOTIF-PAGE",
"FB:NOTIF-SUBJECT",
"FB:OWNER-ACTION",
"FB:PHOTO",
"FB:PROFILE-ACTION",
"FB:PROFILE-PIC",
"FB:PRONOUN",
"FB:RANDOM",
"FB:RANDOM-OPTION",
"FB:REDIRECT",
"FB:REF",
"FB:REQ-CHOICE",
"FB:REQUEST-FORM",
"FB:REQUEST-FORM-SUBMIT",
"FB:SHARE-BUTTON",
"FB:SILVERLIGHT",
"FB:SUBMIT",
"FB:SUBTITLE",
"FB:SUCCESS",
"FB:SWF",
"FB:SWITCH",
"FB:TAB-ITEM",
"FB:TABS",
"FB:TIME",
"FB:TITLE",
"FB:TYPEAHEAD-INPUT",
"FB:TYPEAHEAD-OPTION",
"FB:USER",
"FB:USER-ITEM",
"FB:USER-STATUS",
"FB:USER-TABLE",
"FB:USERLINK",
"FB:VISIBLE-TO-ADDED-APP-USERS",
"FB:VISIBLE-TO-APP-USERS",
"FB:VISIBLE-TO-CONNECTION",
"FB:VISIBLE-TO-FRIENDS",
"FB:VISIBLE-TO-OWNER",
"FB:VISIBLE-TO-USER",
"FB:WALLPOST",
"FB:WALLPOST-ACTION",
"FB:WIDE"
];
importTags(this, _fbmltags);

//----------------------------------------------------------------
// persistent things
//----------------------------------------------------------------
function _getstorage(key) {
  if (storage['facebooklib'] === undefined) {
    return undefined;
  }
  return storage.facebooklib[key];
}

function _setstorage(key, val) {
  if (storage.facebooklib === undefined) {
    storage.facebooklib = new StorableObject();
  }
  storage.facebooklib[key] = val;
}

//----------------------------------------------------------------
// global fb singleton object
//----------------------------------------------------------------

/**
 * The FaceBook object.
 * @type {object}
 */
fb = {};

/**
 * The facebook uid of the current user of this app.
 * @type {string}
 */
fb.uid = '-1';

/**
 * The current facebook sessionKey. This will only be set if the session user has added the
 * app and is logged in to it.  Otherwise, it will be undefined.
 * @type {string}
 */
fb.sessionKey = undefined;
if (request.param('fb_sig_session_key')) {
  fb.sessionKey = request.param('fb_sig_session_key');
}

/**
 * List of the uids of the current user's friends.  This will only be filled in
 * if the session user has added the app and is logged in to it.
 * @type {array[string]}
 */
fb.friends = [];
if (request.param('fb_sig_friends')) {
  fb.friends = request.param('fb_sig_friends').split(',');
}

// module private vars
var _isSetup = true;

/**
 * @ignore
 */
var _config = {}
_config.canvasUrl = null;
_config.secret = null;
_config.apiKey = null;


//----------------------------------------------------------------
// fill in some default values
//----------------------------------------------------------------
if (request.param('fb_sig_user')) {
  fb.uid = request.param('fb_sig_user');
}

['secret', 'apiKey', 'canvasUrl'].forEach(function(k) {
  if (_getstorage(k)) {
    _config[k] = _getstorage(k);
  } else {
    _isSetup = false;
  }
});

/**
 * contains "http://apps.facebook.com/&lt;the_canvasl_url&gt;/"
 * @type {string}
 */
fb.fullCanvasUrl = "";

if (_config.canvasUrl) {
  fb.fullCanvasUrl = 'http://apps.facebook.com/' + _config.canvasUrl + '/';
}

//----------------------------------------------------------------
// Utilities
//----------------------------------------------------------------

// calculates the hash (md5 digest) of a map, according
// to Facebook's auth rules
function _objectHash(obj) {
  var kk = keys(obj);
  kk.sort();
  var sigstring = "";
  kk.forEach(function(k) { sigstring += (k + "=" + obj[k]); });
  sigstring += _config.secret;
  return md5(sigstring);
}

/**
 * Tells facebook to redirect the user to a new URL.  For FBML facebook apps, use
 * this instead of response.redirect(), so that it redirects the facebook user
 * instead of the facebook server.
 * @param {string} [url] The new URL to direct the user to.  If you do not set this parameter,
 *                       the user will be redirected to the main canvas page.
 */
fb.redirect = function(url) {
  if (!url) {
    url = fb.fullCanvasUrl;
  }
  if (request.param('fb_sig_in_canvas') == "1") {
    print(FB_REDIRECT({url: url}));
    response.stop(true);
    return;
  }
  if (url.match(/^https?:\/\/([^\/]*\.)?facebook\.com(:\d+)?/i)) {
    // make sure facebook.com url's load in the full frame so that we don't
    // get a frame within a frame.
    print(raw('<script type="text/javascript">\ntop.location.href = "'
	      +url+'";\n</script>'));
    response.stop(true);
    return;
  }
  response.redirect(url);
};

/**
 * Ensures that the current user has added this app.  If the current user of the app
 * has already added it, this does nothing.  Otherwise, it immediately redirects the
 * user to the add page.
 */
fb.requireAdd = function() {
  if (request.param('fb_sig_added') != '1') {
    fb.redirect("http://www.facebook.com/add.php?api_key="+_config.apiKey);
  }
};

//----------------------------------------------------------------
// init()
//----------------------------------------------------------------

/**
 * Every facebook app should call fb.init() immediately after import("facebook").
 * It will first make sure the AppJet app is configured as a valid facebook app.  Next, if
 * the request path starts with "/callback/", it will
 * authenticate that the request from facebook and then set up all the fb.* properties.
 */
fb.init = function() {
  _checkSetup(); // will stop request if preview or not set up

  if (request.isGET && request.path == '/') {
    // web request -- not a facebook-proxied request
    print(P("This is a facebook application.  Visit it at: ",
	    A({href: fb.fullCanvasUrl}, fb.fullCanvasUrl)));
    response.stop(true);
  }
  
  page.setMode('facebook');

  if (request.isPOST && /^\/callback\//.test(request.path)) {
    if (!fb.authenticateRequest()) {
      print(FB_DASHBOARD(),
	    FB_ERROR(FB_MESSAGE("Authentication Error: Forbidden"),
		     "We could not verify that this request came from Facebook. ",
		     "For your safety and privacy, we will not display the page.  ",
		     BR(),
		   "Please report this to the creators of the application."));
      response.setStatusCode(403);
      response.stop(true);
    }
  }
};

//----------------------------------------------------------------
// Facebook REST functions
//----------------------------------------------------------------

// TODO: catch error codes and return them somehow and/or throw exceptions with useful messages.

/**
 * Executes a remote facebook API call.  See the <a
 * href="http://wiki.developers.facebook.com/index.php/API">Facebok API
 * Methods</a> wiki page for a list of all methods.
 *
 * @param {string} cmd The name of the command, e.g. "facebook.profile.setFBML".
 * @param {object} params The set of parameters to pass to this call.  Note: api_key, sesion_key,
 *                 call_id, v, and format, and sig will be automatically set for you.  However, you
 *                 can override any of these if you like.
 * @return {object} The call result, as a javascript object.
 *
 * @example
fb.requireAdd();
print(fb.call("users.getInfo",
              { uids: [700577, 550505927],
                fields: ["birthday", "about_me"] }));
 *
 */
fb.call = function(cmd, params) {
  if ((! fb.sessionKey) && (!params.session_key)) {
    throw new Error("No session key for fb.call(); to make calls you should"
                    +" require that the user be logged in or have added your"
                    +" app, OR you can use your own infinite session key"
                    +" for the call.");
  }
  function formatParam(p) {
    if (p instanceof Array) {
      return p.join(',');
    } else {
      return p.toString();
    }
  }
  var params2 = {};
  params2.method = cmd;
  params2.api_key = _config.apiKey;
  params2.session_key = fb.sessionKey;
  params2.call_id = (+(new Date()));
  params2.v = "1.0";
  params2.format = "JSON";
  eachProperty(params, function(k, v) {
    params2[k] = formatParam(v);
  });
  params2.sig = _objectHash(params2);
  
  postResult = wpost("http://api.facebook.com/restserver.php", params2);
  if (postResult.substr(0, 6).toLowerCase() == '<?xml ') {
    print("Facebook API Error: ", PRE(postResult));
    return null;
  }
  // decided to use "eval" parse the JSON for now, since
  // it's coming from facebook and can't do harm if it follows the spec
  var result = eval("("+postResult+")");
  if (result.error_msg && result.error_code) {
    print("Facebook API Error: ");
    print(result);
  }
  return result;
};

/**
 * Convenience function for sending a notification to 1 or more users.
 *
 * See: <a href="http://developers.facebook.com/documentation.php?v=1.0&method=notifications.send">
 *  Facebook's docs for facebook.notifications.send</a>.
 *
 * @param {array or string} users Array of uids or single uid of those to receive this notification.
 * @param {string} notificationFBML The FBML content of the notification.
 */
fb.sendNotification = function(users, notificationFBML) {
  var userStr = users;
  if (Array.prototype.isPrototypeOf(users)) {
    userStr = users.join(',');
  }
  fb.call("facebook.notifications.send",
          { to_ids: userStr, notification: notificationFBML });
};

/**
 * Convenience function for setting a user's profile FBML.
 *
 * See <a
 *  href="http://developers.facebook.com/documentation.php?v=1.0&method=profile.setFBML">Facebook's
 *  docs for facebook.profile.setFBML</a>.
 *
 * @param {string} uid The uid of the profile to set.
 * @param {string} markup The text of the FBML to set.
 * @example
fb.requireAdd();
fb.setProfileFBML(fb.uid,
    DIV(CENTER(
        "Here is another picture of me:",
        BR(),
        FB_PROFILE_PIC({uid: fb.uid}))));
 */
fb.setProfileFBML = function(uid, markup) {
  if (markup.toHTML && typeof(markup.toHTML) == "function") {
    markup = markup.toHTML();
  }
  fb.call("facebook.profile.setFBML",
	  { uid: uid, markup: markup });
};

//----------------------------------------------------------------
// Facebook Request Authentication
//----------------------------------------------------------------

/**
 * Checks post parameters against fb_sig to verify that the reqest
 * came from facebook servers and not a haxxor. Note: this method is called automatically by
 * fb.init(), so you usually do not need to call it directly.
 *
 * @return {boolean} true if the request is from facebook and legit; false otherwise.
 */
fb.authenticateRequest = function() {
  var fbParams = {};
  for(p in request.params) {
    if (p.match("^fb_sig_")) {
      fbParams[p.substring("fb_sig_".length)] = request.params[p];
    }
  }
  var fbCorrectSig = _objectHash(fbParams);
  return (fbCorrectSig == request.param("fb_sig"));
};

//----------------------------------------------------------------
// config setup
//----------------------------------------------------------------

// stops the request if this is a preview or the app is not setup
function _checkSetup() {

  var isSetup = (_isSetup === true);
  
  // security
  if (!appjet.isPreview) {
    if (! isSetup) {
      print(P("This is an unconfigured facebook app.  If you are the app developer,",
	      " preview this app in the AppJet IDE to configure it."));
      response.stop(true);
    } else {
      return; // not preview mode AND app is setup... proceed to render the app
    }
  }

  page.head.write(STYLE(raw("""
#container { height: 100%; position: relative; overflow: auto; }
iframe#newapp { width: 800px; border: 0; height: 2500px; position: absolute;
  left: 150px; top: 0px; overflow: hidden; z-index: 1 }
#appjetfooter { display: none; }
#instrucs { position: absolute; left: 0; top: 0; width: 300px; z-index: 2; background: #ddd;
    height: 2000px; }
#instrucsinner { padding: 0 1em; margin-top: 1em; }
#instrucs p { margin: 1em 0; }
#instrucs h2 { font-size: 110%; margin: 0; line-height: 120%;
text-align: center; padding: 0.5em; background: #666;
padding-top: 0.8em; color: #fff; }
.notpublished { color: #a00; }
.instrucPanel { display: none; }
#needLoginPanel { display: block; }
.buttons .prev { float: left; }
.buttons .next { float: right; }
.url { font-size: 90%; }
.forcopy { border: 1px solid #999; padding: 5px; }
hr { clear: both; margin-top: 0.8em; margin-bottom: 0.8em; }
#configurePanel .field { font-size: 90%; }
li { margin: 0.5em; }
body { line-height: 120%; }
.small { font-size: 80%; }
""")));
  
  if (request.path == "/wizard") {
    /**** begin wizard ****/

    var myAppsPath = "http://www.facebook.com/developers/apps.php";
    var newAppPath = "http://www.facebook.com/developers/editapp.php?new";
    
    page.head.write(STYLE(raw("""
html, body { height: 100%; overflow: hidden; }
body { margin: 0; padding: 0; }
""")));
    
    function prevNext(prevPanel, nextPanel, opts) {
      var prevButton = INPUT({className:"prev", type:"button", value:"<< Prev"});
      if (prevPanel) {
	prevButton.attribs.onClick = "selectPanel('"+prevPanel+"');";
      }
      else {
	prevButton.attribs.disabled = "disabled"; 
      }
      var nextButton = INPUT({className:"next", type:"button", value:"Next >>"});
      if (nextPanel) {
	nextButton.attribs.onClick = "selectPanel('"+nextPanel+"');";
      }
      else {
	nextButton.attribs.disabled = "disabled"; 
      }
      if (opts && opts.disablePrev) prevButton.attribs.disabled = "disabled";
      if (opts && opts.disableNext) nextButton.attribs.disabled = "disabled";
      if (opts && opts.prevJS && prevButton.attribs.onClick)
	prevButton.attribs.onClick = prevButton.attribs.onClick+" "+opts.prevJS;
      if (opts && opts.nextJS && nextButton.attribs.onClick)
	nextButton.attribs.onClick = nextButton.attribs.onClick+" "+opts.nextJS;
      if (opts && opts.noNext) nextButton = DIV();
      else if (opts && opts.replaceNextWith) nextButton = opts.replaceNextWith;
      if (opts && opts.noPrev) prevButton = DIV();
      else if (opts && opts.replacePrevWith) prevButton = opts.replacePrevWith;
      
      return DIV({className:"buttons"}, prevButton, nextButton);
    }
    
    function needLoginPanel() {
      return DIV({className:"instrucPanel selectedPanel",id:"needLoginPanel"},P(raw("""
If you're not already logged into Facebook, you'll be prompted here.  (Your password
is not sent to AppJet.)""")),
		 P("Facebook may also ask permission to add its Developer interface to your account."),
		 P("When you see ",STRONG("My Applications")," click Next."),
		 prevNext(null,"creationPanel"));
    }
    
    function creationPanel() {
      return DIV({className:"instrucPanel",id:"creationPanel"},
		 P({id:"createappcont"},
		   STRONG("Click me: "),INPUT({id:"createapp", type:"button", value:"Start New Facebook App",
					       onClick:"loadInIframe('"+newAppPath+"'); selectPanel('appNamePanel');"})),
		 P("Or, click Edit Settings on an app to the right."),
		 prevNext("needLoginPanel","appNamePanel"));      
    }

    function appNamePanel() {
      return DIV({className:"instrucPanel",id:"appNamePanel"},
		 P(STRONG("Application Name:")," Choose a name for your app on Facebook."),
		 P("Remember to mark the checkbox if necessary."),
		 P("Expand ",STRONG("Optional Fields")," so that the triangle points down."),
		 prevNext("creationPanel","baseOptsPanel"));
    }
    
    function getCallbackURL() {
      return "http://"+appjet.appName+"."+appjet.mainDomain+"/callback/";
    }
    
    function baseOptsPanel() {
      return DIV({className:"instrucPanel",id:"baseOptsPanel"},
		 P(STRONG("Callback URL:")," Enter this:\n",SPAN({className:"url forcopy"},
								 getCallbackURL())),
		 P(STRONG("Canvas Page URL:")," Choose one, enter it to the right, and tell me here:\n",
		   SPAN({className:"url"},"http://apps.facebook.com/",
			INPUT({type:"text",id:"canvasPage",size:10,onkeypress:
			       "typeCanvasPageNotify();",onclick:"typeCanvasPageNotify();"}),"/")),
		 prevNext("appNamePanel","installOptsPanel",{disableNext:true,
							     nextJS:"typeCanvasPageNotify();"}));
    }
    
    function installOptsPanel() {
      return DIV({className:"instrucPanel",id:"installOptsPanel"},
		 P(STRONG("Can your application be added?"),' Click "Yes".'),
		 P("(Scroll down...)"),
		 P(STRONG("Who can add your application?"),' Mark "Users".'),
		 P(STRONG("Post-Add URL:"),"\n",
		   SPAN({className:"url forcopy"},"http://apps.facebook.com/",
			SPAN({className:"canvasPageCopied"},"<canvasPage>"),"/")),
		 P(STRONG("Side Nav URL:"),"\n",
		   SPAN({className:"url forcopy"},"http://apps.facebook.com/",
			SPAN({className:"canvasPageCopied"},"<canvasPage>"),"/")),
		 prevNext("baseOptsPanel","submitPanel"));
    }
    
    function submitPanel() {
      return DIV({className:"instrucPanel",id:"submitPanel"},
		 P("Those are the important settings."),
		 P(STRONG("When you're ready, click the blue Submit button.")),
		 P("I'll need some information from the next page..."),
		 prevNext("installOptsPanel","configurePanel"));
    }
    
    function configurePanel() {
      return DIV({className:"instrucPanel",id:"configurePanel"},
		 FORM({action:"/config",method:"post"},
		      A({href:"javascript:void(loadInIframe('"+myAppsPath+"#content'));"}, "Scroll to top of My Applications"),
		      HR(),
		      P("Find the listing for your app and copy the following:  "),
		      P({className:"field"},STRONG("API Key:"),"\n",
			INPUT({type:"text",value:"",size:"32",name:"apikey"})),
		      P({className:"field"},STRONG("Secret:"),"\n",
			INPUT({type:"text",value:"",size:"32",name:"secret"})),
		      HR(),
		      P("Confirm the following:"),
		      P({className:"field"},STRONG("Callback URL:"),"\n",
			getCallbackURL()),
		      P({className:"field"},STRONG("Canvas Page (from earlier):"),"\n",
			"http://apps.facebook.com/",INPUT({id:"canvasPageConfig", type:"text",
							   value:"XXXX", name:"canvaspage", size:10}),"/"),
		      HR(),
		      prevNext("submitPanel",null,{replaceNextWith:
						   INPUT({className:"next",type:"submit",value:"Done!"})})));
    }

    page.setTitle("Facebook App Wizard");
    page.head.write(SCRIPT(
      {src:
       "http://cachefile.net/scripts/jquery/1.2.1/jquery-1.2.1.js"}));
    print(DIV({id:"container"},
	      IFRAME({id:"newapp",name:"newapp",
		      src:myAppsPath})),
	  DIV({id:"instrucs"},H2("Facebook App Configuration"),
	      DIV({id:"instrucsinner"},
		  needLoginPanel(), creationPanel(),
		  appNamePanel(),
		  baseOptsPanel(), installOptsPanel(),
		  submitPanel(), configurePanel())));
    
    page.head.write(SCRIPT(raw("""
function selectPanel(theId) {
    $(".instrucPanel").hide().removeClass("selectedPanel");
    $("#"+theId).show().addClass("selectedPanel");
}

function getCanvasPage() {
    var cp = $("input#canvasPage").get(0).value;
    cp = cp.replace(/^\s+/,'').replace(/\s+$/,'');
    return cp;
}

function typeCanvasPageNotify() {
    $('#baseOptsPanel .next').get(0).disabled = false;
    var canvasPage = getCanvasPage();
    $(".canvasPageCopied").html(canvasPage);
    $("#canvasPageConfig").get(0).value = canvasPage;
}

function loadInIframe(url) {
  $('iframe#newapp').get(0).contentWindow.location.href = url;
}
""")));
    /**** end wizard ****/
  }
  else if (request.path == "/config" && request.isPost) {
    _setstorage('apiKey', trim(request.params.apikey));
    _setstorage('secret', trim(request.params.secret));
    _setstorage('canvasUrl', trim(request.params.canvaspage));
    print(SCRIPT(raw("window.close();")));
  }
  else {
    // path "/", etc.
    if (! isSetup) {
      print(H2("Facebook Library: Unconfigured App"));
      if (! appjet._native.hasBeenPublished()) {
	print(P(SPAN({className:"notpublished"},'First, you have to give this app a public URL.')));
	print(UL(LI('Click the "Publish" tab '+
		    'above and follow the instructions.'),
		 LI('Then come back and reload this Preview pane.')));
      }
      else {
	print(P("Click to open the ",A({href:"/wizard", target:"_blank"},"Facebook App "+
				       "Wizard")," in a new window."));
	print(P("When you're finished, click to ",
		link("/","refresh")," this page."));
      }
    }
    else {
      // is set-up
      print(H2("This is a configured Facebook app."));
      print(P("(To reconfigure this app, use the ",
	      A({href:"/wizard", target:"_blank"},"Facebook App "+
		"Wizard"),".)"));
    }
  }
  
  response.stop(true);
};

