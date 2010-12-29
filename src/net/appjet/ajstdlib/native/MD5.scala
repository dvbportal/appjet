package net.appjet.ajstdlib.native;

import net.appjet.appvm.AppVM;

import java.security.MessageDigest;

object MD5 {
  def js_md5(input: String): String = {
    var bytes: Array[byte] = input.getBytes("UTF-8");
    var md = MessageDigest.getInstance("MD5");
    var digest: Array[byte] = md.digest(bytes);
    var builder = new StringBuilder();
    for (b <- digest) {
      builder.append(Integer.toString((b >> 4) & 0xf, 16));
      builder.append(Integer.toString(b & 0xf, 16));
    }
    return builder.toString();
  }
}

