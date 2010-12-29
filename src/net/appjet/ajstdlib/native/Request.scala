package net.appjet.ajstdlib.native;

import net.appjet.appvm.AppVM;
import net.appjet.fancypants.AppVMHandler;

import net.appjet.common.util.BetterFile;

import java.io.IOException
import java.util.Enumeration;

object Request {
  def js_request_path(env: AppVM.Env): String = {
    val state = AppVMHandler.runningRequests(env.requestId)
    state.req.getRequestURI()
  }

  def js_request_query(env: AppVM.Env): String = {
    val state = AppVMHandler.runningRequests(env.requestId)
    state.req.getQueryString()
  }

  def js_request_paramNames(env: AppVM.Env): AppVM.JSArray = {
    val state = AppVMHandler.runningRequests(env.requestId)
    val arr = env.newArray
    var i = 0;
    for (name <- state.parameterNames) {
      arr.setElement(i, AppVM.JSString(name))
      i += 1
    }
    arr
  }

  def js_request_param(env: AppVM.Env, key: String): AppVM.JSValue = {
    val state = AppVMHandler.runningRequests(env.requestId)
    try {
      val arr = env.newArray
      var i = 0
      for (obj <- state.parameterValues(key)) {
	arr.setElement(i, AppVM.JSString(obj))
	i += 1
      }
      arr
    } catch {
      case _ => AppVM.JSUndefined
    }
  }

  private def stringEnumerToJSArray(env: AppVM.Env, elems: Enumeration[_]):
  AppVM.JSValue = {
    if (elems == null) return AppVM.JSUndefined;
    try {
      val arr = env.newArray;
      var i = 0;
      while (elems.hasMoreElements) {
	arr.setElement(i, AppVM.JSString(elems.nextElement.asInstanceOf[String]));
	i += 1;
      }
      arr;
    }
    catch {
      case _ => AppVM.JSUndefined;
    }    
  }
  
  private def removeCookie(cookieStr: String, toRemove: String): String = {
    import java.util.regex.Pattern;
    return Pattern.compile(
      "(?:^|(?<=[^a-zA-Z0-9-]))"+
	toRemove+
      "\\s*=\\s*[^;]+(?:;|\\s*$)",Pattern.CASE_INSENSITIVE).
    matcher(cookieStr).replaceAll("");
  }
  
  def js_request_header(env: AppVM.Env, name: String): AppVM.JSValue = {
    val state = AppVMHandler.runningRequests(env.requestId);
    val headers:Enumeration[_] = state.req.getHeaders(name);
    val headers2 = new Enumeration[String] {
      def hasMoreElements: Boolean = headers.hasMoreElements;
      def nextElement: String = {
	var str = headers.nextElement.asInstanceOf[String];
	if (name.equalsIgnoreCase("Cookie")) {
	  str = removeCookie(str, "AppjetSession");
	  str = removeCookie(str, "AutoLoginEnabled");
	}
	return str;
      }
    }
    return stringEnumerToJSArray(env, headers2);
  }
  
  def js_request_headerNames(env: AppVM.Env): AppVM.JSValue = {
    val state = AppVMHandler.runningRequests(env.requestId);
    val headerNames:Enumeration[_] = state.req.getHeaderNames();
    return stringEnumerToJSArray(env, headerNames);
  }
  
  def js_request_uploadedFile(env: AppVM.Env, name: String): AppVM.JSValue = {
    val state = AppVMHandler.runningRequests(env.requestId)
    if (! state.req.isInstanceOf[com.oreilly.servlet.MultipartWrapper])
      throw AppVM.ReportableException("Uploaded File Error", "No files uploaded.")
    val r = state.req.asInstanceOf[com.oreilly.servlet.MultipartWrapper]
    val file = r.getFile(name)
    val contentType = r.getContentType(name)
    val filesystemName = r.getFilesystemName(name)
    if (file == null || contentType == null || filesystemName == null) {
      AppVM.JSUndefined
    } else {
      try {
	val o = env.newObject
	o.setProperty("contentType", AppVM.JSString(contentType))
	o.setProperty("filesystemName", AppVM.JSString(filesystemName))
	o.setProperty("fileContents", AppVM.JSString(BetterFile.getBinaryFileContents(file)))
	return o
      } catch {
	case e: IOException => 
	  throw AppVM.ReportableException("Uploaded File Error", "Error reading file "+name)
      }
      AppVM.JSUndefined
    }
  }

  def js_request_uploadedFileNames(env: AppVM.Env): AppVM.JSArray = {
    val state = AppVMHandler.runningRequests(env.requestId)
    val arr = env.newArray
    if (! state.req.isInstanceOf[com.oreilly.servlet.MultipartWrapper])
      throw AppVM.ReportableException("Uploaded File Error", "No files uploaded.")
    val r = state.req.asInstanceOf[com.oreilly.servlet.MultipartWrapper]
    val e = r.getFileNames()
    var i = 0
    while (e.hasMoreElements()) {
      arr.setElement(i, AppVM.JSString(e.nextElement().asInstanceOf[String]))
      i += 1
    }
    arr
  }

  def js_request_method(env: AppVM.Env): String = {
    val state = AppVMHandler.runningRequests(env.requestId)
    state.req.getMethod()
  }

  def js_request_remoteAddr(env: AppVM.Env): String = {
    val state = AppVMHandler.runningRequests(env.requestId)
    state.req.getRemoteAddr()
  }
}

