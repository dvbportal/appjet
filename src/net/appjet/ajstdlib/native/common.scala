package net.appjet.ajstdlib.native;

import net.appjet.appvm.AppVM.{JSValue, JSArray, JSString, JSNumber, JSObject};
import scala.collection.mutable.{ListBuffer, HashMap, Map};
import scala.collection.jcl.{MapWrapper, Conversions};

object util {
  def kvsToQueryString(keysAndValues: JSArray): String = {
    val numDictEntries = keysAndValues.getLength/2;
    if (numDictEntries == 0)
      return null;
    def stringValue(value: JSValue): String = { value match { case JSString(str) => str; } }
    
    val entryStrings = new ListBuffer[String];
    0.until(numDictEntries).foreach(i => {
      val theKey = stringValue(keysAndValues.getElement(i*2).get);
      val theValue = stringValue(keysAndValues.getElement(i*2+1).get);
      entryStrings += (theKey+"="+theValue);
    });
    entryStrings.mkString("&");
  }    

  def kvsToScalaMap(keysAndValues: JSArray): Map[String, String] = {
    val numDictEntries = keysAndValues.getLength/2;
    val map = Conversions.convertMap[String, String](new java.util.HashMap);

    0.until(numDictEntries).foreach(i => {
      val theKey = keysAndValues.getElement(i*2).get.asInstanceOf[JSString].value;
      val theValue = keysAndValues.getElement(i*2+1).get.asInstanceOf[JSString].value;
      map(theKey) = theValue;
    });
    map
  }

  def kvsToMap(keysAndValues: JSArray): java.util.Map[String, String] = {
    kvsToScalaMap(keysAndValues).asInstanceOf[MapWrapper[String, String]].underlying;
  }
}
