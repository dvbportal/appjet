/**
 * @fileOverview Library for easy forms. This library is
 * still under development.<br/>
 *
 * <p>To display a QuickForm, first create one, then add the fields in order,
 * then print the QuickForm.  QuickForms take care of basic formatting like
 * labeling input fields.</p>
 *
 * @example
import("quickforms");
var form = new QuickForm({});
form.addHeading("h", raw("What do <em>you</em> like?"));
form.addInputText("who", {label: "you are..."});
form.addInputText("what", {label: "you like..."});
form.addInputTextArea("why", {label: "because..."});
form.addSubmit("That's why!", "That's why!");
print(form);
 */

// TODO: should you be able to create QuickForm and QuickButton without
// the "this" keyword?

//----------------------------------------------------------------
// globals
//----------------------------------------------------------------

var _CSS = """
<style>

form.quickform {
  background-color: #fff;
  border: 1px solid #ccc;
  padding: 0.6em;
}

/*---- header ----*/

form.quickform div.qfheader {
  font-size: 1.0em;
  font-weight: bold;
  border-bottom: 1px solid #ccc; 
  margin-bottom: 1.0em;
  padding: 0.1em 0.2em 0.2em 0;
}

/*---- label ----*/
form.quickform div.qflabeldiv {
  margin-top: 1.0em;
}
form.quickform label.qflabel {
  color: #222;
  font-weight: bold;
  font-size: 76%;
}
form.quickform .qffield {
  margin-bottom: 1.0em;
}
/*---- inputText ----*/
form.quickform div.qfinputtextdiv {
}
form.quickform input.qfinputtext, form.quickform textarea.qfinputtextarea {
  border: 1px solid #8faec6;
}

form.quickform input.qfsubmitdiv {
}

form.quickform input.qfsubmit {
  margin-top: 1.0em;
  padding: 2px 6px;
}

form.quickform span.surroundtext {
  color: #555;
  font-size: 80%;
}

div.qfclearfloats { clear: both; }

</style>
""";

page.head.write(_CSS);

//----------------------------------------------------------------
// helper functions
//----------------------------------------------------------------
function _clearfloats() {
  return DIV({className: 'qfclearfloats'}, raw("<!-- -->"));
}

//----------------------------------------------------------------
// QuickForm object
//----------------------------------------------------------------

/**
 * <p>Creates a new, empty QuickForm.</p>
 *
 * <p>Supported options (all optional):</p>
 * <ul>
 * <li><strong>method:</strong> "get" or "post" (defaults to "post")</li>
 * <li><strong>action:</strong> path to submit to, defaults to current path</li>
 * <li><strong>enctype:</strong> used to change the method of data encoding</li>
 * </ul>
 *
 * @constructor
 * @param {object} [opts]  an optional dictionary of options
 */
QuickForm = function(opts) {
  this.method = (opts && opts.method) ? opts.method.toUpperCase() : 'POST';
  this.action = (opts && opts.action) ? opts.action : request.path;
  this.enctype = (opts && opts.enctype) ? opts.enctype :
    "application/x-www-form-urlencoded";

  this.form = FORM({method: this.method, enctype: this.enctype,
            action: this.action, className: 'quickform'});
  this.inputNames = [];
};

/**
 * Adds a heading in bold type that introduces a section of the form.
 *
 * @param {string} [id] (optional) unique id string, used for CSS rules
 * @param {string} text the text of the heading
 * @function
 */
QuickForm.prototype.addHeading = function(id, text) {
  if (! text) {
    text = id;
    id = undefined;
  }
  var attribs = {className: 'qfheader'};
  if (id) attribs.id = id;
  this.form.push(DIV(attribs, text));
  return this;
};

/**
 * <p>Creates a one-line text box for entering a small amount of text.</p>
 *
 * <p>Supported options (all optional):</p>
 * <ul>
 * <li><strong>label:</strong> text to label the field with, defaults to id</li>
 * <li><strong>beforeText:</strong> text to put immediately before the input field</li>
 * <li><strong>afterText:</strong> text to put immediately after the input field</li>
 * <li><strong>value:</strong> initial text for the field</li>
 * <li><strong>size:</strong> width of the field in characters</li>
 * <li><strong>disabled:</strong> set to "disabled" to disable the field</li>
 * </ul>
 *
 * @param {string} id a unique id string, used as a parameter name for this field
 * @param {object} [opts]  an optional dictionary of options
 * @function
 */
QuickForm.prototype.addInputText = function(id, opts) {
  // remember this name
  this.inputNames.push(id);

  // label
  var labelText = (opts && opts.label) ? opts.label : id;
  this.form.push(DIV({className: 'qflabeldiv'},
             LABEL({htmlFor: id,
               className: 'qflabel'},
               labelText)));

  // container
  var container = DIV({className: 'inputtextdiv qffield'});

  // beforeText
  if (opts && opts.beforeText) {
    container.push(SPAN({className: 'surroundtext'}, opts.beforeText));
  }
  
  // input
  var attrs = {className: 'qfinputtext',
           type: 'text',
           name: id,
           id: id};
  var quotestripper = new RegExp("\"", "g");
  eachProperty(opts, function(k, v) {
    attrs[k] = String(v).replace(quotestripper, "&quot;");
  });
  container.push(INPUT(attrs));

  // afterText
  if (opts && opts.afterText) {
    container.push(SPAN({className: 'surroundtext'}, opts.afterText));
  }

  this.form.push(container);
  return this;
};

/**
 * <p>Creates a rectangular, multi-line box for entering text.</p>
 *
 * <p>Supported options (all optional):</p>
 * <ul>
 * <li><strong>label:</strong> text to label the box with, defaults to id</li>
 * <li><strong>rows:</strong> how many lines high to make the box</li>
 * <li><strong>cols:</strong> how many characters wide to make the box</li>
 * <li><strong>value:</strong> initial text for the text area</li>
 * </ul>
 *
 * @param {string} id a unique id string, used as a parameter name for this field
 * @param {object} [opts]  an optional dictionary of options
 * @function
 */
QuickForm.prototype.addInputTextArea = function(id, opts) {
  // remember this name
  this.inputNames.push(id);

  // label
  var labelText = (opts && opts.label) ? opts.label : id;
  this.form.push(DIV({className: 'qflabeldiv'},
             LABEL({htmlFor: id,
               className: 'qflabel'},
               labelText)));

  // input
  var rows = (opts && opts.rows) ? opts.rows : 10;
  var cols = (opts && opts.cols) ? opts.cols : 40;
  var value = (opts && opts.value) ? opts.value : '';
  this.form.push(DIV({className: 'inputtextareadiv qffield'},
             TEXTAREA({className: 'qfinputtextarea',
               id: id,
               name: id,
               rows: rows,
               cols: cols}, raw(value))));
  return this;
}

/**
 * <p>Creates a control that allows the user to select a file for upload.
 * This feature is particularly experimental.</p>
 *
 * <p>Supported options (all optional):</p>
 * <ul>
 * <li><strong>label:</strong> text to label the control with, defaults to id</li>
 * </ul>
 *
 * @param {string} id a unique id string, used as a parameter name for this control
 * @param {object} [opts]  an optional dictionary of options
 * @function
 */
QuickForm.prototype.addInputFile = function(id, opts) {
  this.inputNames.push(id)

  var labelText = (opts && opts.label) ? opts.label : id
  this.form.push(DIV({className: 'qflabeldiv'},
             LABEL({htmlFor: id,
               className: 'qflabel'},
               labelText)));

  this.form.push(DIV({className: 'inputtextdiv qffield'},
             INPUT({className: 'qfinputtext',
               type: 'file',
               name: id,
               id: id})));
  return this;
};

/**
 * Adds a hidden field to the form which does not affect display, but
 * causes an additional parameter to be submitted with the form.
 * @param {string} id a unique id string, used as a parameter name for
 * this field
 * @param {string} val the value of this parameter
 * @function
 */
QuickForm.prototype.addInputHidden = function(id, val) {
  this.inputNames.push(id)

  this.form.push(INPUT({type: 'hidden', name: id, value: val}));
  return this;
};

/**
 * Creates a drop-down menu to the form that allows a user to select
 * from several options.
 * @param {string} id a unique id string, used as a parameter name for
 * this field
 * @param {iterable} base an object that supports the
 * <code>forEach</code> method, and whose elements contain the
 * properties for the option elements.
 * @param {object} keys a dictionary with properties "value",
 * "content", and "selected", that specify the property of
 * <code>base</code>'s objects that should be used as the "value",
 * menu text, and whether that menu item is selected, respecitvely.
 * @param {object} [opts] an optional dictionary of options.
 * @function
 */
QuickForm.prototype.addSelect = function(id, base, keys, opts) {
  // label
  var labelText = (opts && opts.label) ? opts.label : id;
  this.form.push(DIV({className: 'qflabeldiv'},
             LABEL({htmlFor: id,
               className: 'qflabel'},
               labelText)));

  // container
  var container = DIV({className: 'selectdiv qffield'});

  // beforeText
  if (opts && opts.beforeText) {
    container.push(SPAN({className: 'surroundtext'}, opts.beforeText));
  }

  // input
  var attrs = {className: 'qfinputtext',
           type: 'text',
           name: id,
           id: id};
  var quotestripper = new RegExp("\"", "g");
  eachProperty(opts, function(k, v) {
    attrs[k] = String(v).replace(quotestripper, "&quot;");
  });
  var select = SELECT(attrs);
  container.push(select);

  base.forEach(function(obj) {
    var attrs = {name: id, 
                 value: String(obj[keys.value]).replace(quotestripper, "&quot;")};
    if (obj[keys.selected])
      attrs.selected = "selected";
    select.push(new OPTION(attrs, obj[keys.content]));
  });

  // afterText
  if (opts && opts.afterText) {
    container.push(SPAN({className: 'surroundtext'}, opts.afterText));
  }

  this.form.push(container);
  return this;
}
  

/**
 * Adds a submit button to this form.
 * @param {string} id a unique id string, used as a parameter name for this field
 * @param {string} text the text on the button, and also the value of the parameter
 * @function
 */
QuickForm.prototype.addSubmit = function(id, text) {
  this.form.push(DIV({className: 'qfsubmitdiv qffield'},
             INPUT({type: 'submit',
               name: id,
               value: text,
               className: 'qfsubmit'})));
  return this;
};

/**
 * Does basic checking to determine whether the current request is a valid
 * submission of this form.
 *
 * @function
 * @return {boolean}
 */
QuickForm.prototype.validate = function() {
  // what to do here?
  // eventually:
  //    run validation functions on form input
  //  X make sure request method matches form's method
  //    if returns false, pre-fill existing values with stuff
  //    make sure request path matches the form's action
  //  X make sure all the input parameters are present
  //
  
  if (request.method != this.method) {
    return false;
  }

  var hasparams = true;
  this.inputNames.forEach(function(name) {
      if (!request.param(name)) {
    hasparams = false;
      }
    });
  if (!hasparams) {
    return false;
  }

  return true;
};

/**
 * Assuming that the current request is a form submission of this QuickForm,
 * assembles an object with a property for each form field.
 * @function
 * @return {object}
 */
QuickForm.prototype.getInput = function() {
  var input = {};
  this.inputNames.forEach(function(n) {
      input[n] = request.param(n);
    });
  return input;
};

/**
 * Converts this QuickForm to HTML mark-up.  This is called for you
 * when you print a QuickForm.
 * @function
 * @return {string} html-formatted string.
 */
QuickForm.prototype.toHTML = function() {
  return this.form.toHTML();
};



//----------------------------------------------------------------
// QuickButton
//----------------------------------------------------------------

/**
 * Creates a QuickButton, a self-contained button that when pressed
 * submits a form that contains a bunch of parameter/value pairs.
 *
 * <p>Supported options (all optional):</p>
 * <ul>
 * <li><strong>method:</strong> "get" or "post" (defaults to "get")</li>
 * <li><strong>action:</strong> path to submit to, defaults to current path</li>
 * </ul>
 *
 * @param {string} label a label for the button
 * @param {object} opts a dictionary of options
 * @param {object} inputs a dictionary of parameter/value mappings to submit
 * @constructor
*/
function QuickButton(label, opts, inputs) {
  var method = (opts && opts.method) ? opts.method : 'GET';
  var action = (opts && opts.action) ? opts.action : request.path;
  var form = FORM({method: method, action: action, style: 'display: inline;', className: 'quickbutton'});
  
  eachProperty(inputs, function(k, v) {
    form.push(INPUT({type: 'hidden', name: k, value: v}));
  });
  form.push(INPUT({type: 'submit', value: label, style: 'display: inline;'}));
  this.form = form;
}

/**
 * Converts this QuickButton to HTML mark-up.  This is called for you
 * when you print a QuickButton.
 * @function
 * @return {string} html-formatted string.
 */
QuickButton.prototype.toHTML = function() {
  return this.form.toHTML();
};



