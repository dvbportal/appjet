package net.appjet.ajstdlib.native;

import net.appjet.appvm.AppVM;
import net.appjet.fancypants.AppVMHandler;

import net.appjet.common.util.BetterFile;

object Response {

  def js_response_stop(env: AppVM.Env): Unit = {
    val state = AppVMHandler.runningRequests(env.requestId)
    state.stoppedBytecodes = env.numBytecodesThisRequest;
    env.stopExecution
  }

  def js_response_error(env: AppVM.Env, errCode: Int, errString: String): Unit = {
    val state = AppVMHandler.runningRequests(env.requestId)
    state.stoppedBytecodes = env.numBytecodesThisRequest;
    state.overwriteOutputWithError(errCode, errString)
    env.stopExecution
  }

  def js_response_setStatusCode(env: AppVM.Env, statCode: Int): Unit = {
    val state = AppVMHandler.runningRequests(env.requestId)
    state.statusCode = statCode
  }

  def js_response_redirect(env: AppVM.Env, loc: String): Unit = {
    val state = AppVMHandler.runningRequests(env.requestId)
    // XXX: damn apache demands to use my local hostname "thinsilver.local" as the host when
    // a redirect is relative. being hoopty for now, but a better solution would be preferred.
    var location = ""
    if (!loc.startsWith("http://") &&
	!loc.startsWith("https://")) {
      location = "http://"+state.req.getHeader("Host")
      if (!"/".equals(loc.substring(0, 1))) {
	val path = state.req.getRequestURI()
	val sub = path.substring(0, path.lastIndexOf("/")+1)
	location += sub
      }
    }
    location += loc
    state.redirect = location
    state.stoppedBytecodes = env.numBytecodesThisRequest;
    env.stopExecution
  }

  def js_response_setHeader(env: AppVM.Env, name: String, value: String): Unit = {
    val state = AppVMHandler.runningRequests(env.requestId)
    state.headers += (res => res.setHeader(name, value));
  }

  def js_response_addHeader(env: AppVM.Env, name: String, value: String): Unit = {
    val state = AppVMHandler.runningRequests(env.requestId)
    state.headers += (res => res.addHeader(name, value));
  }

  def js_response_setContentType(env: AppVM.Env, ctype: String): Unit = {
    val state = AppVMHandler.runningRequests(env.requestId)
    state.contentType = ctype;
  }

  def js_response_setSimpleErrorMode(env: AppVM.Env, enabled: Boolean): Unit = {
    AppVMHandler.runningRequests(env.requestId).simpleErrorMode = enabled
  }
}

