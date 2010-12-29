//----------------------------------------------------------------
// Global Functions
//----------------------------------------------------------------

$(document).ready(function() {
  Appjet.init();
});

if (!this["console"]) {
  console = {log: function() {}};
}

//----------------------------------------------------------------
// Appjet javascript object -- container for all appjet client-side javascript
//----------------------------------------------------------------

Appjet = {
  ace: null,
  jsvars: null
};

Appjet.init = function() {
  // wait for AppjetServerVars to load
  if (!Appjet.jsvars) {
    setTimeout(function() { Appjet.init(); }, 10);
    return;
  }
  // page-specific inits
  if ($('#appjet_code_window').length > 0) {
    Appjet.initCodeWindow();
  }
  if ($('#shellpage').length > 0) {
    Appjet.Shell.init();
  }
  if ($('#idepage').length > 0) {
    Appjet.IDE.init();
  }
  if ($('#sourcepage').length > 0) {
    Appjet.ViewSource.init();
  }
  if ($('.commentspage').length > 0) {
    Appjet.Comments.init();
  }
  if ($('#embidepage').length > 0) {
    Appjet.EmbIde.init();
  }
  if ($('#ltp_page').length > 0) {
    Appjet.Ltp.init();
  }
  // applies to all pages that contain obfuscated emails
  if ($('#obfuscemailcontainer').length > 0) {
    Appjet.deobfuscateEmails();
  }
  if ($('#librefouterpage').length > 0) {
    Appjet.maximizeHeight("librefwrapperframe", 0);
    Appjet.sizer(function() {
      Appjet.maximizeHeight("librefwrapperframe", 0);
    });
  }
};

//----------------------------------------------------------------
// Utils
//----------------------------------------------------------------

Appjet.signout = function() {
  $('#header_signout').submit();
};

Appjet.deleteApp = function(encodedId, name) {
  if (!confirm('Are you sure you want to delete the app "'+name+'"?  This action cannot be undone.')) {
    return;
  }
  var form = $('<form method="POST" action="/app/'+encodedId+'/delete" />');
  form.append('<input type="hidden" name="confirm" value="true" />');
  form.append('<input type="hidden" name="cont" value="'+window.location.href+'" />');
  $(document.body).append(form);
  form.submit();
};

Appjet.getAbsoluteOffsetTop = function(id) {
  var e = document.getElementById(id);
  var sum = e.offsetTop;
  while (e.offsetParent) {
    e = e.offsetParent;
    sum += e.offsetTop;
  }
  return sum;
};

Appjet.maximizeHeight = function(id, fudge) {
  if (!fudge) { fudge = -8; }
  var e = $('#'+id);
  var windowInnerHeight = Appjet.getWindowHeight();
  var eltNewHeight =  windowInnerHeight - Appjet.getAbsoluteOffsetTop(id) + fudge;
  // only set the height if it's different from what it should be.
  var eltOldHeight = e.height();
  if (eltOldHeight != eltNewHeight) {
    if (eltNewHeight > 0) {
      e.height(eltNewHeight);
    } else {
      // no need to log this anymore.  it happens normally when
      // element is hidden.
      //console.log("maximizeHeight error: computed size was negative ("+eltNewHeight+").");
    }
  }
};

Appjet.getWindowHeight = function() {
  return (document.documentElement.clientHeight ?
	  document.documentElement.clientHeight :
	  window.innerHeight);
};

Appjet.sizer = function(f) {
  function getdims() {
    var w = window.innerWidth || document.documentElement.clientWidth;
    var h = window.innerHeight || document.documentElement.clientHeight;
    return {w: w, h: h};
  }
  var last = getdims();
  function update() {
    var cur = getdims();
    if (cur.w != last.w || cur.h != last.h) {
      try {
	// currently caused by jquery getComputedStyle bug.
	f();
      } catch (e) {
	console.log('error in Appjet.sizer');
      }
      last = cur;
    }
  }
  setInterval(update, 500);
};

Appjet.setCookie = function(name, value, expiredays, path) {
  var c = (name + '=' + escape(value));
  if (expiredays) {
    var d = new Date();
    d.setDate(d.getDate() + expiredays);
    c += ';expires=' + d.toGMTString();
  }
  if (path) {
    c += (';path='+path);
  }
  document.cookie = c;
};

Appjet.getCookie = function(name) {
  var start, end;
  if (document.cookie.length < 1) { return ''; }
  start = document.cookie.indexOf(name + "=");
  if (start == -1) { return ''; }
  start = start + name.length + 1;
  end = document.cookie.indexOf(";", start);
  if (end == -1) { end = document.cookie.length; }
  return unescape(document.cookie.substring(c_start, c_end));
};

Appjet.timediff = function(t) {
  function format(n, word) {
    n = Math.round(n);
    return ('' + n + ' ' + word + (n != 1 ? 's' : '') + ' ago');
  }
  var d = ((new Date()).getTime() - t) / 1000;
  if (d < 60) { return "less than 1 minute ago"; }
  d /= 60;
  if (d < 60) { return format(d, 'minute'); }
  d /= 60;
  if (d < 24) { return format(d, 'hour'); }
  d /= 24;
  return format(d, 'day');
};

//----------------------------------------------------------------
// Appjet.initCodeWindow
//----------------------------------------------------------------
Appjet.initCodeWindow = function() {
  var encodedAppId = Appjet.jsvars.encodedAppId;
  var initialCode = encodedAppId ? '/* loading code... */' : '';
  var startModern = (Appjet.jsvars.useModernEditor == true);
  Appjet.ace = new AppjetCodeEditor();
  Appjet.ace.init('appjet_code_window', initialCode, startModern, function() {
    Appjet.finishCodeWindowInit(encodedAppId);
  });
};

Appjet.finishCodeWindowInit = function(encodedAppId) {
  function loadCode(code) {
    Appjet.ace.importCode(code);
    if (Appjet.jsvars.codeWindowReadOnly === 'true') {
      Appjet.ace.setEditable(false);
    }
  }

  if (encodedAppId && (!Appjet.jsvars.skipAppCodeInit)) {
    $.ajax({
          type: 'GET',
	  url: '/app/' + encodedAppId + '/rawcode',
	  success: loadCode,
	  error: function() { loadCode('/* error loading code */'); }
      });
  }
};

//----------------------------------------------------------------
// Appjet.Main (the main page)
//----------------------------------------------------------------

Appjet.Main = {};

Appjet.Main.dosubmit = function() {
  var code = Appjet.ace.exportCode();
  $('#appcodehiddeninput').val(code);
  $('#mainform').submit();
};

//----------------------------------------------------------------
// Appjet.ViewSource
//----------------------------------------------------------------

Appjet.ViewSource = {};
Appjet.ViewSource.init = function() {
};

//----------------------------------------------------------------
// Appjet.Comments
//----------------------------------------------------------------

Appjet.Comments = {};
Appjet.Comments.init = function() {};

Appjet.Comments.deleteComment = function(cid) {
  if (confirm("Are you sure you want to delete this comment?")) {
    $('#deleteCommentId').val(cid);
    $('#deletecommentform').submit();
  } else {
    return false;
  }
};

// linkId: ID of html node they just clicked on to create the reply box.
// whereId: ID of html node to put the response box after (unique).
// pid: ID of parent that this is a response to, or null if top-level.
Appjet.Comments.replyTo = function(linkId, whereId, pid) {
  //close all other replyboxes
  $('.commentsinput').each(function() {
    if (!$(this).is('.submittedok')) {
      $(this).hide('fast', function() {
	$(this).remove();
      });
    }
  });
  // show all other reply links
  $('.bottomlinks').show('fast');

  // hide the link they just clicked
  $('#'+linkId).parent().hide('fast');

  // render the form
  var responseDivClasses = "commentsinput";
  if (pid) { responseDivClasses += ' inlineresponse'; }
  if (!Appjet.jsvars.signedInUser) { responseDivClasses += ' signin'; }
  var responseFormHtml = (
    '<div class="'+responseDivClasses+'" id="inlinecommentinput'+whereId+'">'+
      '<div class="errmessage" id="errmessage'+whereId+'"></div>'+
      '<form action="/newcomment" method="POST">'
  );
  if (!Appjet.jsvars.signedInUser) {
    var contUrl = encodeURIComponent(window.location.href);
    responseFormHtml += (
      '<a href="/account/signin?cont='+contUrl+'">Sign In</a>'+
	' or '+
	'<a href="/account/signup?cont='+contUrl+'">Create an Account</a>'+
	' to post a comment.<br /><br />'
    );
  } else {
    if (pid) {
      responseFormHtml += (
	'<input type="hidden" name="parentCommentId" value="'+pid+'" />'
      );
    } else {
      responseFormHtml += (
	'<label for="subject">Subject (optional):</label>'+
	  '<input type="text" id="inputsubject'+whereId+'" class="inputsubject" name="subject" />'
      );
    }
    var responseLabel = pid ? "Response" : "Comment";
    responseFormHtml += (
      '<label for="commentbody">Your '+responseLabel+':</label>'+
	'<textarea id="inputbody'+whereId+'" class="inputbody" name="commentBody"></textarea>'+
	'<input type="submit" id="submitcomment'+whereId+'" value="Submit '+responseLabel+'" />'
    );
  }
  var discardLabel = Appjet.jsvars.signedInUser ? 'Discard' : 'Hide';
  responseFormHtml += (
    '<input type="submit" value="'+discardLabel+'" id="discardreply'+whereId+'"/>'+
      '</form>'
  );
  if (Appjet.jsvars.signedInUser) {
    responseFormHtml += '<p class="submitnote">You can edit or delete your comment up to 10 minutes after you submit it.</p>';
  }
  // append html
  tempId = 'temphiddenreply'+whereId;
  $('#'+whereId).after('<div id="'+tempId+'"></div>');
  $('#'+tempId).hide().html(responseFormHtml).show('fast', function() {
    $('#inputbody'+whereId).focus();
  });
  $('#discardreply'+whereId).click(function(e) {
    $('#'+tempId).hide('fast', function() {
      $('#inlinecommentinput'+whereId).remove();
    });
    $('#'+linkId).parent().show('fast');
    return false;
  });
  $('#submitcomment'+whereId).click(function(e) {
    var ajaxData = {
      commentBody: $('#inputbody'+whereId).val(),
      commentClass: Appjet.jsvars.commentClass,
      commentObject: Appjet.jsvars.commentObject
    };
    if (pid) {
      ajaxData.parentCommentId = pid;
    } else {
      ajaxData.subject = $('#inputsubject'+whereId).val();
    }
    $.ajax({
      type: 'POST',
      url: '/newcomment',
      data: ajaxData,
      success: commentOK,
      error: commentError
    });
    return false;
  });
  function commentOK(t) {
    window.location.href = t;
    window.location.reload();
  }
  function commentError(t) {
    $('#errmessage'+whereId).html(t.responseText);
  }
};

//----------------------------------------------------------------
// Appjet.IDE
//----------------------------------------------------------------

Appjet.IDE = {
  unsavedChanges: false,
  lastPublishedime: null,
  skipNextUnload: false
};

Appjet.IDE.init = function() {
  if ($.browser.msie) {
    $('#previewframe').css('overflow', 'hidden');
  }
  
  // multiselect tab selector
  $('#tabselector').multiSelect({
    selectAll: true,
    selectAllText: "Show all tabs",
    noneSelected: "",
    oneOrMoreSelected: ""
  }, Appjet.IDE.tabSelectorClick);

  if (Appjet.jsvars.publishedAgo) {
    Appjet.IDE.lastPublishedTime = (
      (new Date()).getTime() - Appjet.jsvars.publishedAgo);
  }
  Appjet.IDE.refreshAppName();
  Appjet.sizer(Appjet.IDE.rsz);
  Appjet.IDE.rsz();
  Appjet.ace.setOnKeyPress(function(e) { return true; });
  Appjet.ace.setNotifyDirty(function() {
    $('#savebutton').removeAttr('disabled');
    $('#savebutton').html('save');
    Appjet.IDE.unsavedChanges = true;
  });
  var handleKeyDown = function(e) {
    if (e.ctrlKey && e.keyCode === 83) {
      // CTR-S (save)
      Appjet.IDE.doSave(false);
      e.preventDefault();
      return false;
    }
    return true;
  };
  $(document).keydown(handleKeyDown);
  Appjet.ace.setOnKeyDown(handleKeyDown);  
  
  var previewNavUrl = $('#previewnavurl');
  previewNavUrl.val(Appjet.IDE.normalizePreviewURL(''));
  previewNavUrl.keyup(function(e) {
    var v = $('#previewnavurl').val();
    var normv = Appjet.IDE.normalizePreviewURL(v);
    if (v != normv) {
      $('#previewnavurl').val(normv);
    }
  });
  previewNavUrl.keydown(function(e) {  
    if (e.keyCode === 13) {
      Appjet.IDE.doPreview();
    }
  });
  previewNavUrl = null; // prevent IE 6 memory leak
  
  $(".skipunload").click(function() {
    if ($.browser.msie) {
      Appjet.IDE.skipNextUnload = true;
    }
  });
  window.onbeforeunload = function(e) {
    e = e ? e : (window.event ? window.event : null);
    if (!e) { return; }
    if (Appjet.IDE.skipNextUnload) {
      Appjet.IDE.skipNextUnload = false;
      return;
    }
    if (Appjet.IDE.unsavedChanges) {
      e.returnValue = "You have unsaved changes to your code.";
    }
  };
  // periodically update the last-published message
  setInterval(function() {
    Appjet.IDE.updateLastPublished();
  }, (1000 * 60));
  // bottom links
  if (Appjet.jsvars.useModernEditor) {
    $('#toggleplaintextlink').html('switch to plaintext editor');
  } else {
    $('#toggleplaintextlink').html('switch to fancy editor');
  }
  
  // click on submit to app directory
  $("#indirectory, #indirectorylabel").click(Appjet.IDE.directoryClick);

  // publish to your own domain details
  Appjet.IDE.refreshExtDomainStatus();
  $('#ext_domain_configure').click(function() {
    $('#ext_domain_configure').hide();
    $('#ext_domain_status').html("Configure Custom Domain:");
    $('#ext_domain_details').show();
    $('#ext_domain_cname').html(Appjet.jsvars.extDomainCname);
  });
  $('#ext_domain_verify').click(function() {
    Appjet.IDE.verifyExternalDomain();
  });
  
  // open preview pane by default
  Appjet.IDE.selectTab('preview');

  // bounce publish tab if necessary
  if (Appjet.jsvars.bouncePublishTab) {
    var a  = $('div#idetabs li#publishtab a');
    var hl;
    hl = function() {
      if (!$('#publishtab a').is('.current')) {
	a.effect('highlight', {color: '#f66'}, 1000, hl);
      }
    };
    hl();
  }

  // setting this CSS property now seems to leave the page with busy cursor
  // and/or spinning throbber for some reason
  setTimeout(function() { $('html').css('overflow', 'hidden'); }, 0);

  Appjet.NavShuttle.init();
}; // end Appjet.IDE.init()

Appjet.IDE.rsz = function () {
  Appjet.maximizeHeight('idemaintable', -20);
  Appjet.maximizeHeight('appjet_code_window', -20);
  $('#pane2 .pane').each(function() {
    if ($(this).css('display') != 'none') {
      $(this).height($('#appjet_code_window').height());
    }
  });
  Appjet.ace.adjustSize();
  // fix preview iframe size
  if (/current/.test($('#previewtab a').get(0).className)) {
    $('#previewframe').height($('#pane2').height() - $('#preview_topnav').height() - 4);
  }
  // fix log iframe size
  if (/current/.test($('#logtab a').get(0).className)) {
    $('#logframe').height($('#pane2').height() - $('#logframe_header').height() - 10);
  }
  // safari width gets confused
  if ($('#pane2').css('display') == 'none') {
    $('#pane1').css('width', '100%');
  } else {
    $('#pane1').css('width', '50%');
  }
};

Appjet.IDE.hideBrowserNote = function() {
  $('#browser_note').hide();
  Appjet.setCookie('browserNote', 'hide', 7, '/');
  Appjet.IDE.rsz();
}

Appjet.IDE.hideIdeMessage = function() {
  $('#ide_message').hide();
  Appjet.IDE.rsz();
};

Appjet.IDE.doSave = function(showTip, force, donefun) {
  if ($('#renameappinput').size() > 0) {
    Appjet.IDE.doRename();
    return;
  }

  if (Appjet.jsvars.transientApp && (force != true)) {
    Appjet.IDE.selectTab('account');
  } else {
    $('#savebutton').attr('disabled', 'true');
    $('#savebutton').html('saving...');
    $.ajax({
      type: 'POST',
      url: '/app/' + Appjet.jsvars.encodedAppId + '/commitsave',
      success: function(t) {
	Appjet.IDE.saveDone(t, showTip);
	if (typeof(donefun) == 'function') { donefun(); }
      },
      error: function (t) {
	Appjet.IDE.saveDone(t, false);
	$('#topmessage').html('Error: '+t.responseText);
	Appjet.IDE.unsavedChanges = true;
      },
      data: { appCode: Appjet.ace.exportCode() }
    });
  }
};

Appjet.IDE.saveDone = function(responseText, showTip) {
  Appjet.IDE.unsavedChanges = false;
  if (Appjet.jsvars.transientApp) {
    return;  // Does not apply to transient apps.
  }
  setTimeout(function() {
    $('#savebutton').html('saved').attr('disabled', 'true');
  }, 350);
  if (showTip) {
    $('#topmessage').html('&nbsp;&nbsp;Tip: you can also save by typing Control+S.');
  } else {
    $('#topmessage').html('');
  }
};

Appjet.IDE.renameApp = function() {
  $('#appname, #renamelink').hide();
  var nameInput = $('<input type="text" id="renameappinput" />');
  $('#renameinputspan').append(nameInput);
  nameInput.val(Appjet.jsvars.localAppName).focus().select();
  nameInput.keyup(function(e) {
      nameInput.val(Appjet.IDE.normalizeAppName(nameInput.val()));
    });
  nameInput.keydown(function(e) {
    if (e.keyCode === 13) {
      Appjet.IDE.doRename();
    }
  });
  $('#topmessage').html('Type a new name and press enter.');
  $('#savebutton').removeAttr('disabled');
  $('#savebutton').html('save');
};

Appjet.IDE.normalizeAppName = function(x) {
  x = x.toLowerCase();
  var normalized = '';
  for (var i = 0; i < x.length; i++) {
    if (((x.charAt(i) === '-') || (x.charAt(i) === ' ')) &&
	(i !== 0) &&
	(x.charAt(i-1) !== '-')) {
      normalized += '-';
    }
    if (x.charAt(i) >= 'a' && x.charAt(i) <= 'z') { normalized += x.charAt(i); }
    if (x.charAt(i) >= '0' && x.charAt(i) <= '9') { normalized += x.charAt(i); }
  }
  return normalized;
};

Appjet.IDE.doRename = function() {
  var renameInput = $('#renameappinput');
  var newName = renameInput.val();
  if (newName.charAt(newName.length - 1) === '-') {
    newName = newName.substr(newName, newName.length - 1);
  }
  renameInput.val(newName);

  $('#topmessage').html('Renaming...');

  if (newName !== Appjet.jsvars.localAppName) {
    $.ajax({
      type: 'POST',
      url: '/app/' + Appjet.jsvars.encodedAppId + '/rename',
      success: renameSuccess,
      error: renameError,
      data: { newName: newName }});
  } else {
    Appjet.IDE.refreshAppName();
  }

  function renameSuccess(responseText) {
    if (responseText === 'OK') {
      Appjet.jsvars.localAppName = newName;
      Appjet.IDE.refreshAppName();
    } else {
      $('#topmessage').html(responseText);
    }
  }

  function renameError(responseText) {
    $('#topmessage').html('Error renaming app.');
  }
};

Appjet.IDE.refreshAppName = function() {
  $('#renameinputspan').empty();
  $('#topmessage').html('');
  $('#previewnavurl').val(Appjet.IDE.normalizePreviewURL(''));
  document.title = ("IDE: "+Appjet.jsvars.localAppName);

  if (Appjet.jsvars.publishedAppName) {
    $('#renamelink').hide();
    $('#appname').html(Appjet.jsvars.publishedAppName+'.'+Appjet.jsvars.engineHost).show();
  } else {
    if (Appjet.jsvars.transientApp) {
      $('#appname').hide();
      $('#renamelink').hide();
      $('#topmessage').html('This app is unsaved.');
    } else {
      $('#appname').html(Appjet.jsvars.localAppName).show();
      $('#renamelink').css('display', 'inline').html('(rename)').show();
    }
  }
};

Appjet.IDE.togglePlaintextEditor = function() {
  var c;
  if ((!Appjet.jsvars.supportedModernBrowser) &&
      (!Appjet.jsvars.useModernEditor)) {
    if (!confirm("Your browser is not fully supported.  Would you like to"+
		 " proceed anyway?")) {
      return;
    }
  }
  Appjet.jsvars.useModernEditor = !Appjet.jsvars.useModernEditor;
  Appjet.ace.toggleModernImpl();
  if (Appjet.jsvars.useModernEditor) {
    cookiepref = 'true';
    $('#toggleplaintextlink').html('switch to plaintext editor');
  } else {
    cookiepref = 'false';
    $('#toggleplaintextlink').html('switch to fancy editor');
  }
  // update cookie
  Appjet.setCookie('useModernEditor', cookiepref, 14, '/');
};

/*---- ide tabs ----*/

Appjet.IDE.tabSelectorClick = function(input) {
  var tabname = input.val();
  if (tabname == "__all") {
    if (input.attr('checked')) {
      $('div#idetabs li').show();
    } else {
      $('div#idetabs li').hide();
      Appjet.IDE.hideSidePane();
    }
  }
  if (input.attr('checked')) {
    $('li#'+tabname+'tab').show();
  } else {
    $('li#'+tabname+'tab').hide();
  }
//  console.log(o.val() + " | " + o.attr('checked'));
};

// happens when users clicks on a tab link
Appjet.IDE.selectTab = function(tabName) {
  var t = $('#'+tabName+'tab a').get(0);
  if (t && /current/.test(t.className)) {
    Appjet.IDE.hideSidePane();
  } else {
    $('#hidesidepanelink').show();
    $('#idepage div#idetabs ul li a').removeClass('current');
    if (tabName != 'accountpange') {
      $('#'+tabName+'tab a').addClass('current');
    }
    Appjet.IDE.showSidePane(tabName);
  }
  Appjet.IDE.rsz();
  if (tabName == 'shell') {
    // scroll shell pane down
    var shellOutput = $('#shellframe').get(0).contentWindow.document.getElementById('output');
    if (shellOutput) {
      shellOutput.scrollTop = shellOutput.scrollHeight;
      // focus on shell's ace
      var shellWindow = $('#shellframe').get(0).contentWindow;
      shellWindow.Appjet.ace.focus();
    }
    // (else the shell iframe must not have loaded yet)
  }
};

Appjet.IDE.showSidePane = function(paneName) {
  // FF and IE differ in whether this is 'table-cell' or 'block'
  var displayAttr = $('#pane1').css('display');
  $('#pane1, #pane2').css('display', displayAttr).attr('width', '50%')
  .css('width', '50%');
  // show the content pane dives
  $('#pane2 .pane').hide();
  $('#pane2 #'+paneName+'pane').show();

  if (paneName === 'shell') {
    Appjet.IDE.activateShell();
  }
  if (paneName == 'log') {
    Appjet.IDE.activateLog();
  }
  if (paneName === 'preview') {
  }
  if (paneName === 'publish') {
    Appjet.IDE.refreshPublishPane();
  }
  if (paneName == 'account') {
    $('#accountframe_save').width($('#pane2').width() - 20);
    $('#accountframe_save').height($('#pane2').height() - 20);
    $('#accountframe_save').get(0).contentWindow.location =
      "https://"+Appjet.jsvars.frontendHost+"/account/idesignup";
  }
  Appjet.IDE.rsz();
};

Appjet.IDE.hideSidePane = function() {
  // hide the pane
  $('#previewframewrapper, #shellframewrapper').hide();
  $('#pane2').css('display', 'none').css('width', '0%');
  // hide the hide button itself
  $('#hidesidepanelink').css('display', 'none');
  // deselect tabs
  $('#idepage div#idetabs ul li a').removeClass('current');
  Appjet.maximizeHeight('idemaintable', -8);
  Appjet.IDE.rsz();  
};

Appjet.IDE.activateShell = function() {
  if ($('#shellframe').length == 0) {
    var src = '/app/' + Appjet.jsvars.encodedAppId + '/shell?inline=true';
    $('#shellpane').html(
      '<iframe name="shellframe" frameBorder="0" id="shellframe" src="'+src+'"></iframe>');
  }
};

Appjet.IDE.activateLog = function() {
  var url = ('http://engine.' + Appjet.jsvars.engineHost +
	     '/engine/dashboard/' + Appjet.jsvars.encodedAppId + '/');
  if ($('#logframe').length == 0) {
    $('#logpane').html(
      '<div id="logframe_header">Debug Log '+
	'(<a class="skipunload" target="_blank" href="'+url+
	'">popout</a>):</div>' +
	'<iframe name="logframe" frameBorder="0" id="logframe" src="'+
	url+'?inline=true"></iframe>');
  } else {
    // refresh log?
  }   
};

Appjet.IDE.updateLastPublished = function() {
  if (Appjet.IDE.lastPublishedTime) {
    $('#lastpublished').html('Last published: '+Appjet.timediff(Appjet.IDE.lastPublishedTime));
  } else {
    $('#lastpublished').html('&nbsp;');
  }
};

Appjet.IDE.refreshPublishPane = function() {
  Appjet.IDE.updateLastPublished();
  if (Appjet.jsvars.publishedAppName) {
    var url = 'http://'+Appjet.jsvars.publishedAppName+'.'+Appjet.jsvars.engineHost;
    $('#publishstatus').html('Live at <a target="_blank" href="'+url+'">'+url+'</a>.').show();
  } else {
    $('#publishstatus').html('<span class="notpublished">Not published.</span>').show();
  }
  $('#publishapphost').html(Appjet.jsvars.engineHost);
  var nameInput = $('#publishedappname');
  nameInput.val(Appjet.jsvars.localAppName);
  nameInput.keyup(function(e) {
      nameInput.val(Appjet.IDE.normalizeAppName(nameInput.val()));
    });
  // disable form controls for transient apps
  if (Appjet.jsvars.transientApp) {
    $("#ext_domain_publishbox").hide();
    $("#publishedappname, #indirectory, #inprofile, #publishbutton, #ext_domain_configure")
    .attr('disabled', 'true');
    $("#publishsignupnote").show();
    $('#accountframe_pub').height(400);
    $('#accountframe_pub').get(0).contentWindow.location =
      "https://"+Appjet.jsvars.frontendHost+"/account/idesignup";
  } else {
    $("#systemnote").show();
  }
};

Appjet.IDE.normalizePreviewURL = function(x) {
  if (x == "???") {  // special case for off-site urls set by navshuttle.
    return x;
  }
  var requiredPrefix = 'http://'+Appjet.jsvars.localAppName+'.'+Appjet.jsvars.engineHost+'/';
  if (x.indexOf(requiredPrefix) === -1) {
    return requiredPrefix;
  } else {
    return x;
  }
};

Appjet.IDE.doPreview = function() {
  $('#previewstartmessage').hide();
  $('#previewframe').show();
  $('#runform').attr({'target': 'previewframe',
	'action': ('/app/' + Appjet.jsvars.encodedAppId + '/previewandrun'),
	'method': 'POST'});
  $('#input_hidden_code').val(Appjet.ace.exportCode());
  var relpath = $('#previewnavurl').val();
  //if (relpath == "???") relpath = "/";
  relpath = $.trim(relpath.replace(/^http\:\/\/[^\/]*\//, ''));
  $('#input_preview_nav_path').val(relpath);
  $('#runform').submit();
  Appjet.IDE.saveDone();
};

Appjet.IDE.directoryClick = function() {
  if ($('#indirectory').attr('checked')) {
    $('#directoryabout').show();
  } else {
    $('#directoryabout').hide();
  }
};

Appjet.IDE.doPublish = function() {
  $('#publishstatus').removeClass('publisherror').html('Publishing...');
  $('#publishprogress, #statusballpublish').css('display', 'inline');
  $('#publishbutton, #directoryabouttext').attr('disabled', 'true');

  var newAppName = $('#publishedappname').val();
  var inProfile = ($('#inprofile').attr('checked') == true);
  var inDirectory = ($('#indirectory').attr('checked') == true);
  var directoryAbout = "";
  if (inDirectory) {
    directoryAbout = $('#directoryabouttext').val();
  }
  
  $.ajax({
    type: 'POST',
    url: ('/app/'+Appjet.jsvars.encodedAppId+'/publish'),
    data: { newAppName: newAppName,
	    appCode: Appjet.ace.exportCode(),
	    inProfile: inProfile,
	    inDirectory: inDirectory,
	    directoryAbout: directoryAbout
	  },
    success: publishSuccess,
    error: publishError });
  
  function publishSuccess(responseText) {
    $('#publishbutton, #directoryabouttext').removeAttr('disabled');
    $('#statusballpublish, #publishprogress').hide();
    if (responseText == 'OK') {
      Appjet.IDE.lastPublishedTime = (new Date()).getTime();
      Appjet.jsvars.localAppName = newAppName;
      Appjet.jsvars.publishedAppName = newAppName;
      Appjet.IDE.refreshPublishPane();
      Appjet.IDE.refreshAppName();
      Appjet.IDE.saveDone();
    } else {
      $('#publishstatus').html(responseText).addClass('publisherror').show();
    }
  }

  function publishError(xhr) {
    $('#publishbutton, #directoryabouttext').removeAttr('disabled');
    $('#statusballpublish, #publishprogress').hide();    
    if (xhr.responseText) {
      $('#publishstatus').html('Error: '+xhr.responseText);
    } else {
      $('#publishstatus').html('Error: contacting AppJet publishing service.');
    }
    $('#publishstatus').addClass('publisherror').show();
  }
};

Appjet.IDE.revertToPublished = function() {
  if (!confirm("This will replace the code you are currently editing with"+
	       " the version of the code you last published, discarding"+
	       " any changes you have made since you last published. "+
	       " Are you sure you want to proceed?")) {
    return;
  }
  if (!Appjet.jsvars.publishedAppName) {
    $('#topmessage').html('App has never been published!  You cannot revert to published code.');
    return;
  }
  $.ajax({
    type: 'GET',
    url: ('/app/'+Appjet.jsvars.encodedAppId+'/source?plaintext=1'),
    success: success,
    error: error
  });
  function success(responseText) {
    Appjet.ace.importCode(responseText);
  }
  function error(xhr) {
    $('#topmessage').html('Error retreiving published code.');
  }
};

Appjet.IDE.refreshExtDomainStatus = function() {
  $('#ext_domain_error').html('');
  $('#ext_domain_details').hide();
  $('#ext_domain_configure').show();
  if (Appjet.jsvars.extDomain) {
    $('#ext_domain_status').html(
      'Also hosted at <a target="_blank" href="http://'+
	Appjet.jsvars.extDomain+'/">http://'+Appjet.jsvars.extDomain+'/</a>.');
  } else {
    $('#ext_domain_status').html("Custom domain not configured.");
  }
};

Appjet.IDE.verifyExternalDomain = function() {
  $('#ext_domain_error').html('');
  $('#statusball_extdomain').css('display', 'inline');
  var extDomain = $('#ext_domain_input').val();
  $.ajax({
    type: 'POST',
    url: '/app/' + Appjet.jsvars.encodedAppId + '/verifyextdomain',
    data: { extDomain: extDomain },
    success: function(t) {
      $('#statusball_extdomain').hide();
      Appjet.jsvars.extDomain = extDomain;
      Appjet.IDE.refreshExtDomainStatus();
    },
    error: function (t) {
      $('#statusball_extdomain').hide();
      $('#ext_domain_error').html('Error: '+t.responseText);
    }
  });
};

//================================================================
// nav-shuttle

Appjet.NavShuttle = {
  previewDomain: null
};

Appjet.NavShuttle.init = function() {
  // dont do anything if there is no nav bar.
  if ($('#previewnavurl').length != 1) {
    return;
  }
  
  var lastPreviewDomain = null;
  function loadShuttleFrame() {
    var updateUrl = ('http://'+Appjet.jsvars.frontendHost+'/app/'+
		     Appjet.jsvars.encodedAppId+'/navshuttleupdate');
    var shuttleUrl = ('http://'+Appjet.NavShuttle.previewDomain+
		      '/supersecrethiddenpathforidepathupdationwhee/yeah/like/i/said');
    var shuttleCode = [
      '<html>',
      '<body>',
      ('<textarea style="'+
       ' display: none;'+
//       ' width: 100%; height: 200px; border: 1px solid blue;'+
       '" '),
      'id="debug">debug:</textarea>',
      '<iframe name="innernavshuttle" id="innernavshuttle" src="about:blank" ',
      'style="width: 1px; height: 1px;">',
//      'style="border: 1px solid green;">',      
      '</iframe>',
      '<form id="shuttleform" method="GET" action="'+updateUrl+'" target="innernavshuttle">',
      '<input type="hidden" name="navpath" id="navpath" value="foo" />',
      '</form>',
      '<script>',
      'function debug(m) {',
      '  var t = document.getElementById("debug");',
      '  t.value = t.value + "\\n" + m;',
      '}',
      'debug("shuttleFrame exists.");',
      'function updateNavPath(np) {',
      '  if (!np) np = "???";',
      '  document.getElementById("navpath").value = np;',
      '  document.getElementById("shuttleform").submit();',
      '}',
      'window.lastPreviewHref = null;',
      'setInterval(function() {',
      ' try {',
      '  var previewFrame = parent.frames.previewframe;',
      '  if (!previewFrame) {',
      '    return debug("could not locate previewFrame");',
      '  }',
      '  var previewHref = previewFrame.window.location.href;',
      '  if (previewHref != window.lastPreviewHref) {',
      '    window.lastPreviewHref = previewHref;',
      '    debug("previewHref changed to: "+previewHref);',
      '    updateNavPath(previewHref);',
      '  }',
      ' } catch (e) { debug("exception: "+e.message);}',
      '}, 100);',
      '</script>',
      '</body>',
      '</html>'
    ].join('\n');

    $('#previewnavshuttleform').attr('action', shuttleUrl);
    $('#previewnavshuttleform input#theText').val(shuttleCode);
    $('#previewnavshuttleform').submit();
  }
  function tick() {
    if (Appjet.NavShuttle.previewDomain != lastPreviewDomain) {
      //console.log("previewDomain changed to: "+Appjet.IDE.previewDomain);
      lastPreviewDomain = Appjet.NavShuttle.previewDomain;
      //console.log("loading new shuttle iframe...");
      loadShuttleFrame();
    }
  }
  setInterval(function() {
    try { tick(); }
    catch (e) { console.log("tick threw exception: "+e); }
  }, 100);
};

//----------------------------------------------------------------
// Appjet Shell
//----------------------------------------------------------------

Appjet.Shell = {
 keepaliveIntervalTime: 240000, /* 4 minutes */
 commandCount: 0
};

Appjet.Shell.fixOutputHeight = function() {
  var fudge = 18;
  if (!/inline\=true/.test(window.location.toString())) {
    fudge += ($('#shelltitle').height());
  }
  fudge += $('#promptlabel').height();
  fudge += $('#appjet_code_window').height();
  fudge += $('#rundiv').height();
  Appjet.maximizeHeight('output', -fudge);
};

Appjet.Shell.init = function() {
  $('#statusballrun').hide();
  $('#statusballinit').css('display', 'inline');
  $('html').css('overflow', 'hidden');
  Appjet.sizer(Appjet.Shell.fixOutputHeight);

  function ajaxDone(responseText) {
    Appjet.Shell.sessionId = $.trim(responseText);
    $('#statusballinit').hide();
    $('#initmessage').hide();
    $('#shellpagecontent').show();
    Appjet.ace.importCode('/* type your command here */');
    Appjet.ace.focus();
    Appjet.Shell.fixOutputHeight();
    // start keepalive
    Appjet.Shell.keepaliveInterval = setInterval(Appjet.Shell.keepalive,
						 Appjet.Shell.keepaliveIntervalTime);

    Appjet.ace.setOnKeyPress(function(e) {
	if (e.shiftKey && e.keyCode === 13) {
	  Appjet.Shell.exec();
	  return false;
	} else {
	  return true;
	}
    });
  }

  function ajaxError(xhr, errstr) {
    $('#statusballinit').hide();
    $('#initmessage').html('Error contacting AppJet Engine: '+errstr+'<br /><br />');
  }

  $.ajax({
        type: 'POST',
	url: ('/engine/shell/' + Appjet.jsvars.encodedAppId),
	data: {keepalive: true},
	success: ajaxDone,
	error: ajaxError });
};

Appjet.Shell.keepalive = function() {
  // best-effort; ignores response
  $.ajax({
        type: 'POST',
	url: '/engine/shell/' + Appjet.jsvars.encodedAppId,
	data: {'shellSessionID': Appjet.Shell.sessionId}});
};

/* returns a list of [{type: output/result/error, text: theText}] */
Appjet.Shell.parseExecResponse = function(responseText) {
  var histList = [];
  var type;
  var text;
  var error;
  var errorText;

  var engineResponse = eval('('+responseText+')'); // trusted json

  if ('output' in engineResponse) {
    histList.push({type: 'output', text: engineResponse.output });
  }
  if ('result' in engineResponse) {
    histList.push({type: 'result', text: engineResponse.result });
  }
  if ('error' in engineResponse) {
    error = engineResponse.error;
    errorText = error.type + ': ' + error.message;
    if (error.lineNumber && error.sourceName) {
      $('#cmd_' + error.sourceName + '_line_' + error.lineNumber).addClass('offendingline');
    }
    histList.push({type: 'error', text: errorText});
  }

  return histList;
};

Appjet.Shell.exec = function() {
  var formattedCode = Appjet.ace.getFormattedCode();
  var plainCode = Appjet.ace.exportCode();

  if ($.trim(plainCode).length === 0) {
    return;
  }
  
  $('#statusballrun').css('display', 'inline');
  $('#runbutton').attr('disabled', 'true');
  $('#inputwrapper').css('background-color', "#ccc");
  Appjet.ace.setEditable(false);
  var commandDiv = createCommandDiv(formattedCode);
  
  function divclass(className) {
    return $('<div />').addClass(className);
  }

  function createCommandDiv(formattedCode) {
    Appjet.Shell.commandCount++;
    var commandDiv = $('<div />');
    var lineLength;
    var id;
    var lineDiv;
    
    var lines = formattedCode.split(/\<[bB][rR][\s\/]*\>/);
    for (var lineNum = 1; lineNum < lines.length+1; lineNum++) {
      lineLength = lines[lineNum-1].length;
      if ((lineNum == lines.length) && (lineLength === 0)) {
	// skip last empty line
	continue;
      }
      id = 'cmd_'+Appjet.Shell.commandCount+'_line_'+lineNum;
      lineDiv = $('<div />').attr('id', id).html(lines[lineNum-1]);
      if (lineLength === 0) {
	// make other empty lines appear
	lineDiv.html('&nbsp;');
      }
      commandDiv.append(lineDiv);
    }
    return commandDiv;
  }
  
  function execDone(responseText) {
    $('#statusballrun').hide();
    $('#runbutton').attr('disabled', '');
    $('#inputwrapper').css('background-color', '#ffffff');
    Appjet.ace.setEditable(true);

    // display command
    var cmd = createHistoryDom('command', commandDiv);

    $('#output').append(divclass('sep')).append(cmd).append(divclass('clearfloats'));

    // display output/result/error
    var historyBlocks = Appjet.Shell.parseExecResponse($.trim(responseText));
    var block;
    var blockDom;
    for (var i in historyBlocks) {
      block = historyBlocks[i];
      blockDom = createHistoryDom(block.type, block.text);
      $('#output').append(blockDom);
    }

    // reset code buffer
    Appjet.ace.importCode('');
    Appjet.ace.focus();

    var output = $('#output')[0];
    output.scrollTop = output.scrollHeight * 2;
  }

  function execError(xhr) {
    execDone("{error: {type: 'Connection Error', message: 'Could not contact the AppJet engine.'}}");
  }

  $.ajax({type: 'POST',
	    url: '/engine/shell/' + Appjet.jsvars.encodedAppId,
	    success: execDone,
	    error: execError,
	    data: {shellSessionID: Appjet.Shell.sessionId,
	           code: Appjet.ace.exportCode(),
	           sourceName: Appjet.Shell.commandCount}});
  
  /* type in {command, output, result, error} to match style sheets */
  function createHistoryDom(type, value) {
    var plainCodeSave = plainCode;
    if (type == 'result') {
      value = '<b>=</b>&nbsp;' + value;
    }
    var content = $('<div />').addClass('outputcontent').addClass('cmd'+type).html(value);

    if (type == 'command') {
      content.hover(function() { content.css('background-color', '#ffffa9'); },
		    function() { content.css('background-color', '#eeeeee'); });
      content.click(function() {
	  Appjet.ace.importCode(plainCodeSave);
	  Appjet.ace.focus();
	});
    }

    //return $('<div />').addClass('outputblock').append(historyHeader).append(content);
    return $('<div />').addClass('outputblock').append(content);
  }
};

//----------------------------------------------------------------
// E-mail deobfuscation
//----------------------------------------------------------------

Appjet.deobfuscateEmails = function() {
  $("#obfuscemailcontainer").find("a.obfuscemail").each(function() {
    $(this).html($(this).html().replace('a**j**','appjet'));
    this.href = this.href.replace('a**j**','appjet');
  });
}

//----------------------------------------------------------------
// Embedded IDE
//----------------------------------------------------------------

Appjet.EmbIde = {
  originalCode: ''
};

Appjet.EmbIde.init = function() {
  document.body.scroll = "no";
  if ($.browser.msie) {
    $('#previewframe').css('overflow', 'hidden');
  }
  Appjet.EmbIde.welcome = true;
  Appjet.ace.importCode(Appjet.jsvars.appCode);
  Appjet.EmbIde.originalCode = Appjet.jsvars.appCode;
  Appjet.EmbIde.rsz();
  if ($('#previewnavurl').length > 0) {
    Appjet.jsvars.localAppName = '<untitled>';
    var previewNavUrl = $('#previewnavurl');
    previewNavUrl.val(Appjet.IDE.normalizePreviewURL(''));
    previewNavUrl.keyup(function(e) {
      previewNavUrl.val(Appjet.IDE.normalizePreviewURL(previewNavUrl.val()));
    });
    previewNavUrl.keydown(function(e) {  
      if (e.keyCode === 13) {
	Appjet.EmbIde.run();
      }
    });
    previewNavUrl = null; // prevent IE 6 memory leak
  }
  setInterval(Appjet.EmbIde.rsz, 1000);
  Appjet.NavShuttle.init();
  if (Appjet.jsvars.runImmediately) {
    setTimeout(function() {
      Appjet.EmbIde.run();
    });
  } else {
    Appjet.ace.focus();
  }
  // hide editable notice
  if (parent && parent.document && parent.document.getElementById('editable_arrow')) {
    var ea = $(parent.document.getElementById('editable_arrow_div'));
    Appjet.ace.setOnKeyPress(function() {
      if (ea) {
        setTimeout(function() { if (ea) { ea.hide('slow'); ea = null; } }, 1000);
      }
      return true;
    });
  }
};

Appjet.EmbIde.rsz = function() {
  var h = Number(Appjet.jsvars.codeHeight)+5;
  $('#appjet_code_window').css('height', h+'px');
  if (Appjet.jsvars.showUrlBar) {
    h -= 20;
  }
  $('#emptypreview, #previewframe').css('height', h+'px');
  
  /*
  var bottomPad = 16;
  Appjet.maximizeHeight('appjet_code_window', -bottomPad);
  if ($('#emptypreview').css('display') != 'none') {
    Appjet.maximizeHeight('emptypreview', -bottomPad);
  } else {
    Appjet.maximizeHeight('previewframe', -bottomPad);
  }
  Appjet.ace.adjustSize();
*/
};

Appjet.EmbIde.writeTransient = function(donefunc) {
  // ajax request to get a transient app for this ide session.
  $.ajax({
    type: 'POST',
    url: '/app/-/embide_maketransient',
    success: function(t) {
      Appjet.jsvars.encodedAppId = +t;
      donefunc();
    },
    error: function(xhr, m) {
      alert('Error creating transient app: '+xhr.responseText);
    },
    data: {hoopty: true} // testing possible proxy weirdness that requires data on POSTS.
  });
};

Appjet.EmbIde.run = function() {
  function doRun() {
    if (!Appjet.jsvars.encodedAppId) {
      Appjet.EmbIde.writeTransient(function() {
	Appjet.EmbIde.previewAndRun();
      });
    } else {
      Appjet.EmbIde.previewAndRun();
    }
  }

  if (Appjet.EmbIde.welcome) {
    Appjet.EmbIde.welcome = false;
    $('#bigarrowwrapper').hide('slow', function() {
      Appjet.EmbIde.rsz();
      $('a.runlink').show();
      doRun();
      Appjet.EmbIde.rsz();
    });
  } else {
    doRun();
  }
};

Appjet.EmbIde.runAgain = function() {
  $('#previewnavurl').val(Appjet.IDE.normalizePreviewURL(''));
  Appjet.EmbIde.run();
};

Appjet.EmbIde.previewAndRun = function() {  
  $('#emptypreview').hide();
  $('#previewframe').show();
  Appjet.EmbIde.rsz();
  $('#runform').attr('action', ('/app/' + Appjet.jsvars.encodedAppId + '/previewandrun'));
  if ($('#previewnavurl').length > 0) {
    var relpath = $('#previewnavurl').val();
    relpath = $.trim(relpath.replace(/^http\:\/\/[^\/]*\//, ''));
    $('#runform #input_preview_nav_path').val(relpath);
  }
  $('#runform #input_hidden_code').val(Appjet.ace.exportCode());
  $('#runform').submit();
};

Appjet.EmbIde.doClone = function() {
  $('#cloneform_code_input').val(Appjet.ace.exportCode());
  $('#cloneform').submit();
};

Appjet.EmbIde.revert = function() {
  var msg = ("Are you sure you want to restore?  "+
	     "This will discard any changes you have made to this example"+
	     " code, and replace the code buffer with the original example.");
  if (confirm(msg)) {
    Appjet.ace.importCode(Appjet.EmbIde.originalCode);
  }
};

Appjet.EmbIde.clearStorage = function() {
  var msg = ("Are you sure you want to clear storage?  \n\n"+
	     "This will delete any data stored in your app's storage database.");
  if (!confirm(msg)) {
    return;
  }
  $('#emptypreview').hide();
  $('#previewframe').show();
  $('a.runlink').show();
  Appjet.EmbIde.rsz();
  var appId = '-';
  if (Appjet.jsvars.encodedAppId) {
    appId = Appjet.jsvars.encodedAppId;
  }
  $('#clearstorageform').attr('action', '/app/'+appId+'/clearstorage');
  $('#clearstorageform').submit();
};

//----------------------------------------------------------------
// Learn To Program pages
//----------------------------------------------------------------
Appjet.Ltp = {};

Appjet.Ltp.init = function() {
  function convertExpandyNote(d) {
    var expandText = "More&hellip;";
    var collapseText = "(Hide)";
    $(d.children().get(0)).append('<a class="morelink">'+expandText+'</a>');
    d.addClass('closed_expandy_note');
    // click anywhere in the expandy note
    d.click(function() {
      if (d.is('.closed_expandy_note')) {
	// expand
	d.children(".body").slideToggle("fast");
	d.removeClass('closed_expandy_note');
	d.find("a.morelink").html(collapseText);
	if (d.is('.morelink')) {
    return false; // stop event bubbling
	} else {
	  return true; // allow event bubbling for links in the first sentence
	}
      } else {
	return true; // allow event bubbling
      }
    });
    // click on the 1st paragraph
    $(d.children().get(0)).click(function() {
      if (!d.is('.closed_expandy_note')) {
	// collapse
	d.children(".body").slideToggle("fast");
	d.addClass('closed_expandy_note');
	d.find("a.morelink").html(expandText);
	return false; // stop event bubbling
      }
      $(d.children().get(0)).css('cursor', 'pointer');
      return true;
    });
  }
  $('#ltp_page div.expandy_note').each(function() {
    convertExpandyNote($(this));
  });
};

Appjet.Ltp.loadEmbIde = function(exampleName, codeWidth, codeHeight, frameHeight, showUrlBar, runImmediately, appUsesStorage) {
  wrapper = $('#example_'+exampleName);
  wrapper.html('<div style="text-align: center; padding-top: 40px; font-size: 140%;">'+
	       'loading...</div>');

  codeHeight = Number(codeHeight);
  frameHeight = Number(frameHeight) + 2;
  
  var url = ('/app/-/embide?exampleName='+exampleName+
	     '&codePaneWidth='+codeWidth+
	     '&codeHeight='+codeHeight+
	     '&showUrlBar='+showUrlBar+
	     '&runImmediately='+runImmediately+
	     '&appUsesStorage='+appUsesStorage);
  
  var id = ("safaridontcachemyfuckingiframes"+(new Date()).getTime());
  
  wrapper.html(
    '<iframe id="'+id+' "scrolling="no" class="embide" width="100%" '+
      'frameborder="0" allowtransparency="true" '+
      'style="height: '+frameHeight+'px;" '+
      'src="'+url+'"></iframe>');
};

Appjet.Ltp.selectTab = function(ui) {
  window.location.href = window.location.href.split('#')[0] + '#' + ui.panel.id;
  if (ui.panel.id == 'lesson') {
    setTimeout(function() {
      console.log('fixing sizes of all embedded ides...');
      $('iframe.embide').each(function() {
	console.log('fixing '+window.location.href);
	this.contentWindow.Appjet.EmbIde.rsz();
      });
    }, 1);
  }
};

Appjet.Ltp.cloneExample = function(exampleName) {
  $('#fakeide_clone_form_example_name').val(exampleName);
  $('#fakeide_clone_form').submit();
};
