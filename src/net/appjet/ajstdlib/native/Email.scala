package net.appjet.ajstdlib.native;

import net.appjet.appvm.AppVM;
import net.appjet.appvm.AppVM.{JSValue, JSArray, JSString, JSNumber, JSObject, JSBoolean};

import net.appjet.fancypants.{AppVMHandler, config, HelmaClient => HelmaRpc, RequestState, AppType, AppData};

import scala.collection.mutable.HashMap;
import java.util.Date;

import javax.mail._;
import javax.mail.internet._;
import java.util.Properties;

object EmailSendingService {
  val DAILY_EMAIL_LIMIT = if (config.emaillimit < 0) java.lang.Integer.MAX_VALUE else config.emaillimit;

  val dailyMailSendings = new HashMap[Int, Int];
  var nextUpdate = new Date((new Date).getTime() + 86400000); // tomorrow.

  def updateIfNecessary = {
    if ((new Date).after(nextUpdate)) {
      dailyMailSendings.clear();
      nextUpdate = new Date((new Date).getTime() + 86400000);
    }
  }

  def mailSentForId(ownerId: Int): Boolean = synchronized {
    updateIfNecessary;
    if (! dailyMailSendings.contains(ownerId))
      dailyMailSendings(ownerId) = 0;
    dailyMailSendings(ownerId) = dailyMailSendings(ownerId) + 1;
    (dailyMailSendings(ownerId) <= DAILY_EMAIL_LIMIT)
  }

  def overQuota(ownerId: Int): Boolean = synchronized {
    if (! dailyMailSendings.contains(ownerId))
      false;
    else 
      dailyMailSendings(ownerId) > DAILY_EMAIL_LIMIT;
  }

  def js_email_messagesSent(env: AppVM.Env): JSNumber = synchronized {
    val state = AppVMHandler.runningRequests(env.requestId);
    if (! dailyMailSendings.contains(state.data.ownerId)) 
      JSNumber(0)
    else 
      JSNumber(dailyMailSendings(state.data.ownerId));
  }

  def sendEmail(fromAddr: String, toAddr: String, subject: String, 
		content: String, headers: MimeMessage => Unit): String = {
    try {
      if (toAddr.indexOf("@") == -1)
	return "The email address \""+toAddr+"\" does not appear to be valid.";

      val debug = false;

      val props = new Properties;
      props.put("mail.smtp.host", "localhost");

      val session = Session.getDefaultInstance(props, null);
      session.setDebug(debug);

      val msg = new MimeMessage(session);
      val fromIAddr = new InternetAddress(fromAddr);
      msg.setFrom(fromIAddr);
      val toIAddr = new InternetAddress(toAddr);
      msg.setRecipients(Message.RecipientType.TO, List[Address](toIAddr).toArray)

      if (headers != null)
	headers(msg);

      msg.setSubject(subject);
      msg.setContent(content, "text/plain");
      Transport.send(msg);
      "";
    } catch {
      case e: MessagingException => { e.printStackTrace() ; return "Messaging exception: "+e.getMessage+"."; }
      case e => { e.printStackTrace(); return "Unknown error."; }
    }
  }

  def ownerAddress(app: AppData): String = {
    try { 
      var data = HelmaRpc.call("appjet.getUserData", List(app.ownerId));
      data("email").asInstanceOf[String];
    } catch { 
      case _ => "";
    };
  }

  def fromAddress(app: AppData): String = {
    "\""+app.appName+"\" <noreply@"+app.appName+"."+config.maindomain+">";
  }

  // Returns a status message. "" is success.
  def js_email_sendEmail(env: AppVM.Env, toAddr: String, subject: String, content: String, headers: JSArray): String = {
    val state = AppVMHandler.runningRequests(env.requestId);
    if (state.data.ownerId == -1) {
      return "Only registered AppJet users can send email.  Please <a target=\"_blank\" href=\"http://appjet.com/account/signup\">Sign up for an AppJet account</a>";
    }
    val fromAddr = fromAddress(state.data);
    val ownerAddr = ownerAddress(state.data);
    println("ownerId: "+state.data.ownerId+"; owneraddress: "+ownerAddr);

    if (! toAddr.equals(ownerAddr) && overQuota(state.data.ownerId)) {
      return "Too many emails sent today."+
	(if (state.data.appType == AppType.Preview) 
	  " (Messages sent to the address associated with your account are not limited.)"
	 else "");
    }
    env.addToBytecodeCount(1e5.asInstanceOf[Int]);

    val ret = sendEmail(fromAddr, toAddr, subject, content, msg => {
      0.until(headers.getLength/2).foreach(i => {
	try {
	  msg.addHeader(headers.getElement(i*2).get.asInstanceOf[JSString].value, headers.getElement(i*2+1).get.asInstanceOf[JSString].value);
	} catch {
	  case e: ClassCastException => { e.printStackTrace(); return "Invalid header keys or values."; }
	  case e => { e.printStackTrace(); return "Unknown error."; }
	}
      });
    })
    if ("".equals(ret)) {
      if (! toAddr.equals(ownerAddr)) 
	mailSentForId(state.data.ownerId);
    }
    ret
  }
}
	
      
