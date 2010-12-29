/**
 * @fileOverview A collection of utilities for scheduling tasks in the
 * future.
 */

if (!appjet) {
  throw new Error('appjet library is required for util library.');
}

function _paramObjectToParamArray(params, enc) {
  var pa = [];
  eachProperty(params, function(k, v) {
    pa.push(enc ? encodeURIComponent(k.toString()) : k.toString());
    pa.push(enc ? encodeURIComponent(v.toString()) : v.toString());
  });
  return pa;
}

_radixChars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
_radix = _radixChars.length

function _longToString(n) {
  if (n < _radix) return _radixChars[n];
  else return _longToString(Math.floor(n/_radix)) + _radixChars[n%_radix];
}

function _cronId(date, path, period, params, published) {
  return "cron-"+ _longToString(appjet._native.storage_time()) + _longToString(Math.floor(Math.random()*_radix*_radix));
}

/**
 * <p>Schedules a CRON request to execute once at an exact date in
 * the future.</p>
 *
 * <p>The generated request appears as any other request, but uses HTTP
 * method <code>CRON</code> to distinguish itself from external HTTP
 * requests. It is not possible to generate a CRON request in any way
 * other than by scheduling one.</p>
 *
 * <p>To prevent abuse, only about 2000 CRON requests can be executed
 * by an app in any given minute. (This limit is lower for requests
 * that are very expensive, such as those that call
 * <code>wget()</code> and perform other high-cost operations.)
 * Requsts beyond this limit are rescheduled for the next minute but
 * ultimately canceled if the reschedule queue grows too large.</p>
 *
 * @example
result = schedule(new Date("Jan 12, 2008"), "/dosomething");
 *
 * @example
function cron_dosomething() {
  sendEmail("you@example.com", "A scheduled message.", "Greetings!");
}
 *
 * @param {Date} date The date the request should trigger.
 * @param {string} path The path to be specified by the HTTP CRON request. Maximum length of 100 characters.
 * @param {object} [params] Optional parameters to be given with the HTTP CRON request. Maximum of 256 bytes of data; use storage if you need more.
 * @param {boolean} [published] Whether the request should be sent to
 * the published version of the app, or the most recent preview
 * version. By default only requests scheduled in published mode go to
 * the published version of the app.
 * @param {boolean} [mailOnError] Whether to email this app's owner if the cron request fails or is canceled; defaults to false.
 * @return {string} A unique identifier for this cron task.
 */
function schedule(date, path, params, published, mailOnError) {
  if (date === undefined) {
    throw new Error("Must specify a date for schedule");
  }    
  var ps = _paramObjectToParamArray(params, true);
  var id = _cronId(date, path, -1, params, published);
  if (published === undefined) {
    published = !(appjet._native.isPreview() || appjet._native.isShell());
  }
  if (path === undefined) {
    path = "/";
  }
  if (path[0] != "/") throw new Error("Paths must be absolute.");
  if (mailOnError === undefined) {
    mailOnError = false;
  }
  var ret = appjet._native.cron_scheduleSingleEvent(date.getTime(), path, ps, published, mailOnError, id);
  if (ret != "")
    throw new Error("Scheduling error: "+ret);
  return id;
}

/**
 * <p>Schedules a CRON request to execute every <code>period</code> minutes,
 * starting at <code>date</code>.
 *
 * <p>The generated request appears as any other request, but uses
 * HTTP method <code>CRON</code> to distinguish itself from other external HTTP
 * requests. It is not possible to generate a CRON request in any way
 * other than by scheduling one.</p>
 *
 * <p>A CRON request cannot schedule a repeating CRON request.</p>
 *
 * @example
result = schedule(new Date("Jan 12, 2008"), "/dosomething");
 *
 * @param {Date} date The exact date the cron requests should start.
 * @param {number} period The delay between subsequent requests in minutes. Minimum of 1 minute.
 * @param {string} path The path specified by the HTTP CRON requests. Maximum length of 100 characters.
 * @param {object} [params] Optional parameters to be given with the HTTP CRON requests. Maximum of 256 bytes of data.
 * @param {boolean} [published] Whether the CRON requests should be sent to
 * the published version of the app, or the most recent preview
 * version. By default only requests scheduled in published mode go to
 * the published version of the app.
 * @param {boolean} [mailOnError] Whether to email this app's owner if the cron request fails or is canceled; defaults to false.
 * @return {string} A unique identifier for this cron task.
 */
function scheduleRepeating(date, period, path, params, published, mailOnError) {
  if (date === undefined || period === undefined) {
    throw new Error("Must specify a date and a period for scheduleRepeating");
  }
  var ps = _paramObjectToParamArray(params, true);
  var id = _cronId(date, path, period, params, published)
  if (published === undefined) {
    published = !(appjet._native.isPreview() || appjet._native.isShell());
  }
  if (path === undefined) {
    path = "/";
  }
  if (path[0] != "/") throw new Error("Paths must be absolute.");
  if (mailOnError === undefined) {
    mailOnError = false;
  }
  var ret = appjet._native.cron_scheduleRepeatingEvent(date.getTime(), period*60000, path, ps, published, mailOnError, id);
  if (ret != "")
    throw new Error("Scheduling error: "+ret);
  return id;
}

/**
 * <p>Returns an array of objects describing all scheduled CRON tasks.
 * Modifications to these objects are not reflected in the scheduled
 * tasks.</p>
 *
 * <p>The returned objects have property names that are the same as
 * the arguments to <code>schedule()</code> and
 * <code>scheduleRepeating()</code>, namely:</o>
 * <ul>
 * <li><strong>name:</strong> the task's identifier</li>
 * <li><strong>date:</strong> date the task is (or was) first scheduled to run</li>
 * <li><strong>period:</strong> delay between repeated requests, in minutes</li>
 * <li><strong>path:</strong> path to request</li>
 * <li><strong>params:</strong> query string containing the parameters on the request</li>
 * <li><strong>published:</strong> whether to send the request to the published or preview version of the code</li>
 * <li><strong>mailOnError:</strong> whether to send mail if there's an error
 * </ul>
 *
 * @return {Array} An array of objects describing all scheduled CRON tasks.
 */
function listAll() {
  var ret = appjet._native.cron_allEvents();
  ret.forEach(function (e) {
    e.date = new Date(e.date);
    if (e.period)
      e.period = e.period / 60000;
    eachProperty(e, function(name, value) {
      e.__defineGetter__(name, function() { return value; });
      e.__defineSetter__(name, function() { 
	throw new Error("Scheduled requests are not mutable; you must cancel this one and "+
			"schedule a new one if you'd like to change any properties.");
      });
    });
  });
  return ret;
}

/**
 * Unschedules the CRON task identified by <code>name</code>. 
 *
 * <p>If the CRON task is non-repeating and has already been executed,
 * this function has no effect.</p>
 * 
 * @example
result = schedule(new Date("Jan 12, 2008"), "/dosomething");
unschedule(result);
 *
 * @param {string} name The identifier of the CRON task to cancel.
 */
function unschedule(name) {
  appjet._native.cron_unschedule(name);
}

/**
 * Unschedules all CRON tasks.
 */
function unscheduleAll() {
  appjet._native.cron_unscheduleAll();
}
