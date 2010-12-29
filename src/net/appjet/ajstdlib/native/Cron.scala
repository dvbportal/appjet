package net.appjet.ajstdlib.native;

import java.sql.{Connection, DriverManager, PreparedStatement, ResultSet, SQLException, Statement, Timestamp}
import java.util.{ArrayList, Date};
import java.util.concurrent.{Executors, TimeUnit, ScheduledFuture};

import javax.servlet.http.{HttpServletRequest, HttpServletResponse};

import net.appjet.fancypants.{AppVMHandler, config, dprintln, FancyPantsServlet, AppData};
import net.appjet.common.util.HttpServletRequestFactory;

import net.appjet.appvm.AppVM;
import net.appjet.appvm.AppVM.{JSValue, JSArray, JSString, JSNumber, JSObject, JSBoolean};

import scala.collection.mutable.{HashMap, PriorityQueue, ArrayBuffer, HashSet};
import scala.collection.jcl.Conversions;

class CronEntry(val appId: int, var date: Date, val period: long, val path: String, 
		val params: String, val published: boolean, val mailOnError: boolean, 
		val name: String)
    extends Ordered[CronEntry] with Runnable {
  val uri = "http://"+"placeholder"+"."+config.maindomain+
	(if (path != null && path.size > 0) { path } else { "/" })+
	(if (params != null && params.size > 0) { "?"+params } else { "" })
  new java.net.URI(uri); // throws an exception if invalid URI.

  override def toString(): String = { 
    return "CRON entry: "+name+", date: "+date+", path: "+path+", params: "+params+(if (period > 0) ", repeating: "+period else ", single")+(if (published) ", published" else ", preview");
  }

  def nextExecution: long = {
    var when = date.getTime() - System.currentTimeMillis();
    if (when < 0) {
      when = when % period;
      when += period;
    }
    when;
  } 

  def compare(that: CronEntry): Int = {
    if (nextExecution != that.nextExecution) {
      if (nextExecution - that.nextExecution > 0) 1
      else -1
    } else {
      hashCode() - that.hashCode()
    }
  }

  var future: ScheduledFuture[_] = null;

  def commit(): Unit = {
    dprintln("CRON: cron entry being committed");
    future = 
      if (period <= 0) CronHandler.executor.schedule(this, date.getTime() - System.currentTimeMillis(), TimeUnit.MILLISECONDS);
      else CronHandler.executor.scheduleAtFixedRate(this, nextExecution, period, TimeUnit.MILLISECONDS);
  }

  def abort(): Unit = {
    CronHandler.remove(appId, name);
  }
    
  def run(): Unit = {
    dprintln("CRON: ("+name+") Running cron entry for app "+appId+"; path: "+path);

    if (period <= 0) CronHandler.remove(appId, name);
    val servlet = config.contextRepository.getContextById(published, appId).getAttribute("mainServlet").asInstanceOf[FancyPantsServlet]

    val uri = "http://"+servlet.data.appName+"."+config.maindomain+
      (if (path != null && path.size > 0) { path } else { "/" })+
      (if (params != null && params.size > 0) { "?"+params } else { "" })

    val headers = Conversions.convertMap(new java.util.HashMap[String, String]);
    headers("X-Cronjob-Name") = name;
    val req = HttpServletRequestFactory.createRequest(uri, headers.underlying, "CRON", null);
    val res = HttpServletRequestFactory.createResponse();
    servlet.data.properties.putIfAbsent("crondata", new CronData(servlet.data));
    val cronData = servlet.data.properties.get("crondata").asInstanceOf[CronData];
    var ret = 0L;
    try {
      ret = cronData.handleCron(req, res, this);
    } catch {
      case e => { dprintln("CRON ERROR"); throw e}
    } finally {
      dprintln("CRON: ("+name+") done, used: "+(if (ret == -2) "(rescheduled)" else if (ret == -1) "(cancelled)" else ret)+" bytecodes.");
    }
  }

  def reschedule(date: long): Unit = synchronized {
    if (period <= 0) 
      CronHandler.schedule(this)
    future.cancel(false);
    this.date = new Date(date);
    future = 
      if (period <= 0) CronHandler.executor.schedule(this, date - System.currentTimeMillis(), TimeUnit.MILLISECONDS);
      else CronHandler.executor.scheduleAtFixedRate(this, nextExecution, period, TimeUnit.MILLISECONDS);
  }

  def unschedule(): Unit = {
    cancel();
    CronHandler.remove(appId, name);
  }

  def cancel(): boolean = synchronized {
    dprintln("CRON: ("+name+") Cancelling cron entry for app "+appId+"; path: "+path);
    if (future != null)
      future.cancel(false);
    else
      true
  }
}

class CronData(appData: AppData) {
  val CRON_MAX_BYTECODES_PER_MINUTE: long = config.maxBytecodes*3; // 3 full requests?                                                             
  val CRON_MAX_QUEUE_LENGTH = 50;
  lazy val random = new java.util.Random();
  var cronBytecodesThisMinute = 0L;
  var rescheduledThisMinute = 0;
  var nextCronReset = (new Date()).getTime() + 60000; // 1 minute from now.                                                                      
  
  lazy val cancelledCrons = new HashSet[CronEntry]();
  var cancelledCronsFuture: ScheduledFuture[_] = null;
  
  def mailCancelledCrons(): Unit = {
    val ownerAddress = EmailSendingService.ownerAddress(appData);
    if ("".equals(ownerAddress))
      return
    var o = new StringBuffer();
  
    synchronized {
      cancelledCrons.foreach(e => {
        o.append("\n");
        o.append("\nname:   "+e.name);
        o.append("\ndate:   "+e.date);
        o.append("\nperiod: "+e.period);
        o.append("\npath:   "+e.path);
        o.append("\nparams: "+e.params);
        o.append("\npub'd:  "+e.published);
      });
      cancelledCrons.clear()
    }

    EmailSendingService.sendEmail(EmailSendingService.fromAddress(appData), ownerAddress,
                                  "CRON job(s) cancelled for app "+appData.appName,
                                  "One or more CRON jobs scheduled for app "+appData.appName+"have been because too many jobs tried "+
                                  " to execute at the same time for this app. A list follows."+o.toString(), null);
  }
  
  def noteCancelledCron(e: CronEntry): Unit = synchronized {
    cancelledCrons += e;
    if (cancelledCronsFuture == null || cancelledCronsFuture.isDone) {
      dprintln("CRON: scheduling cancelled job notifier")
      val data = this;
      cancelledCronsFuture = CronHandler.executor.schedule(new Runnable() {
        def run(): Unit = {
          dprintln("CRON: mailing about cancelled jobs!");
          data.mailCancelledCrons();
        }
      }, 10*60, java.util.concurrent.TimeUnit.SECONDS); // every 10 minutes.
    }
  }


  def handleCron(req: HttpServletRequest, res: HttpServletResponse, e: CronEntry): Long = {
    if ((new Date()).getTime() > nextCronReset) synchronized {
      cronBytecodesThisMinute = 0;
      rescheduledThisMinute = 0;
      nextCronReset = (new Date()).getTime() + 60000
    }
    if (cronBytecodesThisMinute > CRON_MAX_BYTECODES_PER_MINUTE) {
      if (rescheduledThisMinute < CRON_MAX_QUEUE_LENGTH) {
        e.reschedule(System.currentTimeMillis() + 60000 + random.nextInt(60000));
	synchronized {
	  rescheduledThisMinute += 1;
	}
        -2; // rescheduled                                                                                                                       
      } else {
        if (e.period > 0) {
          e.unschedule();
        }
        if (e.mailOnError) noteCancelledCron(e);
        -1; // cancelled.                                                                                                                        
      }
    } else {
      val ret = appData.context.getAttribute("mainServlet").asInstanceOf[FancyPantsServlet].execute_p(req, res, a => { a.simpleErrorMode = true; a })._1;
      synchronized {
        cronBytecodesThisMinute += ret;
      }
      if (e.mailOnError) {
        val output = res.asInstanceOf[net.appjet.common.util.HttpServletRequestFactory.ServletAccessor];
        val ownerAddress = EmailSendingService.ownerAddress(appData);
        if (! ("".equals(ownerAddress)) && (output.getStatusCode() < 200 || output.getStatusCode() > 300)) {
          EmailSendingService.sendEmail(EmailSendingService.fromAddress(appData), ownerAddress,
                                        "CRON job "+req.getHeader("X-Cronjob-Name")+" failed for app "+appData.appName,
                                        "A CRON job you scheduled ("+req.getHeader("X-Cronjob-Name")+") on app "+appData.appName+
                                        " failed with the following output:\n\n"+output.getOutput(), null);
        }
      }
      ret
    }
  }
}

object CronFunctions {
  def js_cron_scheduleSingleEvent(env: AppVM.Env, date: JSNumber, path: String, params: JSArray, 
				  published: JSBoolean, mailOnError: JSBoolean, name: String): String = {
    val state = AppVMHandler.runningRequests(env.requestId);
    try {
      val c = new CronEntry(state.data.appId, new Date(date.value.longValue()), -1, path, 
			    util.kvsToQueryString(params), published.value.booleanValue(), 
			    mailOnError.value.booleanValue(), name);
      CronHandler.unschedule(state.data.appId, name);
      CronHandler.schedule(c);
      state.addCommitter(Unit => { c.commit() });
      state.addAborter(Unit => { c.abort() });
      dprintln("CRON: ("+name+") scheduled an event for app "+state.data.appId+"; path: "+path);
      env.addToBytecodeCount(5e7.asInstanceOf[Int]); // high cost for cron schedule
      "";
    } catch {
      case e: IllegalArgumentException => { e.getMessage(); }
      case e: java.net.URISyntaxException => { "Couldn't generate a valid URI from path and params: "+e.getMessage(); }
      case e: CronHandler.TooManyCronjobsException => { e.getMessage(); }
    }
  }
  def js_cron_scheduleRepeatingEvent(env: AppVM.Env, date: JSNumber, period: JSNumber, path: String, params: JSArray,
				     published: JSBoolean, mailOnError: JSBoolean, name: String): String = {
    if (period.value.longValue() < 60000) { // 1 minute
      return "Period must be greater than 1 minute (60000 milliseconds)."
    }
    val state = AppVMHandler.runningRequests(env.requestId);
    if ("CRON".equals(state.req.getMethod())) {
      throw AppVM.ReportableException("Cron Error", "Can't schedule a repeating event inside a cron job!");
    }
    try {
      val c = new CronEntry(state.data.appId, new Date(date.value.longValue()), period.value.longValue(), path, 
			    util.kvsToQueryString(params), published.value.booleanValue(),
			    mailOnError.value.booleanValue(), name);
      CronHandler.unschedule(state.data.appId, name);
      CronHandler.schedule(c);
      state.addCommitter(Unit => { c.commit() });
      state.addAborter(Unit => { c.abort() });
      dprintln("CRON ("+name+") scheduled repeating event for app "+state.data.appId+"; path: "+path);
      env.addToBytecodeCount(5e7.asInstanceOf[Int]); // high cost for cron schedule
      "";
    } catch {
      case e: IllegalArgumentException => { e.getMessage(); }
      case e: java.net.URISyntaxException => { "Couldn't generate a valid URI from path and params: "+e.getMessage(); }
      case e: CronHandler.TooManyCronjobsException => { e.getMessage(); }
    }
  }
  def js_cron_allEvents(env: AppVM.Env): JSArray = {
    val state = AppVMHandler.runningRequests(env.requestId);
    val arr = env.newArray;
    var i = 0;
    CronHandler.allForApp(state.data.appId).foreach(e => {
      val obj = env.newObject;
      obj.setProperty("name", JSString(e.name));
      obj.setProperty("path", JSString(e.path));
      if (e.params != null)
	obj.setProperty("params", JSString(e.params));
      obj.setProperty("published", JSBoolean(e.published));
      obj.setProperty("mailOnError", JSBoolean(e.mailOnError));
      obj.setProperty("date", JSNumber(if (e.period <= 0) e.date.getTime() else e.nextExecution+System.currentTimeMillis()));
      obj.setProperty("repeating", JSBoolean(e.period > 0));
      if (e.period > 0)
	obj.setProperty("period", JSNumber(e.period));
      arr.setElement(i, obj);
      i += 1;
    });
    arr;
  } 
  def js_cron_unschedule(env: AppVM.Env, name: String) {
    val state = AppVMHandler.runningRequests(env.requestId);
    state.addCommitter(Unit => {
      CronHandler.unschedule(state.data.appId, name);
    });
  }
  def js_cron_unscheduleAll(env: AppVM.Env) {
    val state = AppVMHandler.runningRequests(env.requestId);
    CronHandler.unschedule(state.data.appId);
  }
}

object CronHandler {
  val framework = "embedded";
  val driver = "org.apache.derby.jdbc.EmbeddedDriver";
  val protocol = "jdbc:derby:";
  val dbName = "cronDB";
  var connection: Connection = null;

  val cronEntries = new HashMap[int, HashMap[String, CronEntry]];

  val executor = Executors.newScheduledThreadPool(16); // 8 CPUs, so 16 threads? maybe?

  def printSQLException(sqle: SQLException) {
    var e = sqle;
    while (e != null) {
      dprintln("\n----- SQLException -----");
      dprintln("  SQL State:  " + e.getSQLState());
      dprintln("  Error Code: " + e.getErrorCode());
      dprintln("  Message:    " + e.getMessage());
      e = e.getNextException();
    }
  }

  def initialize(): Boolean = {
    System.setProperty("derby.system.home", config.cronloc);
    try {
      Class.forName(driver).newInstance();
    } catch {
      case e: ClassNotFoundException => { dprintln("Unable to load the JDBC driver."); return false; }
      case e: InstantiationException => { dprintln("Unable to instantiate the JDBC driver."); return false; }
      case e: IllegalAccessException => { dprintln("Unable to access the JDBC driver."); return false; }
      case e => { dprintln("An unknown error occurred initializing the CRON DB."); return false; }
    }
    
    try {
      connection = DriverManager.getConnection(protocol+dbName+";create=true");
    } catch {
      case e: SQLException => { printSQLException(e); if (connection != null) connection.close(); connection = null; return false; }
      case e => { dprintln("An unknown error occurred while connecting to the CRON DB."); 
	if (connection != null) connection.close(); connection = null; return false; }
    }
    try {
      makeTableIfNotExists();
      readEntries();
    } catch {
      case e: SQLException => { printSQLException(e); return false; }
    }
    true;
  }

  def close(): Unit = {
    try {
      DriverManager.getConnection("jdbc:derby:;shutdown=true");
    } catch {
      case e: SQLException => { 
	if (e.getErrorCode() == 50000) dprintln("Cron DB shut down normally.");
	else { dprintln("Cron DB shut down abnormally.") ; printSQLException(e) }
      }
    }
  }

  def makeTableIfNotExists(): Unit = {
    var s: Statement = null;
    var rs: ResultSet = null;
    try {
      s = connection.createStatement(ResultSet.TYPE_SCROLL_INSENSITIVE,
                                     ResultSet.CONCUR_READ_ONLY);
      rs = s.executeQuery("SELECT * FROM sys.systables WHERE tablename='CRONS'");
      if (! rs.last()) { // no valid rows
	dprintln("\n\n****\nNo valid tables...creating anew!\n****\n\n");
	rs.close();
	rs = null;
	s.execute("CREATE TABLE crons(appId int, date timestamp, period bigint, path varchar(100), "+
			    "params varchar(256), published smallint, mailOnError smallint, name varchar(32), "+
			    "constraint cronind primary key (appId, name))");
	s.close();
	s = null;
      }
    } catch {
      case e: SQLException => { if (s != null) { s.close(); s = null; }
			        if (rs != null) { rs.close(); rs = null; }
			        throw e }
    }      
  }

  def readEntries(): Unit = {
    var s: Statement = null;
    var rs: ResultSet = null;
    try {
      s = connection.createStatement();
      rs = s.executeQuery("SELECT appId, date, period, path, params, published, mailOnError, name FROM crons");
      while (rs.next()) {
	val e = new CronEntry(rs.getInt(1), new Date(rs.getTimestamp(2).getTime()), rs.getLong(3), rs.getString(4), 
			      rs.getString(5), rs.getBoolean(6), rs.getBoolean(7), rs.getString(8));
	dprintln("CRON: read entry "+e);
	if (! cronEntries.contains(e.appId))
	  cronEntries(e.appId) = new HashMap[String, CronEntry]();
	cronEntries(e.appId)(e.name) = e;
	e.commit();
      }
      rs.close(); rs = null;
      s.close(); s = null;
    } catch {
      case e: SQLException => { if (s != null) { s.close(); s = null; }
			        if (rs != null) { rs.close(); rs = null; }
			        throw e }
    }
  }
      
  private var insert_inner: PreparedStatement = null;
  def insert = {
    if (insert_inner == null)
      insert_inner = 
	connection.prepareStatement(
	  "INSERT INTO crons (appId, date, period, path, params, published, mailOnError, name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    insert_inner;
  }
  def addToDb(e: CronEntry): Unit = synchronized {
    insert.setInt(1, e.appId);
    insert.setTimestamp(2, new Timestamp(e.date.getTime()));
    insert.setLong(3, e.period);
    insert.setString(4, e.path);
    insert.setString(5, e.params);
    insert.setBoolean(6, e.published);
    insert.setBoolean(7, e.published);
    insert.setString(8, e.name);
    insert.executeUpdate();
  }

  private var remove_inner: PreparedStatement = null;
  def remove = {
    if (remove_inner == null)
      remove_inner = connection.prepareStatement("DELETE FROM crons WHERE appId=? AND name=?");
    remove_inner;
  } 
  def removeFromDb(id: int, name: String): Unit = synchronized {
    remove.setInt(1, id);
    remove.setString(2, name);
    remove.executeUpdate();
  }

  private var removeAll_inner: PreparedStatement = null;
  def removeAll = {
    if (removeAll_inner == null)
      removeAll_inner = connection.prepareStatement("DELETE FROM crons WHERE appId=?");
    removeAll_inner;
  }
  def clearDb(id: int): Unit = synchronized {
    removeAll.setInt(1, id);
    removeAll.executeUpdate();
  }

  def allForApp(id: int): PriorityQueue[CronEntry] = {
    val q = new PriorityQueue[CronEntry]();
    if (cronEntries.contains(id))
      q ++= cronEntries(id).values;
    q;
  }

  val MAX_CRONJOBS_PER_APP = 100000;

  case class TooManyCronjobsException(msg: String) extends Exception(msg);

  def schedule(e: CronEntry): Unit = synchronized {
    if (! cronEntries.contains(e.appId))
      cronEntries(e.appId) = new HashMap[String, CronEntry]();
    if (cronEntries(e.appId).keySet.size > MAX_CRONJOBS_PER_APP)
      throw TooManyCronjobsException("Too many cronjobs scheduled for this app.");
    cronEntries(e.appId)(e.name) = e;
    try {
      addToDb(e);
    } catch {
      case sqle: SQLException => { printSQLException(sqle) ; unschedule(e.appId, e.name) }
    }
  }

  def unschedule(id: int): Unit = synchronized {
    cronEntries.get(id).foreach(_.values.foreach(_.cancel()));
    cronEntries -= id;
    clearDb(id);
  }

  def unschedule(id: int, name: String): Unit = synchronized {
    cronEntries.get(id).foreach(map => { 
      map.get(name).foreach(_.cancel());
      map -= name; 
    });
    removeFromDb(id, name);
  } 

  def remove(id: int, name: String): Unit = synchronized {
    cronEntries.get(id).foreach(_ -= name);
    removeFromDb(id, name);
  }
}

