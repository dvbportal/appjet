package net.appjet.ajstdlib.native;

import net.appjet.appvm.AppVM;
import net.appjet.common.util.ExpiringMapping;
import java.net.{InetAddress,Inet4Address,UnknownHostException};
import java.util.Collections;
import org.xbill.DNS.{Address};

/*
 * Abuse implementation notes:
 *
 *   The ideal abuse/cache implementation would create a class that extends
 *   org.xbill.DNS.Cache, that intercepted calls to the cache and if there
 *   is a cache miss, increment some value (per request).  If there are too
 *   many cache misses per request, then it would throw an exception
 *   to end the request.
 */

object SimpleDnsClient {
  val MAX_REQUEST_LOOKUPS = 25;
  val requestLookups = new ExpiringMapping[String,Int](60000);
  
  /** @return IP Address (String) of given hostname. */
  def js_dns_gethostbyname(env: AppVM.Env, hostname: String): String = {
    incrementLookupCount(env);
    var addr: String = null;
    try {
      addr = Address.getByName(hostname).getHostAddress();
    } catch {
      case e: UnknownHostException => { /* return addr which is already null */ }
    }
    return addr;
  }

  def js_dns_gethostbyaddr(env: AppVM.Env, ipaddr: String): String = {
    incrementLookupCount(env);
    if (!Address.isDottedQuad(ipaddr)) {
      throw AppVM.ReportableException("DNS Error", "Not a valid dotted-quad IP address: \""+ipaddr+"\"");
    }
    var addr = Address.getByAddress(ipaddr);
    var hostname: String = null;
    try {
      hostname = Address.getHostName(addr);
    } catch {
      case e: UnknownHostException => { /* return hostname which is already null */ ; }
    }
    return hostname;
  }

  def incrementLookupCount(env: AppVM.Env) {
    val requestId = env.requestId;
    var c:Int = 1;
    if (requestLookups.containsKey(requestId)) {
      c = requestLookups.get(requestId) + 1;
    }
    if (c > MAX_REQUEST_LOOKUPS) {
      throw AppVM.ReportableException("DNS Error", "Max lookups per request ("+ MAX_REQUEST_LOOKUPS +") exceeded.");
    }
    requestLookups.put(requestId, c);
  }
}
