/*----------------------------------------------------------------
 * AppjetTokenizer
 *   parses plaintext lines into tokens.
 *----------------------------------------------------------------*/
AppjetTokenizer = {};

/*----------------------------------------------------------------
 * helper utility for sets
 *----------------------------------------------------------------*/
AppjetTokenizer.BasicSet = function() {
  var that = function() {
    this.obj = {};
    for (var i = 0; i < arguments.length; i++) {
      this.obj['$$'+arguments[i]] = true;
    }
  };
  that.prototype.contains = function(x) {
    return (this.obj.hasOwnProperty('$$'+x) &&
	    this.obj['$$'+x] === true);
  };
  return that;
}();
  
/*----------------------------------------------------------------
 * AppjetTokenizer.TokenTypes (also correspond to the className of spans)
 *----------------------------------------------------------------*/
 
AppjetTokenizer.TokenTypes = {
 WHITE_SPACE: 'whitespace',
 STRING_LITERAL: 'stringliteral',
 MULTI_LINE_STRING: 'multilinestring',
 NUMERIC_LITERAL: 'numericliteral',
 PUNCTUATOR: 'punctuator',
 BALANCED_PUNCTUATOR: 'balancedpunctuator',
 COMMENT: 'comment',
 KEYWORD: 'keyword',
 NATIVE_LITERAL: 'nativeliteral',
 IDENTIFIER: 'identifier',
 ERROR: 'error'
};

/*----------------------------------------------------------------
 * AppjetTokenizer.LineInfo object
 *
 *  Metadata associated with each line.  Used to maintain state
 *  between lines.
 *----------------------------------------------------------------*/
AppjetTokenizer.LineInfo = function() {
  this.endsInsideMultilineComment = false;
  this.endsInsideMultilineString = false;
};

AppjetTokenizer.LineInfo.prototype.clone = function() {
  var clone = new AppjetTokenizer.LineInfo();
  clone.endsInsideMultilineComment = this.endsInsideMultilineComment;
  clone.endsInsideMultilineString = this.endsInsideMultilineString;
  return clone;
};

/** static function changesRequirePropagation() */
AppjetTokenizer.changesRequirePropagation = function(oldInfo, newInfo) {
  if (!oldInfo) { return false; }
  if (!newInfo) { return false; }
  if (oldInfo.endsInsideMultilineComment != newInfo.endsInsideMultilineComment) {
    return true;
  }
  if (oldInfo.endsInsideMultilineString != newInfo.endsInsideMultilineString) {
    return true;
  }
  return false;
};

/*----------------------------------------------------------------
 * AppjetTokenizer.tokenizeLine(line, previousLineInfo):
 *  returns {tokens, lineInfo}
 *
 *  Note: pass null for previousLineInfo on the first line.
 *----------------------------------------------------------------*/
AppjetTokenizer.tokenizeLine = function(line, previousLineInfo) {

  //------- helper test functions ---------
  function nextNot(start, f) {
    var j = start;
    while ((j < line.length) && f(line.charAt(j))) { j++; }
    return j;
  }
  function isWS(c) { return ecma262.whitespaceChars.contains(c); }
  function isDigit(c) { return /[0-9]/.test(c); }
  function isPunctuator(c) { return ecma262.punctuatorChars.contains(c); }
  function isBalancedPunctuator(c) { return ecma262.balancedPunctuatorChars.contains(c); }
  function isIdentifierStart(c) { return /[a-zA-Z\_\$]/.test(c); }
  function isIdentifierChar(c) { return /[a-zA-Z0-9\_\$]/.test(c); }
  function isPunctuatorExceptSlash(c) { return (c !== '/') && ecma262.punctuatorChars.contains(c); }
  function thinkItsARegexp() {
    // 1. if there's no other '/' on this line, it's a divisor
    if (line.slice(i+1).indexOf('/') === -1) {
      return false;
    }
    // 2. it's a regular expression only if the previous non-whitespace character
    //    was a punctuator except for ')', '.', '+', '++', '-', '--',
    if ((tokens.length > 0) &&
	tokenCanPrecedeRegexp(tokens[tokens.length - 1])) {
      return true;
    }
    if ((tokens.length > 1) &&
	(tokens[tokens.length - 1].type == TokenTypes.WHITE_SPACE) &&
	tokenCanPrecedeRegexp(tokens[tokens.length - 2])) {
      return true;
    }
    // 3. otherwise it defaults to a divisor punctuator
    return false;
  }
  function tokenCanPrecedeRegexp(t) {
    return (((t.type === TokenTypes.PUNCTUATOR) || (t.type == TokenTypes.BALANCED_PUNCTUATOR)) &&
	    !ecma262.punctuatorsNotBeforeRegexp.contains(t.text));
  }

  //-------- consumer functions & token producers --------
  function token(text, type) { return ({text: text, type: type}); }
  function addToken(type, endIndex) {
    if (endIndex > line.length) { endIndex = line.length; }
    var text = line.slice(i, endIndex);
    tokens.push(token(text, type));
    i = endIndex;
  }
  function consumeWhitespace() {
    addToken(TokenTypes.WHITE_SPACE, nextNot(i+1, isWS));
  }
  function consumeSingleLineComment() {
    addToken(TokenTypes.COMMENT, line.length);
  }
  function consumeMultiLineComment(offset) {
    var closed = false;
    var j = i + offset;
    while (j < (line.length - 1)) {
      if (line.charAt(j) == '*' && line.charAt(j+1) == '/') {
	closed = true;
	j++;
	break;
      }
      j++;
    }
    addToken(TokenTypes.COMMENT, j+1);
    lineInfo.endsInsideMultilineComment = !closed;
  }
  function consumeMultiLineString(offset) {
    var closed = false;
    var j = i + offset;
    while (j < line.length) {
      if ((line.charAt(j) == '\\') && (line.substr(j+1, 3) == '"""')) {
	j += 4;
	continue;
      }
      if (line.substr(j, 3) == '"""') {
	closed = true;
	j += 3;
	break;
      }
      j++;
    }
    addToken(TokenTypes.MULTI_LINE_STRING, j);
    lineInfo.endsInsideMultilineString = !closed;
  }
  function consumeStringLiteral(stringChar) {
    var j = i+1;
    while (j < (line.length - 1)) {
      if (line.charAt(j) == stringChar) {
	addToken(TokenTypes.STRING_LITERAL, j+1); return;
      }
      if (line.charAt(j) == '\\') { j += 2; } else { j++; }
    }
    // we shouldn't have reached end of the line without terminating
    // the string, but if we do, just return the rest of the line.
    addToken(TokenTypes.STRING_LITERAL, line.length);
  }
  function consumeHexLiteral() {
    addToken(TokenTypes.NUMERIC_LITERAL, nextNot(i+2, isDigit)); // i+2 so we skip "0x" prefix
  }
  function consumeNumericLiteral() {
    var j = nextNot(i+1, function(c) { return /[0-9\.eE]/.test(c); });
    addToken(TokenTypes.NUMERIC_LITERAL, j);
  }
  function consumeRegexp() {
    return consumeStringLiteral('/');
  }
  function consumeBalancedPunctuator() {
    addToken(TokenTypes.BALANCED_PUNCTUATOR, i+1);
  }
  function consumePunctuator() {
    addToken(TokenTypes.PUNCTUATOR, nextNot(i+1, isPunctuatorExceptSlash));
  }
  function consumeIdentifier() {
    // identifier could be a keyword, native literal, or regular identifier
    var j = nextNot(i+1, isIdentifierChar);
    var text = line.slice(i, j);
    if (ecma262.keywords.contains(text)) {
      addToken(TokenTypes.KEYWORD, j);
    } else if (ecma262.nativeLiterals.contains(text)) {
      addToken(TokenTypes.NATIVE_LITERAL, j);
    } else {
      addToken(TokenTypes.IDENTIFIER, j);
    }
  }
  function consumeError() {
    addToken(TokenTypes.ERROR, i+1);
  }

  // control flow begins  
  var tokens = [];
  var ecma262 = AppjetTokenizer.ECMA262;
  var i = 0;
  var TokenTypes = AppjetTokenizer.TokenTypes;
  var lineInfo = previousLineInfo ? previousLineInfo.clone() : new AppjetTokenizer.LineInfo();

  if (lineInfo.endsInsideMultilineComment) { consumeMultiLineComment(0); }
  if (lineInfo.endsInsideMultilineString) { consumeMultiLineString(0); }

  function c(look) {
    return ((i + look) < line.length) ? line.charAt(i + look) : '';
  }
  
  while (i < line.length) {
    if (isWS(c(0))) { consumeWhitespace(); }
    else if (c(0) == '/' && c(1) == '/') { consumeSingleLineComment(); }
    else if (c(0) == '/' && c(1) == '*') { consumeMultiLineComment(2); }
    else if (c(0) == '"' && c(1) == '"' && c(2) == '"') { consumeMultiLineString(3); }
    else if (c(0) == "'") { consumeStringLiteral("'"); }
    else if (c(0) == '"') { consumeStringLiteral('"'); }
    else if (c(0) == '0' && (c(1) == 'x' || c(1) == 'X')) { consumeHexLiteral(); }
    else if (/[0-9]/.test(c(0))) { consumeNumericLiteral(); }
    else if ((c(0) == '/') && thinkItsARegexp()) { consumeRegexp(); }
    else if (isBalancedPunctuator(c(0))) { consumeBalancedPunctuator(); }
    else if (isPunctuator(c(0))) { consumePunctuator(); }
    else if (isIdentifierStart(c(0))) { consumeIdentifier(); }
    else { consumeError(); }
  }
  
  return {tokens: tokens, lineInfo: lineInfo};
};
  
AppjetTokenizer.ECMA262 = {};
AppjetTokenizer.ECMA262.whitespaceChars = new AppjetTokenizer.BasicSet(
  ' ', '\t', '\u0009', '\u000B', '\u000C', '\u00A0');

// 'import' is removed from this list because we started using it in AppJet.
AppjetTokenizer.ECMA262.keywords = new AppjetTokenizer.BasicSet(
   'break', 'else', 'new', 'var', 'case', 'finally', 'return', 'void',
   'catch', 'for', 'switch', 'while', 'continue', 'function', 'this',
   'with', 'default', 'if', 'throw', 'delete', 'in', 'try', 'do',
   'instanceof', 'typeof', 'abstract', 'enum', 'int', 'short', 'boolean',
   'export', 'interface', 'static', 'byte', 'extends', 'long', 'super',
   'char', 'final', 'native', 'synchronized', 'class', 'float', 'package',
   'throws', 'const', 'goto', 'private', 'transient', 'debugger', 'implements',
   'protected', 'volatile', 'double', 'public', 'each');

AppjetTokenizer.ECMA262.nativeLiterals = new AppjetTokenizer.BasicSet(
   'true', 'false', 'null');

AppjetTokenizer.ECMA262.punctuatorChars = new AppjetTokenizer.BasicSet(
   '.', ';', ',', '<', '>', '=','!', '+', '-', '*', '%', '&', '|', '^', '~',
   '?', ':', '/');

AppjetTokenizer.ECMA262.balancedPunctuatorChars = new AppjetTokenizer.BasicSet(
   '{', '}', '(', ')', '[', ']');

AppjetTokenizer.ECMA262.punctuatorsNotBeforeRegexp = new AppjetTokenizer.BasicSet(
   ')', '.', '+', '++', '-', '--');
