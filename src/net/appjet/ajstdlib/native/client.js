/**
 * @author zamfi
 *
 * Simple server-push lib.
 */
 
function WebSocket(id) {
  var self = this;
  var channelPath = "/newcomet/channel?id="+id;
  var postPath = "/newcomet/post?id="+id;
    
  var createRequestObject = function() {
    var xmlhttp=false;
    /*@cc_on @*/
    /*@if (@_jscript_version >= 5)
    // JScript gives us Conditional compilation, we can cope with old IE 
    // versions and security blocked creation of the objects.
     try {
      xmlhttp = new ActiveXObject("Msxml2.XMLHTTP");
     } catch (e) {
      try {
       xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
      } catch (E) {
       xmlhttp = false;
      }
     }
    @end @*/
    if (!xmlhttp && typeof XMLHttpRequest!='undefined') {
    	try {
    		xmlhttp = new XMLHttpRequest();
    	} catch (e) {
    		xmlhttp=false;
    	}
    }
    if (!xmlhttp && window.createRequest) {
    	try {
    		xmlhttp = window.createRequest();
    	} catch (e) {
    		xmlhttp=false;
    	}
    }
    return xmlhttp
  }         

  var theRequest;
  var cursor;
  var streamHandler = function() {
    while (true) {
      if (! theRequest.responseText)
        break;
      var newData = theRequest.responseText.substr(cursor);
      if (newData.length == 0)
        break;
      var sep = newData.indexOf(":");
      if (sep == -1)
        break
      var count = parseInt(newData.substr(0, sep));
      var rest = newData.substr(sep+1)
      if (rest.length < count)
        break;
      cursor += count+sep+1;
      dataHandler(rest);
    }
    if (theRequest.readyState == 4) {
      self.readyState = self.CLOSED;
      self.onclosed({});
    }
  }

  var iframeHandler = function(data) {
    dataHandler(data);
  }
  
  var connectionConfirmed = false;
  var dataHandler = function(data) {
    if (! connectionConfirmed) {
      if (data == "ok") {
        connectionConfirmed = true;
        self.readyState = self.OPEN;
        self.onopen({});
      } else {
        self.disconnect();
      }
    } else {
      self.onmessage({data: data});
    }
  }

  var ifrDiv = false;
  this.connect = function() {
    self.readyState = self.CONNECTING;
    try {
      var streamurl = channelPath + "&type=iframe"
      theRequest = new ActiveXObject("htmlfile")
//        alert(theRequest.parentWindow.foo == alert)
      theRequest.open();
      theRequest.write("<html>")
      theRequest.write("<script>document.domain</script>")
      theRequest.write("</html>")
      theRequest.close();
      ifrDiv = theRequest.createElement("div")
      theRequest.appendChild(ifrDiv)
      theRequest.parentWindow.pass_data = iframeHandler;
      ifrDiv.innerHTML = "<iframe src='"+streamurl+"'></iframe>"
    } catch (e) {
//        alert("IE setup failed!!")
      theRequest = false
    }
    if (! theRequest) {
      cursor = 0
      theRequest = createRequestObject();
      theRequest.open('GET', channelPath, true);
      theRequest.setRequestHeader("Connection", "close")
      theRequest.onreadystatechange = streamHandler;
      theRequest.send(null)
    }
  }

  this.disconnect = function() {
    if (ifrDiv) {
      ifrDiv.innerHTML = ""
    } else if (theRequest) {
      theRequest.abort()
    }
    delete theRequest
    self.readyState = self.CLOSED;
    self.onclosed({});
  }
  
  function SimpleQueue() {
    var base = [];
    var head = 0;
    var tail = 0;
    this.offer = function(data) {
      base[tail++] = data;
    }
    this.poll = function() {
      if (this.length() > 0) {
        var n = base[head];
        delete base[head++];
        return n;
      }
    }
    this.length = function() {
      return tail - head;
    } 
  }
  var outgoingMessageQueue = new SimpleQueue();
  var isPosting = false;
  var outstandingCallbacks;
  var noop = function() { }
  function doPostMessage() {
    if (isPosting == true)
      return;
    if (outgoingMessageQueue.length() > 0) {
      outstandingCallbacks = [];
      var messages = [];
      var msg
      while (msg = outgoingMessageQueue.poll()) {
        outstandingCallbacks.push(msg.cb || noop)
        messages.push("m="+encodeURIComponent(msg.data))
      }
      var req = createRequestObject();
      req.open('POST', postPath, true);
      req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
      req.onreadystatechange = function() {
        if (req.readyState == 4) {
          if (req.status == 200)
            for (var i = 0; i < outstandingCallbacks.length; ++i) {
              outstandingCallbacks[i](true);
            }
          else
            for (var i = 0; i < outstandingCallbacks.length; ++i) {
              outstandingCallbacks[i](false, req.status + ": "+req.statusText+" - "+req.responseText);
            }
        }
        isPosting = false;
        setTimeout(doPostMessage, 0);
      }
      req.send(messages.join('&'));
      isPosting = true;
    }
  }
  this.postMessage = function(data, cb) {
    outgoingMessageQueue.offer({cb: cb, data: data});
    doPostMessage();
  }
  
  this.onopen = function() { }
  this.onclosed = function() { }
  this.onmessage = function() { }
  this.CONNECTING = 0;
  this.OPEN = 1;
  this.CLOSED = 2;
  this.readyState = -1;
}
