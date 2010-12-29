package net.appjet.ajstdlib.native;

import net.appjet.fancypants.{MultilineFixer, AppVMHandler};
import net.appjet.appvm.AppVM;

object Execution {
  def js_execution_multilineFix(env: AppVM.Env, input: String): String = {
    val state = AppVMHandler.runningRequests(env.requestId);
    try {
      MultilineFixer.fix(input, state.data.appName);
    } catch {
      case _ => null;
    }
  }
}

