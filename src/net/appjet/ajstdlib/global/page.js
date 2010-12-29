/**
 * @fileOverview The page object is what gets rendered by default at the end
 * of a request.
 */

if (!appjet) {
  throw new Error('appjet library is required for page library.');
}

/**
 * @type object
 */
page = {};
appjet._internal.page = page;

// some defaults

// TODO: turn _modes into a set.
var _MODES = new StringSet('html', 'plain', 'facebook');

var _mode = 'html';
var _title = appjet.appName;
var _icon = "http://apps.jgate.de/static/favicon.ico";
var _showRenderTime = true;
var _headbuffer = [];
var _bodybuffer = [];

/**
 * Changes the mode of response output to something other than
 * HTML.  For example, setMode("plain") will not print the default
 * AppJet HTML document structure (in fact it will not print
 * anything but your calls to print()).
 * If you setMode("plain"), you are on your own.
 *
 * The default output mode is "html", which creates a simple xhtml
 * document structure.
 *
 * @param {string} newMode one of ['html', 'plain']
 */
page.setMode = function(newMode) {
  if (_MODES.contains(newMode)) {
    _mode = newMode;
  } else {
    throw new Error('Unknown page mode: '+newMode);
  }
};

/**
 * Sets the HTML title tag of the page.
 * @param {string} newTitle
 */
page.setTitle = function(newTitle) {
  _title = newTitle;
};

/**
 * Sets the favicon of the page.
 * @param {string} url A URL pointing to the image to use as a favicon.
 */
page.setFavicon = function(url) {
  _icon = url;
}

/**
 * Sets whether or not to print the number of milliseconds taken to render
 * the page in the page's footer.  Default is true.  Applies only to HTML mode.
 * @param {boolean} show
 */
page.showRenderTime = function(show) {
  _showRenderTime = show;
};

/** @ignore */
page.body = {};

/**
 * Append a raw string to the page's BODY section.
 * @param {string} rawText
 */
page.body.write = function(rawText) {
  _bodybuffer.push(rawText);
};

/**
 * Gets the page's BODY section as written so far.
 */
page.body.get = function() {
  return _bodybuffer.join('');
}


/** @ignore */
page.head = {};

/**
 * Append raw text to the page's HEAD section.
 * @example
page.head.write("""
&lt;style&gt;
  p { font-size: 200%; }
&lt;/style&gt;
""");
 *
 * @param {string} rawText
 */
page.head.write = function(rawText) {
  _headbuffer.push(rawText);
};

/**
 * Gets the page's HEAD section as written so far. Useful especially
 * for page mode "plain", when a library might write to the HEAD
 * section.
 */
page.head.get = function() {
  return _headbuffer.join('');
}

//----------------------------------------------------------------
// rendering the standard page / templates
//----------------------------------------------------------------

var _HTML_HEAD_TEMPLATE = """
<!DOCTYPE html PUBLIC
          "-//W3C//DTD XHTML 1.0 Transitional//EN"
          "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en" xml:lang="en">
<head>
<meta http-equiv="Content-type" content="text/html; charset=utf-8" />
<meta http-equiv="Content-Language" content="en-us" />
<link rel="icon" href="{icon}" />
<title>{title}</title>
<style type="text/css">
/* begin appjet default css */
html { font-family: sans-serif; }
form.appjet_form { border: 1px solid #ccc; background-color: #eee; margin: 1.0em 0; }
form.appjet_form input { margin: 0.2em; }
/* end appjet default css */

/* begin appjet:css section */
{customCss}
/* end appjet:css section */
</style>

<!-- begin app-written head.  (use page.head.write() to put stuff here) -->
{customHead}
<!-- end app-written head -->

<script type="text/javascript">
// begin appjet:client section
// <![CDATA[
{customJs}
// ]]>
// end appjet:client section
</script>

</head>
"""; // " // <-- unconfuse emacs

var _HTML_FOOTER_TEMPLATE = """
<div style="clear: both;"><!-- --></div>
<div id="appjetfooter"
     style="border-top: 1px solid #ccc; margin-top: 1.2em; font-family: verdana, helvetica, sans-serif; font-size: 0.8em;">
<div style="float: left;">
  <span style="vertical-align: top;">
    Powered by <a target="_blank" href="http://blog.jgate.de/appjet-the-platform-behind-jgate" title="Powered by AppJet">AppJet</a>
    <span style="font-size: 1.0em; margin-right: 5px;">&#9992;</span>on
    <a target="_blank" href="http://{mainDomain}/" title="Build your own app on JGate">JGate</a>
  </span>
</div>
<div style="float: right;">
  <a target="_blank" href="{sourceLink}">source</a>
</div>
{statsDiv}
</div>
"""; // "; // <-- unconfuse emacs

var _HTML_FOOTER_SOURCE_PREVIEW = "http://{mainDomain}/platform/source?{appName}";
//var _HTML_FOOTER_SOURCE_PUBLISH = "http://source.{appName}.{mainDomain}/";
var _HTML_FOOTER_SOURCE_PUBLISH = "http://{mainDomain}/platform/source?{appName}";

function _setAggressiveNoCacheHeaders() {
  // be aggressive about not letting the response be cached.
  function sh(k,v) { response.setHeader(k,v); }
  sh('Expires', 'Sat, 18 Jun 1983 07:07:07 GMT');
  sh('Last-Modified', (new Date()).toGMTString());
  sh('Cache-Control', ('no-store, no-cache, must-revalidate, '+
		       'post-check=0, pre-check=0'));
  sh('Pragma', 'no-cache');
}

function _setAggressiveYesCacheHeaders() {
  function sh(k,v) { response.setHeader(k,v); }
  var futureDate = new Date();
  futureDate.setTime(Date.now() + 315360000000);
  sh('Expires', futureDate.toGMTString());
  sh('Cache-Control', 'max-age=315360000');
}


/**
 * Renders the entire current page to a string.  By default, this is called at the
 * end of every request and printed to the response buffer, so usually there is
 * no reason for you to call this.
 *
 * @return {string} rendered HTML string of the current page
 */
page.render = function() {
  // set proper cache headers
  if (appjet._internal.cacheable === true) {
    _setAggressiveYesCacheHeaders();
  } else if (appjet._internal.cacheable === false) {
    _setAggressiveNoCacheHeaders();
  }
  // determine output mode
  if (_mode == "plain") { return _renderPlain(); }
  if (_mode == "facebook") { return _renderFacebook(); }
  if (_mode == "html") { return _renderHtml(); }
  response.setHeader('Content-Type', 'text/plain');
  return ["Unknown output mode: "+mode];
};

function _renderPlain() {
  return _bodybuffer;
}

function _renderFacebook() {
  return _bodybuffer.concat(_renderFooter());
}

function _renderHtml() {
  var result = [];
  function getcustom(secnames) {
    var custom = '';
    var secList = [];
    secnames.forEach(function(secname) {
      secList = secList.concat(appjet._native.codeSection(secname));
    });
    secList.sort(function (a, b) { return a.startLine - b.startLine });
    secList.forEach(function(sec) {
      custom += sec.code;
    });
    return custom;
  }
  // header
  var data = {
    title: _title,
    icon: _icon,
    customCss: getcustom(['css']),
    customJs: getcustom(['client', 'common']),
    customHead: _headbuffer.join('')
  };
  result.push(supplant(data, _HTML_HEAD_TEMPLATE));
  // body
  result.push('<body>\n<!-- ********** begin body ********** -->\n\n');
  _bodybuffer.forEach(function(x) {
    result.push(x);
  });
  result.push('\n\n<!-- ********** end body ********** -->\n');
  // footer
  result = result.concat(_renderFooter());
  result.push('</body>\n</html>');
  return result;
}

function _renderFooter() {
  if (appjet.isTransient) return;
  var statsDiv = '';
  if (_showRenderTime) {
    var seconds = ((new Date()).valueOf() - _tstart) / 1000.0;
    var tstr = sprintf("%8s", sprintf("%.3f", seconds));

    var kbytes, memstr = "";
    if (appjet.isPreview) {
      kbytes = appjet._native.storage_usage()/1024;
      if (kbytes > 0.01) {
	if (kbytes < 1024) {
	  memstr += sprintf("%5sKB", sprintf("%.0f", kbytes));
	} else if (kbytes < 10*1024) {
	  memstr += sprintf("%5sMB", sprintf("%.2f", kbytes/1024));
	} else {
	  memstr += sprintf("<span style='color: red'>%5sM</span>", sprintf("%.2f", kbytes/1024));
	}
	memstr = ' &ndash; using '+memstr+' of 10MB'
      }
    }
    statsDiv =('<div style="text-align: center; color: #666;">'+
	       'rendered in '+ tstr + 's'+memstr+
	       '</div>');
  }

  var data = {
    mainDomain: appjet.mainDomain,
    appName: appjet.appName,
    statsDiv: statsDiv,
    encodedAppKey: appjet.encodedAppKey
  };

  var sourceLinkTemplate;
  if (appjet.isPreview) sourceLinkTemplate = _HTML_FOOTER_SOURCE_PREVIEW;
  else sourceLinkTemplate = _HTML_FOOTER_SOURCE_PUBLISH;
  data.sourceLink = supplant(data, sourceLinkTemplate);
  
  return [supplant(data, _HTML_FOOTER_TEMPLATE)];
}
