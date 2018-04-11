/*! CSS-POLYFILLS - v0.1.0 - 2018-04-11 - https://github.com/FremyCompany/css-polyfills - Copyright (c) 2018 François REMY; MIT-Licensed !*/

!(function() { 'use strict';
    var module = { exports:{} };
    var require = (function() { var modules = {}; var require = function(m) { return modules[m]; }; require.define = function(m) { modules[m]=module.exports; module.exports={}; }; return require; })();

////////////////////////////////////////

//
// note: this file is based on Tab Atkins's CSS Parser
// please include him (@tabatkins) if you open any issue for this file
// 
module.exports = (function() { "use strict";

// 
// exports
//
var cssSyntax = { 
	tokenize: function(string) {/*filled later*/}, 
	parse: function(tokens) {/*filled later*/}
};

//
// css tokenizer
//

// Add support for token lists (superclass of array)
function TokenList() {
	var array = []; 
	array.toCSSString=TokenListToCSSString;
	return array;
}
function TokenListToCSSString(sep) {
	if(sep) {
		return this.map(function(o) { return o.toCSSString(); }).join(sep);
	} else {
		return this.asCSSString || (this.asCSSString = (
			this.map(function(o) { return o.toCSSString(); }).join("/**/")
				.replace(/( +\/\*\*\/ *| * | *\/\*\*\/ +)/g," ")
				.replace(/( +\/\*\*\/ *| * | *\/\*\*\/ +)/g," ")
				.replace(/(\!|\:|\;|\@|\.|\,|\*|\=|\&|\\|\/|\<|\>|\[|\{|\(|\]|\}|\)|\|)\/\*\*\//g,"$1")
				.replace(/\/\*\*\/(\!|\:|\;|\@|\.|\,|\*|\=|\&|\\|\/|\<|\>|\[|\{|\(|\]|\}|\)|\|)/g,"$1")
		));
	}
}
cssSyntax.TokenList = TokenList;
cssSyntax.TokenListToCSSString = TokenListToCSSString;

function between(num, first, last) { return num >= first && num <= last; }
function digit(code) { return between(code, 0x30,0x39); }
function hexdigit(code) { return digit(code) || between(code, 0x41,0x46) || between(code, 0x61,0x66); }
function uppercaseletter(code) { return between(code, 0x41,0x5a); }
function lowercaseletter(code) { return between(code, 0x61,0x7a); }
function letter(code) { return uppercaseletter(code) || lowercaseletter(code); }
function nonascii(code) { return code >= 0x80; }
function namestartchar(code) { return letter(code) || nonascii(code) || code == 0x5f; }
function namechar(code) { return namestartchar(code) || digit(code) || code == 0x2d; }
function nonprintable(code) { return between(code, 0,8) || code == 0xb || between(code, 0xe,0x1f) || code == 0x7f; }
function newline(code) { return code == 0xa; }
function whitespace(code) { return newline(code) || code == 9 || code == 0x20; }
function badescape(code) { return newline(code) || isNaN(code); }

var maximumallowedcodepoint = 0x10ffff;

function InvalidCharacterError(message) {
	this.message = message;
};
InvalidCharacterError.prototype = new Error;
InvalidCharacterError.prototype.name = 'InvalidCharacterError';

function preprocess(str) {
	// Turn a string into an array of code points,
	// following the preprocessing cleanup rules.
	var codepoints = [];
	for(var i = 0; i < str.length; i++) {
		var code = str.charCodeAt(i);
		if(code == 0xd && str.charCodeAt(i+1) == 0xa) {
			code = 0xa; i++;
		}
		if(code == 0xd || code == 0xc) code = 0xa;
		if(code == 0x0) code = 0xfffd;
		if(between(code, 0xd800, 0xdbff) && between(str.charCodeAt(i+1), 0xdc00, 0xdfff)) {
			// Decode a surrogate pair into an astral codepoint.
			var lead = code - 0xd800;
			var trail = str.charCodeAt(i+1) - 0xdc00;
			code = Math.pow(2, 21) + lead * Math.pow(2, 10) + trail;
		}
		codepoints.push(code);
	}
	return codepoints;
}

function stringFromCode(code) {
	if(code <= 0xffff) return String.fromCharCode(code);
	// Otherwise, encode astral char as surrogate pair.
	code -= Math.pow(2, 21);
	var lead = Math.floor(code/Math.pow(2, 10)) + 0xd800;
	var trail = code % Math.pow(2, 10); + 0xdc00;
	return String.fromCharCode(lead) + String.fromCharCode(trail);
}

function tokenize(str) {
	str = preprocess(str);
	var i = -1;
	var tokens = new TokenList();
	var code;

	// Line number information.
	var line = 0;
	var column = 0;
	// The only use of lastLineLength is in reconsume().
	var lastLineLength = 0;
	var incrLineno = function() {
		line += 1;
		lastLineLength = column;
		column = 0;
	};
	var locStart = {line:line, column:column};

	var codepoint = function(i) {
		if(i >= str.length) {
			return -1;
		}
		return str[i];
	}
	var next = function(num) {
		if(num === undefined) { num = 1; }
		if(num > 3) { throw "Spec Error: no more than three codepoints of lookahead."; }
		return codepoint(i+num);
	};
	var consume = function(num) {
		if(num === undefined)
			num = 1;
		i += num;
		code = codepoint(i);
		if(newline(code)) incrLineno();
		else column += num;
		//console.log('Consume '+i+' '+String.fromCharCode(code) + ' 0x' + code.toString(16));
		return true;
	};
	var reconsume = function() {
		i -= 1;
		if (newline(code)) {
			line -= 1;
			column = lastLineLength;
		} else {
			column -= 1;
		}
		locStart.line = line;
		locStart.column = column;
		return true;
	};
	var eof = function(codepoint) {
		if(codepoint === undefined) codepoint = code;
		return codepoint == -1;
	};
	var donothing = function() {};
	var tokenizeerror = function() { console.log("Parse error at index " + i + ", processing codepoint 0x" + code.toString(16) + ".");return true; };

	var consumeAToken = function() {
		consumeComments();
		consume();
		if(whitespace(code)) {
			while(whitespace(next())) consume();
			return new WhitespaceToken;
		}
		else if(code == 0x22) return consumeAStringToken();
		else if(code == 0x23) {
			if(namechar(next()) || areAValidEscape(next(1), next(2))) {
				var token = new HashToken();
				if(wouldStartAnIdentifier(next(1), next(2), next(3))) token.type = "id";
				token.value = consumeAName();
				return token;
			} else {
				return new DelimToken(code);
			}
		}
		else if(code == 0x24) {
			if(next() == 0x3d) {
				consume();
				return new SuffixMatchToken();
			} else {
				return new DelimToken(code);
			}
		}
		else if(code == 0x27) return consumeAStringToken();
		else if(code == 0x28) return new OpenParenToken();
		else if(code == 0x29) return new CloseParenToken();
		else if(code == 0x2a) {
			if(next() == 0x3d) {
				consume();
				return new SubstringMatchToken();
			} else {
				return new DelimToken(code);
			}
		}
		else if(code == 0x2b) {
			if(startsWithANumber()) {
				reconsume();
				return consumeANumericToken();
			} else {
				return new DelimToken(code);
			}
		}
		else if(code == 0x2c) return new CommaToken();
		else if(code == 0x2d) {
			if(startsWithANumber()) {
				reconsume();
				return consumeANumericToken();
			} else if(next(1) == 0x2d && next(2) == 0x3e) {
				consume(2);
				return new CDCToken();
			} else if(startsWithAnIdentifier()) {
				reconsume();
				return consumeAnIdentlikeToken();
			} else {
				return new DelimToken(code);
			}
		}
		else if(code == 0x2e) {
			if(startsWithANumber()) {
				reconsume();
				return consumeANumericToken();
			} else {
				return new DelimToken(code);
			}
		}
		else if(code == 0x3a) return new ColonToken;
		else if(code == 0x3b) return new SemicolonToken;
		else if(code == 0x3c) {
			if(next(1) == 0x21 && next(2) == 0x2d && next(3) == 0x2d) {
				consume(3);
				return new CDOToken();
			} else {
				return new DelimToken(code);
			}
		}
		else if(code == 0x40) {
			if(wouldStartAnIdentifier(next(1), next(2), next(3))) {
				return new AtKeywordToken(consumeAName());
			} else {
				return new DelimToken(code);
			}
		}
		else if(code == 0x5b) return new OpenSquareToken();
		else if(code == 0x5c) {
			if(startsWithAValidEscape()) {
				reconsume();
				return consumeAnIdentlikeToken();
			} else {
				tokenizeerror();
				return new DelimToken(code);
			}
		}
		else if(code == 0x5d) return new CloseSquareToken();
		else if(code == 0x5e) {
			if(next() == 0x3d) {
				consume();
				return new PrefixMatchToken();
			} else {
				return new DelimToken(code);
			}
		}
		else if(code == 0x7b) return new OpenCurlyToken();
		else if(code == 0x7c) {
			if(next() == 0x3d) {
				consume();
				return new DashMatchToken();
			} else if(next() == 0x7c) {
				consume();
				return new ColumnToken();
			} else {
				return new DelimToken(code);
			}
		}
		else if(code == 0x7d) return new CloseCurlyToken();
		else if(code == 0x7e) {
			if(next() == 0x3d) {
				consume();
				return new IncludeMatchToken();
			} else {
				return new DelimToken(code);
			}
		}
		else if(digit(code)) {
			reconsume();
			return consumeANumericToken();
		}
		else if(namestartchar(code)) {
			reconsume();
			return consumeAnIdentlikeToken();
		}
		else if(eof()) return new EOFToken();
		else return new DelimToken(code);
	};

	var consumeComments = function() {
		while(next(1) == 0x2f && next(2) == 0x2a) {
			consume(2);
			while(true) {
				consume();
				if(code == 0x2a && next() == 0x2f) {
					consume();
					break;
				} else if(eof()) {
					tokenizeerror();
					return;
				}
			}
		}
	};

	var consumeANumericToken = function() {
		var num = consumeANumber();
		if(wouldStartAnIdentifier(next(1), next(2), next(3))) {
			var token = new DimensionToken();
			token.value = num.value;
			token.repr = num.repr;
			token.type = num.type;
			token.unit = consumeAName();
			return token;
		} else if(next() == 0x25) {
			consume();
			var token = new PercentageToken();
			token.value = num.value;
			token.repr = num.repr;
			return token;
		} else {
			var token = new NumberToken();
			token.value = num.value;
			token.repr = num.repr;
			token.type = num.type;
			return token;
		}
	};

	var consumeAnIdentlikeToken = function() {
		var str = consumeAName();
		if(str.toLowerCase() == "url" && next() == 0x28) {
			consume();
			while(whitespace(next(1)) && whitespace(next(2))) consume();
			if(next() == 0x22 || next() == 0x27) {
				return new FunctionToken(str);
			} else if(whitespace(next()) && (next(2) == 0x22 || next(2) == 0x27)) {
				return new FunctionToken(str);
			} else {
				return consumeAURLToken();
			}
		} else if(next() == 0x28) {
			consume();
			return new FunctionToken(str);
		} else {
			return new IdentifierToken(str);
		}
	};

	var consumeAStringToken = function(endingCodePoint) {
		if(endingCodePoint === undefined) endingCodePoint = code;
		var string = "";
		while(consume()) {
			if(code == endingCodePoint || eof()) {
				return new StringToken(string);
			} else if(newline(code)) {
				tokenizeerror();
				reconsume();
				return new BadStringToken();
			} else if(code == 0x5c) {
				if(eof(next())) {
					donothing();
				} else if(newline(next())) {
					consume();
				} else {
					string += stringFromCode(consumeEscape())
				}
			} else {
				string += stringFromCode(code);
			}
		}
	};

	var consumeAURLToken = function() {
		var token = new URLToken("");
		while(whitespace(next())) consume();
		if(eof(next())) return token;
		while(consume()) {
			if(code == 0x29 || eof()) {
				return token;
			} else if(whitespace(code)) {
				while(whitespace(next())) consume();
				if(next() == 0x29 || eof(next())) {
					consume();
					return token;
				} else {
					consumeTheRemnantsOfABadURL();
					return new BadURLToken();
				}
			} else if(code == 0x22 || code == 0x27 || code == 0x28 || nonprintable(code)) {
				tokenizeerror();
				consumeTheRemnantsOfABadURL();
				return new BadURLToken();
			} else if(code == 0x5c) {
				if(startsWithAValidEscape()) {
					token.value += stringFromCode(consumeEscape());
				} else {
					tokenizeerror();
					consumeTheRemnantsOfABadURL();
					return new BadURLToken();
				}
			} else {
				token.value += stringFromCode(code);
			}
		}
	};

	var consumeEscape = function() {
		// Assume the the current character is the \
		// and the next code point is not a newline.
		consume();
		if(hexdigit(code)) {
			// Consume 1-6 hex digits
			var digits = [code];
			for(var total = 0; total < 5; total++) {
				if(hexdigit(next())) {
					consume();
					digits.push(code);
				} else {
					break;
				}
			}
			if(whitespace(next())) consume();
			var value = parseInt(digits.map(function(x){return String.fromCharCode(x);}).join(''), 16);
			if( value > maximumallowedcodepoint ) value = 0xfffd;
			return value;
		} else if(eof()) {
			return 0xfffd;
		} else {
			return code;
		}
	};

	var areAValidEscape = function(c1, c2) {
		if(c1 != 0x5c) return false;
		if(newline(c2)) return false;
		return true;
	};
	var startsWithAValidEscape = function() {
		return areAValidEscape(code, next());
	};

	var wouldStartAnIdentifier = function(c1, c2, c3) {
		if(c1 == 0x2d) {
			return namestartchar(c2) || c2 == 0x2d || areAValidEscape(c2, c3);
		} else if(namestartchar(c1)) {
			return true;
		} else if(c1 == 0x5c) {
			return areAValidEscape(c1, c2);
		} else {
			return false;
		}
	};
	var startsWithAnIdentifier = function() {
		return wouldStartAnIdentifier(code, next(1), next(2));
	};

	var wouldStartANumber = function(c1, c2, c3) {
		if(c1 == 0x2b || c1 == 0x2d) {
			if(digit(c2)) return true;
			if(c2 == 0x2e && digit(c3)) return true;
			return false;
		} else if(c1 == 0x2e) {
			if(digit(c2)) return true;
			return false;
		} else if(digit(c1)) {
			return true;
		} else {
			return false;
		}
	};
	var startsWithANumber = function() {
		return wouldStartANumber(code, next(1), next(2));
	};

	var consumeAName = function() {
		var result = "";
		while(consume()) {
			if(namechar(code)) {
				result += stringFromCode(code);
			} else if(startsWithAValidEscape()) {
				result += stringFromCode(consumeEscape());
			} else {
				reconsume();
				return result;
			}
		}
	};

	var consumeANumber = function() {
		var repr = '';
		var type = "integer";
		if(next() == 0x2b || next() == 0x2d) {
			consume();
			repr += stringFromCode(code);
		}
		while(digit(next())) {
			consume();
			repr += stringFromCode(code);
		}
		if(next(1) == 0x2e && digit(next(2))) {
			consume();
			repr += stringFromCode(code);
			consume();
			repr += stringFromCode(code);
			type = "number";
			while(digit(next())) {
				consume();
				repr += stringFromCode(code);
			}
		}
		var c1 = next(1), c2 = next(2), c3 = next(3);
		if((c1 == 0x45 || c1 == 0x65) && digit(c2)) {
			consume();
			repr += stringFromCode(code);
			consume();
			repr += stringFromCode(code);
			type = "number";
			while(digit(next())) {
				consume();
				repr += stringFromCode(code);
			}
		} else if((c1 == 0x45 || c1 == 0x65) && (c2 == 0x2b || c2 == 0x2d) && digit(c3)) {
			consume();
			repr += stringFromCode(code);
			consume();
			repr += stringFromCode(code);
			consume();
			repr += stringFromCode(code);
			type = "number";
			while(digit(next())) {
				consume();
				repr += stringFromCode(code);
			}
		}
		var value = convertAStringToANumber(repr);
		return {type:type, value:value, repr:repr};
	};

	var convertAStringToANumber = function(string) {
		// CSS's number rules are identical to JS, afaik.
		return +string;
	};

	var consumeTheRemnantsOfABadURL = function() {
		while(consume()) {
			if(code == 0x2d || eof()) {
				return;
			} else if(startsWithAValidEscape()) {
				consumeEscape();
				donothing();
			} else {
				donothing();
			}
		}
	};



	var iterationCount = 0;
	while(!eof(next())) {
		tokens.push(consumeAToken());
		if(iterationCount++ > str.length*2) throw new Error("The CSS Tokenizer is infinite-looping");
	}
	return tokens;
}

function CSSParserToken() { return this; }
CSSParserToken.prototype.toJSON = function() {
	return {token: this.tokenType};
}
CSSParserToken.prototype.toString = function() { return this.tokenType; }
CSSParserToken.prototype.toCSSString = function() { return ''+this; }

function BadStringToken() { return this; }
BadStringToken.prototype = new CSSParserToken;
BadStringToken.prototype.tokenType = "BADSTRING";
BadStringToken.prototype.toCSSString = function() { return "'"; }

function BadURLToken() { return this; }
BadURLToken.prototype = new CSSParserToken;
BadURLToken.prototype.tokenType = "BADURL";
BadURLToken.prototype.toCSSString = function() { return "url("; }

function WhitespaceToken() { return this; }
WhitespaceToken.prototype = new CSSParserToken;
WhitespaceToken.prototype.tokenType = "WHITESPACE";
WhitespaceToken.prototype.toString = function() { return "WS"; }
WhitespaceToken.prototype.toCSSString = function() { return " "; }

function CDOToken() { return this; }
CDOToken.prototype = new CSSParserToken;
CDOToken.prototype.tokenType = "CDO";
CDOToken.prototype.toCSSString = function() { return "<!--"; }

function CDCToken() { return this; }
CDCToken.prototype = new CSSParserToken;
CDCToken.prototype.tokenType = "CDC";
CDCToken.prototype.toCSSString = function() { return "-->"; }

function ColonToken() { return this; }
ColonToken.prototype = new CSSParserToken;
ColonToken.prototype.tokenType = ":";

function SemicolonToken() { return this; }
SemicolonToken.prototype = new CSSParserToken;
SemicolonToken.prototype.tokenType = ";";

function CommaToken() { return this; }
CommaToken.prototype = new CSSParserToken;
CommaToken.prototype.tokenType = ",";
CommaToken.prototype.value = ";"; // backwards-compat with DELIM token

function GroupingToken() { return this; }
GroupingToken.prototype = new CSSParserToken;

function OpenCurlyToken() { this.value = "{"; this.mirror = "}"; return this; }
OpenCurlyToken.prototype = new GroupingToken;
OpenCurlyToken.prototype.tokenType = "{";

function CloseCurlyToken() { this.value = "}"; this.mirror = "{"; return this; }
CloseCurlyToken.prototype = new GroupingToken;
CloseCurlyToken.prototype.tokenType = "}";

function OpenSquareToken() { this.value = "["; this.mirror = "]"; return this; }
OpenSquareToken.prototype = new GroupingToken;
OpenSquareToken.prototype.tokenType = "[";

function CloseSquareToken() { this.value = "]"; this.mirror = "["; return this; }
CloseSquareToken.prototype = new GroupingToken;
CloseSquareToken.prototype.tokenType = "]";

function OpenParenToken() { this.value = "("; this.mirror = ")"; return this; }
OpenParenToken.prototype = new GroupingToken;
OpenParenToken.prototype.tokenType = "(";

function CloseParenToken() { this.value = ")"; this.mirror = "("; return this; }
CloseParenToken.prototype = new GroupingToken;
CloseParenToken.prototype.tokenType = ")";

function IncludeMatchToken() { return this; }
IncludeMatchToken.prototype = new CSSParserToken;
IncludeMatchToken.prototype.tokenType = "~=";

function DashMatchToken() { return this; }
DashMatchToken.prototype = new CSSParserToken;
DashMatchToken.prototype.tokenType = "|=";

function PrefixMatchToken() { return this; }
PrefixMatchToken.prototype = new CSSParserToken;
PrefixMatchToken.prototype.tokenType = "^=";

function SuffixMatchToken() { return this; }
SuffixMatchToken.prototype = new CSSParserToken;
SuffixMatchToken.prototype.tokenType = "$=";

function SubstringMatchToken() { return this; }
SubstringMatchToken.prototype = new CSSParserToken;
SubstringMatchToken.prototype.tokenType = "*=";

function ColumnToken() { return this; }
ColumnToken.prototype = new CSSParserToken;
ColumnToken.prototype.tokenType = "||";

function EOFToken() { return this; }
EOFToken.prototype = new CSSParserToken;
EOFToken.prototype.tokenType = "EOF";
EOFToken.prototype.toCSSString = function() { return ""; }

function DelimToken(code) {
	this.value = stringFromCode(code);
	return this;
}
DelimToken.prototype = new CSSParserToken;
DelimToken.prototype.tokenType = "DELIM";
DelimToken.prototype.toString = function() { return "DELIM("+this.value+")"; }
DelimToken.prototype.toCSSString = function() {
	return (this.value == "\\") ? "\\\n" : this.value;
}

function StringValuedToken() { return this; }
StringValuedToken.prototype = new CSSParserToken;
StringValuedToken.prototype.ASCIIMatch = function(str) {
	return this.value.toLowerCase() == str.toLowerCase();
}

function IdentifierToken(val) {
	this.value = val;
}
IdentifierToken.prototype = new StringValuedToken;
IdentifierToken.prototype.tokenType = "IDENT";
IdentifierToken.prototype.toString = function() { return "IDENT("+this.value+")"; }
IdentifierToken.prototype.toCSSString = function() {
	return escapeIdent(this.value);
}

function FunctionToken(val) {
	this.value = val;
	this.mirror = ")";
}
FunctionToken.prototype = new StringValuedToken;
FunctionToken.prototype.tokenType = "FUNCTION";
FunctionToken.prototype.toString = function() { return "FUNCTION("+this.value+")"; }
FunctionToken.prototype.toCSSString = function() {
	return escapeIdent(this.value) + "(";
}
	
function AtKeywordToken(val) {
	this.value = val;
}
AtKeywordToken.prototype = new StringValuedToken;
AtKeywordToken.prototype.tokenType = "AT-KEYWORD";
AtKeywordToken.prototype.toString = function() { return "AT("+this.value+")"; }
AtKeywordToken.prototype.toCSSString = function() {
	return "@" + escapeIdent(this.value);
}

function HashToken(val) {
	this.value = val;
	this.type = "unrestricted";
}
HashToken.prototype = new StringValuedToken;
HashToken.prototype.tokenType = "HASH";
HashToken.prototype.toString = function() { return "HASH("+this.value+")"; }
HashToken.prototype.toCSSString = function() {
	var escapeValue = (this.type == "id") ? escapeIdent : escapeHash;
	return "#" + escapeValue(this.value);
}

function StringToken(val) {
this.value = val;
}
StringToken.prototype = new StringValuedToken;
StringToken.prototype.tokenType = "STRING";
StringToken.prototype.toString = function() {
	return '"' + escapeString(this.value) + '"';
}

function URLToken(val) {
	this.value = val;
}
URLToken.prototype = new StringValuedToken;
URLToken.prototype.tokenType = "URL";
URLToken.prototype.toString = function() { return "URL("+this.value+")"; }
URLToken.prototype.toCSSString = function() {
	return 'url("' + escapeString(this.value) + '")';
}

function NumberToken() {
	this.value = null;
	this.type = "integer";
	this.repr = "";
}
NumberToken.prototype = new CSSParserToken;
NumberToken.prototype.tokenType = "NUMBER";
NumberToken.prototype.toString = function() {
	if(this.type == "integer")
		return "INT("+this.value+")";
	return "NUMBER("+this.value+")";
}
NumberToken.prototype.toJSON = function() {
	var json = this.constructor.prototype.constructor.prototype.toJSON.call(this);
	json.value = this.value;
	json.type = this.type;
	json.repr = this.repr;
	return json;
}
NumberToken.prototype.toCSSString = function() { return this.repr; };

function PercentageToken() {
	this.value = null;
	this.repr = "";
}
PercentageToken.prototype = new CSSParserToken;
PercentageToken.prototype.tokenType = "PERCENTAGE";
PercentageToken.prototype.toString = function() { return "PERCENTAGE("+this.value+")"; }
PercentageToken.prototype.toCSSString = function() { return this.repr + "%"; }

function DimensionToken() {
	this.value = null;
	this.type = "integer";
	this.repr = "";
	this.unit = "";
}
DimensionToken.prototype = new CSSParserToken;
DimensionToken.prototype.tokenType = "DIMENSION";
DimensionToken.prototype.toString = function() { return "DIM("+this.value+","+this.unit+")"; }
DimensionToken.prototype.toCSSString = function() {
	var source = this.repr;
	var unit = escapeIdent(this.unit);
	if(unit[0].toLowerCase() == "e" && (unit[1] == "-" || between(unit.charCodeAt(1), 0x30, 0x39))) {
		// Unit is ambiguous with scinot
		// Remove the leading "e", replace with escape.
		unit = "\\65 " + unit.slice(1, unit.length);
	}
	return source+unit;
}

function escapeIdent(string) {
	string = ''+string;
	var result = '';
	var firstcode = string.charCodeAt(0);
	for(var i = 0; i < string.length; i++) {
		var code = string.charCodeAt(i);
		if(code == 0x0) {
			throw new InvalidCharacterError('Invalid character: the input contains U+0000.');
		}

		if(
			between(code, 0x1, 0x1f) || code == 0x7f ||
			(i == 0 && between(code, 0x30, 0x39)) ||
			(i == 1 && between(code, 0x30, 0x39) && firstcode == 0x2d)
		) {
			result += '\\' + code.toString(16) + ' ';
		} else if(
			code >= 0x80 ||
			code == 0x2d ||
			code == 0x5f ||
			between(code, 0x30, 0x39) ||
			between(code, 0x41, 0x5a) ||
			between(code, 0x61, 0x7a)
		) {
			result += string[i];
		} else {
			result += '\\' + string[i];
		}
	}
	return result;
}

function escapeHash(string) {
	// Escapes the contents of "unrestricted"-type hash tokens.
	// Won't preserve the ID-ness of "id"-type hash tokens;
	// use escapeIdent() for that.
	string = ''+string;
	var result = '';
	var firstcode = string.charCodeAt(0);
	for(var i = 0; i < string.length; i++) {
		var code = string.charCodeAt(i);
		if(code == 0x0) {
			throw new InvalidCharacterError('Invalid character: the input contains U+0000.');
		}

		if(
			code >= 0x80 ||
			code == 0x2d ||
			code == 0x5f ||
			between(code, 0x30, 0x39) ||
			between(code, 0x41, 0x5a) ||
			between(code, 0x61, 0x7a)
		) {
			result += string[i];
		} else {
			result += '\\' + code.toString(16) + ' ';
		}
	}
	return result;
}

function escapeString(string) {
	string = ''+string;
	var result = '';
	for(var i = 0; i < string.length; i++) {
		var code = string.charCodeAt(i);

		if(code == 0x0) {
			throw new InvalidCharacterError('Invalid character: the input contains U+0000.');
		}

		if(between(code, 0x1, 0x1f) || code == 0x7f) {
			result += '\\' + code.toString(16) + ' ';
		} else if(code == 0x22 || code == 0x5c) {
			result += '\\' + string[i];
		} else {
			result += string[i];
		}
	}
	return result;
}

// Exportation.
cssSyntax.tokenize = tokenize;
cssSyntax.IdentToken = IdentifierToken;
cssSyntax.IdentifierToken = IdentifierToken;
cssSyntax.FunctionToken = FunctionToken;
cssSyntax.AtKeywordToken = AtKeywordToken;
cssSyntax.HashToken = HashToken;
cssSyntax.StringToken = StringToken;
cssSyntax.BadStringToken = BadStringToken;
cssSyntax.URLToken = URLToken;
cssSyntax.BadURLToken = BadURLToken;
cssSyntax.DelimToken = DelimToken;
cssSyntax.NumberToken = NumberToken;
cssSyntax.PercentageToken = PercentageToken;
cssSyntax.DimensionToken = DimensionToken;
cssSyntax.IncludeMatchToken = IncludeMatchToken;
cssSyntax.DashMatchToken = DashMatchToken;
cssSyntax.PrefixMatchToken = PrefixMatchToken;
cssSyntax.SuffixMatchToken = SuffixMatchToken;
cssSyntax.SubstringMatchToken = SubstringMatchToken;
cssSyntax.ColumnToken = ColumnToken;
cssSyntax.WhitespaceToken = WhitespaceToken;
cssSyntax.CDOToken = CDOToken;
cssSyntax.CDCToken = CDCToken;
cssSyntax.ColonToken = ColonToken;
cssSyntax.SemicolonToken = SemicolonToken;
cssSyntax.CommaToken = CommaToken;
cssSyntax.OpenParenToken = OpenParenToken;
cssSyntax.CloseParenToken = CloseParenToken;
cssSyntax.OpenSquareToken = OpenSquareToken;
cssSyntax.CloseSquareToken = CloseSquareToken;
cssSyntax.OpenCurlyToken = OpenCurlyToken;
cssSyntax.CloseCurlyToken = CloseCurlyToken;
cssSyntax.EOFToken = EOFToken;
cssSyntax.CSSParserToken = CSSParserToken;
cssSyntax.GroupingToken = GroupingToken;

//
// css parser
//

function TokenStream(tokens) {
	// Assume that tokens is an array.
	this.tokens = tokens;
	this.i = -1;
}
TokenStream.prototype.tokenAt = function(i) {
	if(i < this.tokens.length)
		return this.tokens[i];
	return new EOFToken();
}
TokenStream.prototype.consume = function(num) {
	if(num === undefined) num = 1;
	this.i += num;
	this.token = this.tokenAt(this.i);
	//console.log(this.i, this.token);
	return true;
}
TokenStream.prototype.next = function() {
	return this.tokenAt(this.i+1);
}
TokenStream.prototype.reconsume = function() {
	this.i--;
}

function parseerror(s, msg) {
	console.log("Parse error at token " + s.i + ": " + s.token + ".\n" + msg);
	return true;
}
function donothing(){ return true; };

function consumeAListOfRules(s, topLevel) {
	var rules = new TokenList();
	var rule;
	while(s.consume()) {
		if(s.token instanceof WhitespaceToken) {
			continue;
		} else if(s.token instanceof EOFToken) {
			return rules;
		} else if(s.token instanceof CDOToken || s.token instanceof CDCToken) {
			if(topLevel == "top-level") continue;
			s.reconsume();
			if(rule = consumeAStyleRule(s)) rules.push(rule);
		} else if(s.token instanceof AtKeywordToken) {
			s.reconsume();
			if(rule = consumeAnAtRule(s)) rules.push(rule);
		} else {
			s.reconsume();
			if(rule = consumeAStyleRule(s)) rules.push(rule);
		}
	}
}

function consumeAnAtRule(s) {
	s.consume();
	var rule = new AtRule(s.token.value);
	while(s.consume()) {
		if(s.token instanceof SemicolonToken || s.token instanceof EOFToken) {
			return rule;
		} else if(s.token instanceof OpenCurlyToken) {
			rule.value = consumeASimpleBlock(s);
			return rule;
		} else if(s.token instanceof SimpleBlock && s.token.name == "{") {
			rule.value = s.token;
			return rule;
		} else {
			s.reconsume();
			rule.prelude.push(consumeAComponentValue(s));
		}
	}
}

function consumeAStyleRule(s) {
	var rule = new StyleRule();
	while(s.consume()) {
		if(s.token instanceof EOFToken) {
			parseerror(s, "Hit EOF when trying to parse the prelude of a qualified rule.");
			return;
		} else if(s.token instanceof OpenCurlyToken) {
			rule.value = consumeASimpleBlock(s);
			return rule;
		} else if(s.token instanceof SimpleBlock && s.token.name == "{") {
			rule.value = s.token;
			return rule;
		} else {
			s.reconsume();
			rule.prelude.push(consumeAComponentValue(s));
		}
	}
}

function consumeAListOfDeclarations(s) {
	var decls = new TokenList();
	while(s.consume()) {
		if(s.token instanceof WhitespaceToken || s.token instanceof SemicolonToken) {
			donothing();
		} else if(s.token instanceof EOFToken) {
			return decls;
		} else if(s.token instanceof AtKeywordToken) {
			s.reconsume();
			decls.push(consumeAnAtRule(s));
		} else if(s.token instanceof IdentifierToken) {
			var temp = [s.token];
			while(!(s.next() instanceof SemicolonToken || s.next() instanceof EOFToken))
				temp.push(consumeAComponentValue(s));
			var decl;
			if(decl = consumeADeclaration(new TokenStream(temp))) decls.push(decl);
		} else {
			parseerror(s);
			s.reconsume();
			while(!(s.next() instanceof SemicolonToken || s.next() instanceof EOFToken))
				consumeAComponentValue(s);
		}
	}
}

function consumeADeclaration(s) {
	// Assumes that the next input token will be an ident token.
	s.consume();
	var decl = new Declaration(s.token.value);
	while(s.next() instanceof WhitespaceToken) s.consume();
	if(!(s.next() instanceof ColonToken)) {
		parseerror(s);
		return;
	} else {
		s.consume();
	}
	while(!(s.next() instanceof EOFToken)) {
		decl.value.push(consumeAComponentValue(s));
	}
	var foundImportant = false;
	for(var i = decl.value.length - 1; i >= 0; i--) {
		if(decl.value[i] instanceof WhitespaceToken) {
			continue;
		} else if(decl.value[i] instanceof IdentifierToken && decl.value[i].ASCIIMatch("important")) {
			foundImportant = true;
		} else if(foundImportant && decl.value[i] instanceof DelimToken && decl.value[i].value == "!") {
			decl.value.splice(i, decl.value.length);
			decl.important = true;
			break;
		} else {
			break;
		}
	}
	return decl;
}

function consumeAComponentValue(s) {
	s.consume();
	if(s.token instanceof OpenCurlyToken || s.token instanceof OpenSquareToken || s.token instanceof OpenParenToken)
		return consumeASimpleBlock(s);
	if(s.token instanceof FunctionToken)
		return consumeAFunction(s);
	return s.token;
}

function consumeASimpleBlock(s) {
	var mirror = s.token.mirror;
	var block = new SimpleBlock(s.token.value);
	while(s.consume()) {
		if(s.token instanceof EOFToken || (s.token instanceof GroupingToken && s.token.value == mirror))
			return block;
		else {
			s.reconsume();
			block.value.push(consumeAComponentValue(s));
		}
	}
}

function consumeAFunction(s) {
	var func = new Func(s.token.value);
	while(s.consume()) {
		if(s.token instanceof EOFToken || s.token instanceof CloseParenToken)
			return func;
		else {
			s.reconsume();
			func.value.push(consumeAComponentValue(s));
		}
	}
}

function normalizeInput(input) {
	if(typeof input == "string")
		return new TokenStream(tokenize(input));
	if(input instanceof TokenStream)
		return input;
	if(input.length !== undefined)
		return new TokenStream(input);
	else throw SyntaxError(input);
}

function parseAStylesheet(s) {
	s = normalizeInput(s);
	var sheet = new Stylesheet();
	sheet.value = consumeAListOfRules(s, "top-level");
	return sheet;
}

function parseAListOfRules(s) {
	s = normalizeInput(s);
	return consumeAListOfRules(s);
}

function parseARule(s) {
	s = normalizeInput(s);
	while(s.next() instanceof WhitespaceToken) s.consume();
	if(s.next() instanceof EOFToken) throw SyntaxError();
	if(s.next() instanceof AtKeywordToken) {
		var rule = consumeAnAtRule(s);
	} else {
		var rule = consumeAStyleRule(s);
		if(!rule) throw SyntaxError();
	}
	while(s.next() instanceof WhitespaceToken) s.consume();
	if(s.next() instanceof EOFToken)
		return rule;
	throw SyntaxError();
}

function parseADeclaration(s) {
	s = normalizeInput(s);
	while(s.next() instanceof WhitespaceToken) s.consume();
	if(!(s.next() instanceof IdentifierToken)) throw SyntaxError();
	var decl = consumeADeclaration(s);
	if(!decl) { throw new SyntaxError() }
	return decl;
}

function parseAListOfDeclarations(s) {
	s = normalizeInput(s);
	return consumeAListOfDeclarations(s);
}

function parseAComponentValue(s) {
	s = normalizeInput(s);
	while(s.next() instanceof WhitespaceToken) s.consume();
	if(s.next() instanceof EOFToken) throw SyntaxError();
	var val = consumeAComponentValue(s);
	if(!val) throw SyntaxError();
	while(s.next() instanceof WhitespaceToken) s.consume();
	if(!(s.next() instanceof EOFToken)) throw new SyntaxError();
	return val;
}

function parseAListOfComponentValues(s) {
	s = normalizeInput(s);
	var vals = new TokenList();
	while(true) {
		var val = consumeAComponentValue(s);
		if(val instanceof EOFToken)
			return vals
		else
			vals.push(val);
	}
}

function parseACommaSeparatedListOfComponentValues(s) {
	s = normalizeInput(s);
	var listOfCVLs = new TokenList();
	while(true) {
		var vals = new TokenList();
		while(true) {
			var val = consumeAComponentValue(s);
			if(val instanceof EOFToken) {
				listOfCVLs.push(vals);
				return listOfCVLs;
			} else if(val instanceof CommaToken) {
				listOfCVLs.push(vals);
				break;
			} else {
				vals.push(val);
			}
		}
	}
}

function CSSParserRule() { return this; }
CSSParserRule.prototype.toString = function(indent) {
	return JSON.stringify(this,null,indent);
}

function Stylesheet() {
	this.value = new TokenList();
	return this;
}
Stylesheet.prototype = new CSSParserRule;
Stylesheet.prototype.type = "STYLESHEET";
Stylesheet.prototype.toCSSString = function() { return this.value.toCSSString("\n"); }

function AtRule(name) {
	this.name = name;
	this.prelude = new TokenList();
	this.value = null;
	return this;
}
AtRule.prototype = new CSSParserRule;
AtRule.prototype.toCSSString = function() { 
	if(this.value) {
		return "@" + escapeIdent(this.name) + " " + this.prelude.toCSSString() + this.value.toCSSString(); 
	} else {
		return "@" + escapeIdent(this.name) + " " + this.prelude.toCSSString() + '; '; 
	}
}
AtRule.prototype.toStylesheet = function() {
	return this.asStylesheet || (this.asStylesheet = this.value ? parseAStylesheet(this.value.value) : new Stylesheet());
}

function StyleRule() {
	this.prelude = new TokenList(); this.selector = this.prelude;
	this.value = null;
	return this;
}
StyleRule.prototype = new CSSParserRule;
StyleRule.prototype.type = "STYLE-RULE";
StyleRule.prototype.toCSSString = function() {
	return this.prelude.toCSSString() + this.value.toCSSString();
}
StyleRule.prototype.getSelector = function() {
	return this.prelude;
}
StyleRule.prototype.getDeclarations = function() {
	if(!(this.value instanceof SimpleBlock)) { return new TokenList(); }
	var value = this.value.value; return parseAListOfDeclarations(value);
}


function Declaration(name) {
	this.name = name;
	this.value = new TokenList();
	this.important = false;
	return this;
}
Declaration.prototype = new CSSParserRule;
Declaration.prototype.type = "DECLARATION";
Declaration.prototype.toCSSString = function() {
	return this.name + ':' + this.value.toCSSString() + '; ';
}

function SimpleBlock(type) {
	this.name = type;
	this.value = new TokenList();
	return this;
}
SimpleBlock.prototype = new CSSParserRule;
SimpleBlock.prototype.type = "BLOCK";
SimpleBlock.prototype.toCSSString = function() {
	switch(this.name) {
		case "(":
			return "(" + this.value.toCSSString() + ")";
			
		case "[":
			return "[" + this.value.toCSSString() + "]";
			
		case "{":
			return "{" + this.value.toCSSString() + "}";
		
		default: //best guess
			return this.name + this.value.toCSSString() + this.name;
	}
}

function Func(name) {
	this.name = name;
	this.value = new TokenList();
	return this;
}
Func.prototype = new CSSParserRule;
Func.prototype.type = "FUNCTION";
Func.prototype.toCSSString = function() {
	return this.name+'('+this.value.toCSSString()+')';
}
Func.prototype.getArguments = function() {
	var args = new TokenList(); var arg = new TokenList(); var value = this.value;
	for(var i = 0; i<value.length; i++) {
		if(value[i].tokenType == ',') {
			args.push(arg); arg = new TokenList();
		} else {
			arg.push(value[i])
		}
	}
	if(args.length > 0 || arg.length > 0) { args.push(arg); }
	return args;
}

function FuncArg() {
	this.value = new TokenList();
	return this;
}
FuncArg.prototype = new CSSParserRule;
FuncArg.prototype.type = "FUNCTION-ARG";
FuncArg.prototype.toCSSString = function() {
	return this.value.toCSSString()+', ';
}

// Exportation.
cssSyntax.CSSParserRule = CSSParserRule;
cssSyntax.Stylesheet = Stylesheet;
cssSyntax.AtRule = AtRule;
cssSyntax.StyleRule = StyleRule;
cssSyntax.Declaration = Declaration;
cssSyntax.SimpleBlock = SimpleBlock;
cssSyntax.Func = Func;
cssSyntax.parseAStylesheet = parseAStylesheet;
cssSyntax.parseAListOfRules = parseAListOfRules;
cssSyntax.parseARule = parseARule;
cssSyntax.parseADeclaration = parseADeclaration;
cssSyntax.parseAListOfDeclarations = parseAListOfDeclarations;
cssSyntax.parseAComponentValue = parseAComponentValue;
cssSyntax.parseAListOfComponentValues = parseAListOfComponentValues;
cssSyntax.parseACommaSeparatedListOfComponentValues = parseACommaSeparatedListOfComponentValues;
cssSyntax.parse = parseAStylesheet;
cssSyntax.parseCSSValue = parseAListOfComponentValues;

return cssSyntax;

}());
require.define('src/core/css-syntax.js');

////////////////////////////////////////

module.exports = (function() {
	
	var infinity = 9999999.0;

	// define the module
	var cssSizing = {
		
		minWidthOf: function*(element) {
		
			//
			// make the parent an infinite relative container (if necessary)
			//
			var fragment = yield element.layoutNextFragment({ });

			//
			// return the result
			//
			return Math.max(fragment.inlineSize, 25); // TODO: remove this when Ian fixes Blink

		},
		
		maxWidthOf: function*(element) {

			return infinity; // TODO: remove this when Ian fixes Blink
		
			//
			// make the parent a relative container (if necessary)
			//
			var fragment = yield element.layoutNextFragment({ availableInlineSize: infinity });

			//
			// return the result
			//
			return fragment.inlineSize;
		},

	};
	
	return cssSizing;
	
})();
require.define('src/core/css-sizing.js');

////////////////////////////////////////

//
// The Box module defines algorithms for dealing with css boxes
//
module.exports = (function() {
	
	// Original code licensed by Adobe Systems Incorporated under the Apache License 2.0. 
	// https://github.com/adobe-webplatform/brackets-css-shapes-editor/blob/master/thirdparty/CSSShapesEditor.js#L442

	var cssBox = cssBox || {};
	cssBox.getBox = 
		
		// returns {top/left/bottom/right} for 'content/padding/border/margin-box' relative to the border box top-left corner.
		function getBox(element, boxType){
			var width = element.offsetWidth,
				height = element.offsetHeight,

				style = getComputedStyle(element),

				leftBorder = parseFloat(style.borderLeftWidth),
				rightBorder = parseFloat(style.borderRightWidth),
				topBorder = parseFloat(style.borderTopWidth),
				bottomBorder = parseFloat(style.borderBottomWidth),

				leftPadding = parseFloat(style.paddingLeft),
				rightPadding = parseFloat(style.paddingRight),
				topPadding = parseFloat(style.paddingTop),
				bottomPadding = parseFloat(style.paddingBottom),

				leftMargin = parseFloat(style.marginLeft),
				rightMargin = parseFloat(style.marginRight),
				topMargin = parseFloat(style.marginTop),
				bottomMargin = parseFloat(style.marginBottom);

			var box = {
				top: 0,
				left: 0,
				width: 0,
				height: 0
			};

			switch (boxType||'border-box'){
			case 'content-box':
				box.top = topBorder + topPadding;
				box.left = leftBorder + leftPadding;
				box.width = width - leftBorder - leftPadding - rightPadding - rightBorder;
				box.height = height - topBorder - topPadding - bottomPadding - bottomBorder;
				break;

			case 'padding-box':
				box.top = topPadding;
				box.left = leftPadding;
				box.width = width - leftBorder - rightBorder;
				box.height = height - topBorder - bottomBorder;
				break;

			case 'border-box':
				box.top = 0;
				box.left = 0;
				box.width = width;
				box.height = height;
				break;

			case 'margin-box':
				box.top = 0 - topMargin;
				box.left = 0 - leftMargin;
				box.width = width + leftMargin + rightMargin;
				box.height = height + topMargin + bottomMargin;
				break;

			default:
				throw new TypeError('Invalid parameter, boxType: ' + boxType);
			}

			return box;
		};
	
	return cssBox;
	
})();
require.define('src/core/css-box.js');

////////////////////////////////////////

//
// The CSS Units module is handling conversions between units
//
module.exports = (function() {
	
	// import dependencies
	var getBox = require('src/core/css-box.js').getBox;
	
	// define the module
	var cssUnits = {
		
		// converts "cssLength" from its inherent unit to pixels, and returns the result as a float
		convertToPixels: function convertToPixels(cssLength, element, opts) {
			
			if(typeof cssLength == "string") {
			
				var match = cssLength.match(/^\s*(-?\d+(?:\.\d+)?)(\S*)\s*$/);
				var currentLength = match ? parseFloat(match[1]) : 0.0;
				var currentUnit = match ? match[2] : '';
					
			} else {
				
				var currentLength = cssLength.value;
				var currentUnit = cssLength.unit;
				
			}

			var converter = convertToPixels.converters[currentUnit];
			if (!converter) throw new Error("No suitable conversion from unit '"+currentUnit+"' to unit 'px'");
			
			var convertedLength = converter.call(null, currentLength, element||document.documentElement, opts)
			return Math.round(20*convertedLength)/20;
			
		},

		// converts "pixelLength" from pixels to "destinUnit", and returns the result as a float
		convertFromPixels: function convertFromPixels(pixelLength, destinUnit, element, opts) {

			var converter = convertFromPixels.converters[destinUnit];
			if (!converter) throw new Error("No suitable conversion to unit '"+destinUnit+"' from unit 'px'");

			var convertedLength = converter.call(null, pixelLength, element||document.documentElement, opts)
			return Math.round(20*convertedLength)/20;
			
		},
		
	}
	
	cssUnits.convertToPixels.converters = {
		'px' : function(x) { return x; },
		'in' : function(x) { return x * 96; },
		'cm' : function(x) { return x / 0.02645833333; },
		'mm' : function(x) { return x / 0.26458333333; },
		'pt' : function(x) { return x / 0.75; },
		'pc' : function(x) { return x / 0.0625; },
		'em' : function(x, e) { return x*parseFloat(e?getComputedStyle(e).fontSize:16); },
		'rem': function(x, e) { return x*parseFloat(e?getComputedStyle(e.ownerDocument.documentElement).fontSize:16); },
		'vw' : function(x, e) { return x/100*window.innerWidth; },
		'vh' : function(x, e) { return x/100*window.innerHeight; },
		'%'  : function(x, e, opts) {
			opts = opts || {};

			// get the box from which to compute the percentages
			var box = e ? cssUtils.getBox(e, opts.boxType) : {
				top: 0,
				left: 0,
				width: 0,
				height: 0
			};

			// now apply the conversion algorithm
			switch(true) {
				case opts.isRadius:
					var radius = Math.sqrt( box.height*box.height + box.width*box.width ) / Math.sqrt(2);
					return Math.round(x/100*radius);
					
				case opts.isHeightRelated:
					return x/100*box.height;
					
				case opts.isWidthRelated: default:
					return x/100*box.width;
					
			}

		}
	}

	cssUnits.convertFromPixels.converters = {
		'px' : function(x) { return x; },
		'in' : function(x) { return x / 96; },
		'cm' : function(x) { return x * 0.02645833333; },
		'mm' : function(x) { return x * 0.26458333333; },
		'pt' : function(x) { return x * 0.75; },
		'pc' : function(x) { return x * 0.0625; },
		'em' : function(x, e) { return x/parseFloat(e?getComputedStyle(e).fontSize:16); },
		'rem': function(x, e) { return x/parseFloat(e?getComputedStyle(e.ownerDocument.documentElement).fontSize:16); },
		'vw' : function(x, e) { return x*100/window.innerWidth; },
		'vh' : function(x, e) { return x*100/window.innerHeight; },
		'%'  : function(x, e, opts) {
			opts = opts || {};

			// get the box from which to compute the percentages
			var box = e ? cssUtils.getBox(e, opts.boxType) : {
				top: 0,
				left: 0,
				width: 0,
				height: 0
			};

			// now apply the conversion algorithm
			switch(true) {
				case opts.isRadius:
					var radius = Math.sqrt( box.height*box.height + box.width*box.width ) / Math.sqrt(2);
					return Math.round(x*100/radius);
					
				case opts.isHeightRelated:
					return x*100/box.height;
					
				case opts.isWidthRelated: default:
					return x*100/box.width;
					
			}


		}
	};
	
	return cssUnits;

})();
require.define('src/core/css-units.js');

////////////////////////////////////////

module.exports = (function() { "use strict";
	
	// import dependencies
	var cssSyntax = require('src/core/css-syntax.js');
	
	var cssSizing = require('src/core/css-sizing.js');
	
	var cssUnits = require('src/core/css-units.js');

	StylePropertyMapReadOnly.prototype.getPropertyValue=function(propertyName) {
		var value = this.get(propertyName);
		if(value === null) return ""
		return value.toString();
	}
	
	// define the module
	var LOCATE_AUTO = 0;
	var LOCATE_LINE = 1;
	var LOCATE_SPAN = 2;
	var LOCATE_AREA = 3;
	
	var ALIGN_START  = 0;
	var ALIGN_CENTER = 1;
	var ALIGN_END    = 2;
	var ALIGN_FIT    = 3;
	
	var TRACK_BREADTH_AUTO        = 0;
	var TRACK_BREADTH_LENGTH      = 1;
	var TRACK_BREADTH_FRACTION    = 2;
	var TRACK_BREADTH_PERCENTAGE  = 3;
	var TRACK_BREADTH_MIN_CONTENT = 4;
	var TRACK_BREADTH_MAX_CONTENT = 5;
	
	function GridTrackBreadth() {
		this.minType = TRACK_BREADTH_AUTO;
		this.minValue = "auto";
		this.maxType = TRACK_BREADTH_AUTO;
		this.maxValue = "auto";
	}
	
	GridTrackBreadth.prototype = {
		toString: function() {
			if(this.minType==this.maxType && this.minValue==this.maxValue) {
				switch(this.minType) {
					case TRACK_BREADTH_AUTO: return "auto";
					case TRACK_BREADTH_LENGTH: return this.minValue+"px";
					case TRACK_BREADTH_FRACTION: return this.minValue+"fr";
					case TRACK_BREADTH_PERCENTAGE: return this.minValue+"%";
					case TRACK_BREADTH_MIN_CONTENT: return "min-content";
					case TRACK_BREADTH_MAX_CONTENT: return "max-content";
				}
			} else {
				var min = "auto";
				var max = "auto";
				switch(this.minType) {
					case TRACK_BREADTH_AUTO: min = "auto"; break;
					case TRACK_BREADTH_LENGTH: min = this.minValue+"px"; break;
					case TRACK_BREADTH_FRACTION: min = this.minValue+"fr"; break;
					case TRACK_BREADTH_PERCENTAGE: min = this.minValue+"%"; break;
					case TRACK_BREADTH_MIN_CONTENT: min = "min-content"; break;
					case TRACK_BREADTH_MAX_CONTENT: min = "max-content"; break;
				}
				switch(this.maxType) {
					case TRACK_BREADTH_AUTO: max = "auto"; break;
					case TRACK_BREADTH_LENGTH: max = this.maxValue+"px"; break;
					case TRACK_BREADTH_FRACTION: max = this.maxValue+"fr"; break;
					case TRACK_BREADTH_PERCENTAGE: max = this.maxValue+"%"; break;
					case TRACK_BREADTH_MIN_CONTENT: max = "min-content"; break;
					case TRACK_BREADTH_MAX_CONTENT: max = "max-content"; break;
				}
				return "minmax(" + min + ", " + max + ")";
			}
		},
		setValue: function(type, val) {
			this.minType  = this.maxType  = type;
			this.minValue = this.maxValue = val;
		},
		setMaxValue: function(type, val) {
			this.maxType  = type;
			this.maxValue = val;
		},
		setMinValue: function(type, val) {
			this.minType  = type;
			this.minValue = val;
		}
	}
	
	function GridItemPosition(type, name, index) {
		this.type = type|LOCATE_AUTO;
		this.name = name;
		this.index = index|0;
	}
	
	GridItemPosition.prototype = {
		extractXLineIndex: function(grid, TODO_args) {
			throw "Not implemented";
		},
		extractYLineIndex: function(grid, TODO_args) {
			throw "Not implemented";
		},
		toString: function() {
			
		}
	}
	
	function GridItem(element, parentGrid) {
		
		this.element = element;
		this.parentGrid = element.parentGridLayout = parentGrid;
		
		this.reset();
		this.buggy = true;
		
	}
	
	GridItem.prototype = {
		
		dispose: function() {
			this.element.parentGridLayout = undefined;
		},
		
		reset: function() {
			
			this.order = 0;
			
			this.minWidth = 0;
			this.maxWidth = 0;
			
			this.hlMargin = 0;
			this.hrMargin = 0;
			this.vtMargin = 0;
			this.vbMargin = 0;
			
			this.hMargins = 0;
			this.vMargins = 0;
			this.hPaddings = 0;
			this.vPaddings = 0;
			this.hBorders = 0;
			this.vBorders = 0;
			
			this.xStart = -1;
			this.xEnd = -1;
			
			this.specifiedXStart = this.specifiedXStart || new GridItemPosition();
			this.specifiedXStart.type = LOCATE_AUTO;
			this.specifiedXStart.name = undefined;
			this.specifiedXStart.index = undefined;
			
			this.specifiedXEnd = this.specifiedXEnd || new GridItemPosition();
			this.specifiedXEnd.type = LOCATE_AUTO;
			this.specifiedXEnd.name = undefined;
			this.specifiedXEnd.index = undefined;

			
			this.yStart = -1;
			this.yEnd = -1;
			
			this.specifiedYStart = this.specifiedYStart || new GridItemPosition();
			this.specifiedYStart.type = LOCATE_AUTO;
			this.specifiedYStart.name = undefined;
			this.specifiedYStart.index = undefined;
			
			this.specifiedYEnd = this.specifiedYEnd || new GridItemPosition();
			this.specifiedYEnd.type = LOCATE_AUTO;
			this.specifiedYEnd.name = undefined;
			this.specifiedYEnd.index = undefined;
			
			this.marginAlignX = ALIGN_CENTER;
			this.marginAlignY = ALIGN_CENTER;
			
			this.paddingAlignX = ALIGN_FIT;
			this.paddingAlignY = ALIGN_FIT;
			
			
		},
	
		updateFromElement: function*() {
			
			var element = this.element;
			var usedStyle = element.styleMap;
			
			this.reset(); 
			this.buggy = false;
			
			// compute order property
			this.order = parseInt(usedStyle.getPropertyValue('order'))|0;
			
			// compute size
			this.minWidth = yield* cssSizing.minWidthOf(element);
			this.maxWidth = yield* cssSizing.maxWidthOf(element);

			this.hlMargin = parseInt(usedStyle.getPropertyValue("margin-left"));
			this.hrMargin = parseInt(usedStyle.getPropertyValue("margin-right"));
			this.vtMargin = parseInt(usedStyle.getPropertyValue("margin-top"));
			this.vbMargin = parseInt(usedStyle.getPropertyValue("margin-bottom"));
			
			this.hMargins = this.hlMargin + this.hrMargin;
			this.vMargins = this.vtMargin + this.vbMargin;
			this.hPaddings = parseInt(usedStyle.getPropertyValue('padding-left')) + parseInt(usedStyle.getPropertyValue('padding-right'));
			this.vPaddings = parseInt(usedStyle.getPropertyValue('padding-top')) + parseInt(usedStyle.getPropertyValue('padding-bottom'));
			this.hBorders = parseInt(usedStyle.getPropertyValue('border-left-width')) + parseInt(usedStyle.getPropertyValue('border-right-width'));
			this.vBorders = parseInt(usedStyle.getPropertyValue('border-top-width')) + parseInt(usedStyle.getPropertyValue('border-bottom-width'));
			
			// locate x and y lines together
			if(usedStyle.getPropertyValue("--grid-area")) {
				var parts = usedStyle.getPropertyValue("--grid-area").split('/');
				var is_ident = /^\s*([a-z][-_a-z0-9]*)\s*$/i;
				var row_start = parts[0] || 'auto';
				var col_start = parts[1] || (is_ident.test(row_start) ? row_start : 'auto');
				var row_end = parts[2] || (is_ident.test(row_start) ? row_start : 'auto');
				var col_end = parts[3] || (is_ident.test(col_start) ? col_start : 'auto');
				this.parseLocationInstructions(this.specifiedXStart, this.specifiedXEnd, col_start + " / " + col_end);
				this.parseLocationInstructions(this.specifiedYStart, this.specifiedYEnd, row_start + " / " + row_end);
			}
			
			// locate x lines
			if(usedStyle.getPropertyValue("--grid-column") || usedStyle.getPropertyValue("--grid-column-start") || usedStyle.getPropertyValue("--grid-column-end")) {
				var parts = usedStyle.getPropertyValue("--grid-column").split('/');
				var start = usedStyle.getPropertyValue("--grid-column-start") || parts[0] || 'auto';
				var end   = usedStyle.getPropertyValue("--grid-column-end") || parts[1] || parts[0] || start;
				this.parseLocationInstructions(this.specifiedXStart, this.specifiedXEnd, start + " / " + end);
			}
			
			// locate y lines
			if(usedStyle.getPropertyValue("--grid-row") || usedStyle.getPropertyValue("--grid-row-start") || usedStyle.getPropertyValue("--grid-row-end")) {
				var parts = usedStyle.getPropertyValue("--grid-row").split('/');
				var start = usedStyle.getPropertyValue("--grid-row-start") || parts[0];
				var end   = usedStyle.getPropertyValue("--grid-row-end") || parts[1] || parts[0];
				this.parseLocationInstructions(this.specifiedYStart, this.specifiedYEnd, start + " / " + end);
			}
			
			// FIXME: is it possible to understand cascading here, and not use a fixed order?
			// TODO: other positioning methods
			
		},
		
		parseLocationInstructions: function(specifiedStart, specifiedEnd, cssText) {
			
			var unfiltred_value = cssSyntax.parseCSSValue(cssText);
			var value = unfiltred_value.filter(function(o) { return !(o instanceof cssSyntax.WhitespaceToken); });
			value.toCSSString = function() { return unfiltred_value.toCSSString(); }
			var I = 0;
			
			var updateNameOrIndex = function(data) {
				if(value[I] instanceof cssSyntax.IdentifierToken) {
					
					// grid-column: C;
					if(data.name) { 
						// duplicate line-name value
						console.error("INVALID DECLARATION: grid-column/row: "+value.toCSSString()+" (duplicate line name)");
						this.buggy = true;
						return true;
					}
					data.name = value[I++].value;
					return false;
					
				} else if(value[I] instanceof cssSyntax.NumberToken) {
					
					// grid-column: 3
					data.index = value[I].value|0;
					
					// only accept integer values
					if(value[I].value != data.index) {
						console.error("INVALID DECLARATION: grid-column/row: "+value.toCSSString()+" (non-integer number)");
						this.buggy = true;
						return true;
					}
					
					// do not accept zero
					if(data.index == 0) {
						console.error("INVALID DECLARATION: grid-column/row: "+value.toCSSString()+" (line index can't be zero)");
						this.buggy = true;
						return true;
					}
					
					// do not accept negative spans
					if(data.index <= 0 && data.type == LOCATE_SPAN) {
						console.error("INVALID DECLARATION: grid-column/row: "+value.toCSSString()+" (negative spans not allowed)");
						this.buggy = true;
						return true;
					}
					
					I++;
					
					return false;
					
				} else if(value[I] instanceof cssSyntax.DelimToken && value[I].value == "/") {
					
					// break grid-column-start detection
					return true;
					
				} else {
					
					// this is wrong
					console.error("INVALID DECLARATION: grid-column/row: "+value.toCSSString()+" (invalid token)");
					this.buggy = true;
					return true;
					
				}
			};
			
			var gatherNameIndexPair = function(data) {

				// first token to be analyzed (may be either kind)
				updateNameOrIndex.call(this, data);
				
				// abort if no second token or buggy
				if(this.buggy || !value[I]) { return; }
			
				// second token to be analyzed (will have to be the other kind)
				updateNameOrIndex.call(this, data);
				
			}
			
			if(!value[I]) { console.error("INVALID DECLARATION: grid-column/row: "+value.toCSSString()+" (empty declaration)"); this.buggy = true; return; }
			

			// first part
			gridColumnStart: while(true) {
				if(value[I] instanceof cssSyntax.IdentifierToken) {
					
					if(value[I].value == "span") {
						
						if(!value[++I]) {console.error("INVALID DECLARATION: grid-column/row: "+value.toCSSString()+" (span is not a valid line name, more tokens expected)"); this.buggy = true; return; }
						
						specifiedStart.type = LOCATE_SPAN;
						specifiedStart.name = undefined;
						specifiedStart.index = undefined;
						gatherNameIndexPair.call(this, specifiedStart);
						if(this.buggy) { return; }
						break;
					
					} else if(value[I].value == "auto") {
						
						specifiedStart.type = LOCATE_AUTO;
						specifiedStart.name = undefined;
						specifiedStart.index = undefined;
						I++; break;
						
					} else {
					
						// grid-column: start-line...
						specifiedStart.type = LOCATE_LINE;
						specifiedStart.name = undefined;
						specifiedStart.index = undefined;
						gatherNameIndexPair.call(this, specifiedStart);
						if(this.buggy) { return; }

						break;
					
					}
					
				} else if(value[I] instanceof cssSyntax.DelimToken && value[I].value == "/") {
					
					// this is wrong
					console.error("INVALID DECLARATION: grid-column/row: "+value.toCSSString()+" (no token to analyze before the slash token)");
					this.buggy = true;
					return;
					
				} else {
					
					specifiedStart.type = LOCATE_LINE;
					gatherNameIndexPair.call(this, specifiedStart);
					if(this.buggy) { return; }
					
					break;
					
				}
				
				break;
			}
			
			// test whether there is a second part
			if(value[I]) {
				
				if(value[I] instanceof cssSyntax.DelimToken && value[I].value == "/") {
					
					// second part will start now
					if(!value[++I]) {
						// unexpected lack token at the start of the second part
						console.error("INVALID DECLARATION: grid-column/row: "+value.toCSSString()+" (expected at least one more token after the slash token)");
						this.buggy = true; 
						return;
					}
					
				} else {
				
					// unexpected token at the end of the first part
					console.error("INVALID DECLARATION: grid-column/row: "+value.toCSSString()+" (expected slash / or end of declaration)");
					this.buggy = true; 
					return;
					
				}
				
			} else {
				
				// end of declaration
				if(specifiedStart.type == LOCATE_LINE && specifiedStart.name != undefined && specifiedStart.index == undefined) {
					// a value consisting of a custom ident is duplicated to the other side
					specifiedEnd.type = LOCATE_LINE;
					specifiedEnd.name = specifiedStart.name;
					specifiedEnd.index = undefined;
				} else {
					// the default value (auto) is a 1-line span in all other cases
					specifiedEnd.type = LOCATE_AUTO;
					specifiedEnd.name = undefined;
					specifiedEnd.index = undefined;
				}
				
			}
			
			// second part (after the "/" token)
			gridColumnEnd: while(value[I]) {
				
				if(value[I] instanceof cssSyntax.IdentifierToken) {
					
					if(value[I].value == "span") {
						
						if(!value[++I]) {console.error("INVALID DECLARATION: grid-column/row: "+value.toCSSString()+" (span is not a valid line name, more tokens expected)"); this.buggy = true; return; }
						
						specifiedEnd.type = LOCATE_SPAN;
						specifiedEnd.name = undefined;
						specifiedEnd.index = undefined;
						gatherNameIndexPair.call(this, specifiedEnd);
						if(this.buggy) { return; }
					
					} else if(value[I].value == "auto") {
						
						specifiedEnd.type = LOCATE_AUTO;
						specifiedEnd.name = undefined;
						specifiedEnd.index = undefined;
						I++; break;
						
					} else {
					
						// grid-column: start-line...
						specifiedEnd.type = LOCATE_LINE;
						specifiedEnd.name = undefined;
						specifiedEnd.name = undefined;
						specifiedEnd.index = undefined;
						gatherNameIndexPair.call(this, specifiedEnd);
						if(this.buggy) { return; }

						break;
					
					}
					
				} else if(value[I] instanceof cssSyntax.DelimToken && value[I].value == "/") {
					
					// this is wrong
					console.error("INVALID DECLARATION: grid-column/row: "+value.toCSSString()+" (no token to analyze before the slash token)");
					this.buggy = true;
					return;
					
				} else {
					
					specifiedEnd.type = LOCATE_LINE;
					gatherNameIndexPair.call(this, specifiedEnd);
					if(this.buggy) { return; }
					
					break;
					
				}
				
				break;					
			}
			
			if(value[I]) {
				console.error("INVALID DECLARATION: grid-column/row: "+value.toCSSString()+" (tokens after end)");
				this.buggy = true; 
				return;
			}
			
			// If the <integer> is omitted, it defaults to 1.
			//if(specifiedStart.name && specifiedStart.index == undefined) { specifiedStart.index = 1; }
			//if(specifiedEnd.name && specifiedEnd.index == undefined) { specifiedEnd.index = 1; }
			
			// If both grid-row/column-start and grid-row/column-end specify a span, the end span is ignored. 
			if(specifiedEnd.type == LOCATE_SPAN && specifiedStart.type == LOCATE_SPAN) { specifiedEnd.type = LOCATE_AUTO; specifiedEnd.index = undefined; specifiedEnd.name = undefined; }
			
			return [specifiedStart, specifiedEnd];
			
		},
		
	
	};	

	function GridLayout(element) {
	
		// items
		this.element = element; this.element.gridLayout = this;
		this.items = []; // array of GridItem

		// reset
		this.reset();
				
	}
	
	GridLayout.prototype = {
	
		reset: function() {
			
			// layout exclusion style
			this.hlPadding = 0;
			this.hrPadding = 0;
			this.vtPadding = 0;
			this.vbPadding = 0;
			this.hPaddings = 0;
			this.vPaddings = 0;
			
			// computed
			this.xLines = []; // array of array of names
			this.xSizes = []; // array of numbers (in pixels)
			
			this.yLines = [];
			this.ySizes = [];

			this.growX = false;
			this.growY = true;
			this.growDense = false;
			
			this.rcMatrix = []; // array of array of (whatever is not undefined, probably "true")
			
			// specified
			this.specifiedXLines = [];
			this.specifiedXSizes = [];
			
			this.specifiedYLines = [];
			this.specifiedYSizes = [];
			
			this.defaultXSize = new GridTrackBreadth();
			this.defaultYSize = new GridTrackBreadth();

		},
	
		R: function R(x,y) { 
			if(this.growY) {
				// we grow by adding rows (normal behavior)
				return y;
			} else {
				// we grow by adding columns (inversed behavior)
				return x;
			}
		},
		
		C: function C(x,y) { 
			if(this.growY) {
				// we grow by adding rows (normal behavior)
				return x;
			} else {
				// we grow by adding columns (inversed behavior)
				return y;
			}
		},
		
		dispose: function() {
			for(var i = this.items.length; i--;) { var item = this.items[i];
				item.dispose();
			}
			this.element.gridLayout = undefined;
		},
		
		updateFromElement: function*() {
			
			// delete old items
			for(var i = this.items.length; i--;) { var item = this.items[i];
				item.dispose();
			}
			
			// add new items
			this.items.length = 0;
			this.items = this.element.children.map(child => new cssGrid.GridItem(child, this));
			for(var newGridItem of this.items) {
				yield* newGridItem.updateFromElement();
			}

			// sort them by css order (desc) then by dom order (asc)
			var sortableItems = this.items.map(function(item, i) { return { item: item, order: item.order, position: i } });
			sortableItems.sort(function(a,b) { if(a.order==b.order) { return a.position-b.position } else if(a.order>b.order) { return +1 } else { return -1; } });
			this.items = sortableItems.map(function(data) { return data.item; });
			
			// reset the style
			this.reset();
			
			// update its own style
			var usedStyle = this.element.styleMap; var cssText = '';
			if(cssText=usedStyle.getPropertyValue("--grid-template"))         { this.parseGridTemplate(cssText);    }
			if(cssText=usedStyle.getPropertyValue("--grid-template-rows"))    { this.parseRowsTemplate(cssText);    }
			if(cssText=usedStyle.getPropertyValue("--grid-template-columns")) { this.parseColumnsTemplate(cssText); }
			if(cssText=usedStyle.getPropertyValue("--grid-template-areas"))   { this.parseAreasTemplate(cssText);   }
			if(cssText=usedStyle.getPropertyValue("--grid-auto-rows")) { this.parseAutoRowsBreadth(cssText); }
			if(cssText=usedStyle.getPropertyValue("--grid-auto-columns")) { this.parseAutoColumnsBreadth(cssText); }
			if(cssText=usedStyle.getPropertyValue("--grid-auto-flow")) { // FIXME: should be in a function
				
				// FIXME: not a real parse...
				var tokens = cssText.trim().toLowerCase().split(/\s+/g);
				
				// direction
				if(tokens.indexOf('row')>=0) {
					this.growX = false;
					this.growY = true;
				} else if(tokens.indexOf('column')>=0) {
					this.growX = true;
					this.growY = false;
				}
				
				// algorithm
				// FIXME: should also support 'stack' (wtf)
				if(tokens.indexOf('dense')>=0) {
					this.growDense = true;
				} else {
					this.growDense = false;
				}
				
			}
			
			this.hlPadding = parseInt(usedStyle.getPropertyValue('border-left-width')) + parseInt(usedStyle.getPropertyValue('padding-left'));
			this.hrPadding = parseInt(usedStyle.getPropertyValue('border-right-width')) + parseInt(usedStyle.getPropertyValue('padding-right'));
			this.vtPadding = parseInt(usedStyle.getPropertyValue('border-top-width')) + parseInt(usedStyle.getPropertyValue('padding-top'));
			this.vbPadding = parseInt(usedStyle.getPropertyValue('border-bottom-width')) + parseInt(usedStyle.getPropertyValue('padding-bottom'));

			this.hPaddings = this.hlPadding + this.hrPadding;
			this.vPaddings = this.vtPadding + this.vbPadding;
			
		},
		
		resetItems: function() {
			for(var i = this.items.length; i--;) {
				var item = this.items[i]; 
				item.xStart = item.xEnd = item.yStart = item.yEnd = -1;
			}
		},
		
		resetLinesToSpecified: function() {
			this.xLines = this.specifiedXLines.slice(0);
			this.xSizes = this.specifiedXSizes.slice(0);
			this.yLines = this.specifiedYLines.slice(0);
			this.ySizes = this.specifiedYSizes.slice(0);
		},
		
		parseTrackBreadthToken: function(cssToken) {
			
			// try to match a pattern
			if(cssToken instanceof cssSyntax.IdentifierToken) {
				
				if(cssToken.value == "auto") {
					return { type: TRACK_BREADTH_AUTO, value:"auto" };
				} else if(cssToken.value == "min-content") {
					return { type: TRACK_BREADTH_MIN_CONTENT, value:"min-content" };
				} else if(cssToken.value == "max-content") {
					return { type: TRACK_BREADTH_MAX_CONTENT, value:"max-content" };
				}
				
			} else if(cssToken instanceof cssSyntax.DimensionToken) {
				
				if(cssToken.unit == "fr") {
					return { type: TRACK_BREADTH_FRACTION, value:cssToken.value };
				} else {
					return { type: TRACK_BREADTH_LENGTH, value:cssUnits.convertToPixels(cssToken.toCSSString(), this.element) };
				}
				
			} else if(cssToken instanceof cssSyntax.PercentageToken) {
				
				return { type: TRACK_BREADTH_PERCENTAGE, value:cssToken.value };
				
			} else {
				
				// TODO: recognize "calc()", too
				
			}
			
			return null;
		},
		
		parseTrackBreadth: function(value, I) {
		
			// TODO: try catch on null parsed token
			var buggy = false;
			
			var currentTrackBreadth = new GridTrackBreadth();
			var parseTrackBreadthToken = function() {
				
				// try to match a pattern
				var result = this.parseTrackBreadthToken(value[I]);
				if(result) { I++; return result; }
				
				// no pattern matched, so the declaration is invalid:
				console.error("INVALID DECLARATION: grid-template-rows/columns: "+value.toCSSString()+" (unrecognized track breadth)");
				buggy = true;
				return;
				
			}
			
			if(value[I] instanceof cssSyntax.Func && value[I].name=="minmax") {
				
				// we need to parse two subvalues
				var value_backup = value;
				var I_backup = I;
				
				// check we have exactly two arguments
				var args = value_backup[I_backup].getArguments();
				if(args.length != 2) { 
					console.error("INVALID DECLARATION: grid-template-rows/columns: "+value_backup.toCSSString()+" (invalid number of arguments to the minmax function)");
					buggy = true;
					return;
				}
				
				// here's the first one:
				value = args[0].filter(function(t) { return !(t instanceof cssSyntax.WhitespaceToken) }); I = 0;				
				var data = parseTrackBreadthToken.call(this);
				currentTrackBreadth.minType = data.type;
				currentTrackBreadth.minValue = data.value;
				
				// here's the second one:
				value = args[1].filter(function(t) { return !(t instanceof cssSyntax.WhitespaceToken) }); I = 0;				
				var data = parseTrackBreadthToken.call(this);
				currentTrackBreadth.maxType  = data.type;
				currentTrackBreadth.maxValue = data.value;
				
				// restore context
				value = value_backup;
				I = I_backup+1;
				
			} else {
			
				// we need to parse only one value
				var data = parseTrackBreadthToken.call(this);
				currentTrackBreadth.minType  = currentTrackBreadth.maxType  = data.type;
				currentTrackBreadth.minValue = currentTrackBreadth.maxValue = data.value;

			}
				
			return { result: currentTrackBreadth, I:I };
			
		},
		
		parseAutoRowsBreadth: function(cssText) {
		
			// TODO: check that no tokens are left when the parsing is done (+columns)
			
			// parse value into tokens:
			var unfiltred_value = cssSyntax.parseCSSValue(cssText);
			var value = unfiltred_value.filter(function(o) { return !(o instanceof cssSyntax.WhitespaceToken); });
			value.toCSSString = function() { return unfiltred_value.toCSSString(); }
			
			// parse tokens into data:
			var data = this.parseTrackBreadth(value, 0);
			if(data.result) { this.defaultYSize = data.result; } else { throw "TODO: better error message"; }
			return;
			
		},
		
		parseAutoColumnsBreadth: function(cssText) {
			
			// parse value into tokens:
			var unfiltred_value = cssSyntax.parseCSSValue(cssText);
			var value = unfiltred_value.filter(function(o) { return !(o instanceof cssSyntax.WhitespaceToken); });
			value.toCSSString = function() { return unfiltred_value.toCSSString(); }
			
			// parse tokens into data:
			var data = this.parseTrackBreadth(value, 0);
			if(data.result) { this.defaultXSize = data.result; } else { throw "TODO: better error message"; }
			return;
			
		},
		
		parseGridTemplate: function(cssText) { // TODO: I used some lazy heuristics here
			var buggy = false; 
		
			// step 1: columns are defined before the slash, if any
			var cssText = cssText.replace(/\/\*(.*?)\*\//g,"");
			var cssTextSections = cssText.split("/");
			if(cssTextSections.length == 2) {
				if(this.parseColumnsTemplate(cssTextSections[0])) { return buggy=true; }
				cssText = cssTextSections[1];
			}
			
			// check that the syntax makes sense
			else if(cssTextSections.length >= 3) { 
				return buggy=true;
			}
			
			// check if we can find any string
			if(/"|'/.test(cssText)) {
			
				// extract strings from the value
				var strings = [];
				cssText = cssText.replace(/\s*("(?:.*?)"|'(?:.*?)')\s*([-_a-zA-Z0-9]*)\s*/g,function(data,str,size) { strings.push(str); return ' '+(size||"auto")+' '; });
				
				// remove duplicate line name blocks
				cssText = cssText.replace(/\)\s*\(/g," ");
				
				// parse rows now
				if(this.parseRowsTemplate(cssText)) { return buggy=true; }
				
				// parse areas now
				if(this.parseAreasTemplate(strings.join(' '))) { return buggy=true; }
			
			} else {
				
				// parse rows now
				if(this.parseRowsTemplate(cssText)) { return buggy=true; }
				
			}
			
			return buggy;
			
		},
		
		parseAreasTemplate: function(cssText) {
			
			// parse value into tokens:
			var unfiltred_value = cssSyntax.parseCSSValue(cssText);
			var value = unfiltred_value.filter(function(o) { return !(o instanceof cssSyntax.WhitespaceToken); });
			value.toCSSString = function() { return unfiltred_value.toCSSString(); }
			
			// parse tokens into data:
			var I = 0;
			var buggy = false;
			var regexp = /^([-_a-zA-Z0-9]+|[.]+)\s*/;
			var grid = [], areas = Object.create(null);
			while(value[I]) {
				
				var str = ''+value[I++].value;
				
				var columns = [];
				while(str!=='') {
					
					// extract next token
					var data = regexp.exec(str); if(!data || data.length != 2) { return buggy=true; }
					str = str.substr(data[0].length); var cell = data[1];
					
					// update cell max pos (ignore empty cells)
					if(cell!='.' && cell[0]!='.') {
						if(!areas[cell]) { areas[cell] = { xStart:columns.length, xEnd:columns.length+1, yStart: I-1, yEnd: I }; }
						if(areas[cell].xStart > columns.length) { return buggy=true; } 
						if(areas[cell].yStart > I-1) { return buggy=true; }
						areas[cell].xEnd = Math.max(areas[cell].xEnd, columns.length+1);
						areas[cell].yEnd = Math.max(areas[cell].yEnd, I);
					}
					// add the cell to this row
					columns.push(data[1]);
					
				}
				
				grid.push(columns);
				
			}
			
			// validate areas
			for(var a in areas) {
				var area = areas[a];
				for(var y = area.yStart; y<area.yEnd; y++) {
					for(var x = area.xStart; x<area.xEnd; x++) {
						if(grid[y][x] != a) { return buggy=true; }
					}
				}
			}
			
			// add autogenerated line names
			for(var a in areas) {
				var area = areas[a];
				
				// make sure we have enough y lines for the areas to fit:
				while(this.specifiedYLines.length<=area.yEnd) {
					this.specifiedYLines.push([]);
					this.specifiedYSizes.push(this.defaultYSize);
				}
				
				// add the y line name
				this.specifiedYLines[area.yStart].push(a+"-start");
				this.specifiedYLines[area.yEnd].push(a+"-end");
				
				// make sure we have enough x lines for the areas to fit:
				while(this.specifiedXLines.length<=area.xEnd) {
					this.specifiedXLines.push([]);
					this.specifiedXSizes.push(this.defaultXSize);
				}
				
				// add the x line name
				this.specifiedXLines[area.xStart].push(a+"-start");
				this.specifiedXLines[area.xEnd].push(a+"-end");
				
			}

		},
		
		parseTrackDefinitions: function(lineNames, trackBreadths, cssText) {
			
			// replace the repeat() function by its full representation
			cssText = cssText.replace(/\[/g,'(').replace(/\]/g,')').replace(/repeat\(\s*([0-9]+)\s*\,((?:\([^()]*\)|[^()])+)\)/gi, function(s, n, v) {
				var result = ' ';
				for(var i = parseInt(n); i--;) { 
					result += v + ' ';
				}
				return result;
			});
			'TODO: improve the repeat support';
			
			// merge duplicate name-definitions
			cssText = cssText.replace(/\)\s*\(/g, ' ');
			'TODO: improve the duplicate name-definitions support';
			
			// parse value into tokens:
			var unfiltred_value = cssSyntax.parseCSSValue(cssText);
			var value = unfiltred_value.filter(function(o) { return !(o instanceof cssSyntax.WhitespaceToken); });
			value.toCSSString = function() { return unfiltred_value.toCSSString(); }
			
			// parse tokens into data:
			var I = 0;
			var buggy = false;
			
			var parseLineNames = function() {
				
				var currentLineNames = []; // array of string
				
				if(value[I] instanceof cssSyntax.SimpleBlock && value[I].name == "(") {
					var tokens = value[I].value;
					for(var J=tokens.length; J--;) {
						
						if (tokens[J] instanceof cssSyntax.IdentifierToken) {
							currentLineNames.push(tokens[J].value);
						} else if (tokens[J] instanceof cssSyntax.WhitespaceToken) {
							// ignore
						} else {
							// unrecognized token, so the declaration is invalid:
							console.error("INVALID DECLARATION: grid-template-rows/columns: "+value.toCSSString()+" (unrecognized line name)");
							buggy = true;
							return;
						}
						
					}
					
					I++;
				}
				
				lineNames.push(currentLineNames); 
				currentLineNames = [];
				
			};
			
			var parseTrackBreadth = function() {
				
				var data = this.parseTrackBreadth(value, I);
				trackBreadths.push(data.result);
				I = data.I;
				
			};
			
			parseLineNames(); 
			while(value[I]) {
				parseTrackBreadth.call(this); if(buggy) { break; }
				parseLineNames(); if(buggy) { break; }
			}
			
		},
		
		parseColumnsTemplate: function(cssText) {
			return this.parseTrackDefinitions(this.specifiedXLines, this.specifiedXSizes, cssText);
		},
		
		parseRowsTemplate: function(cssText) {
			return this.parseTrackDefinitions(this.specifiedYLines, this.specifiedYSizes, cssText);
		},
		
		parseTracksTemplate: function(columnsTemplate, rowsTemplate, areasTemplate) {
			if(rowsTemplate   ) this.parseRowsTemplate(rowsTemplate);
			if(columnsTemplate) this.parseColumnsTemplate(columnsTemplate);
			if(areasTemplate  ) this.parseAreasTemplate(areasTemplate);
		},
		
		buildExplicitMatrix: function() {
			
			// reset
			this.resetLinesToSpecified();
			this.rcMatrix = [];
			
			// simple autogrow
			if(this.growY) {
				this.ensureRows(this.ySizes.length);
				this.ensureColumns(this.xSizes.length);
			} else {
				this.ensureColumns(this.xSizes.length);
				this.ensureRows(this.ySizes.length);
			}
			
		}, 
		
		buildImplicitMatrix: function() { /* see http://dev.w3.org/csswg/css-grid/#auto-placement-algo */
		
			// start by building the explicit matrix
			this.buildExplicitMatrix();
			
			// [1] position non-auto items
			this.positionNonAutoItems();
			
			// [2] position auto-in-column-only items
			this.positionAutoInColumnOnlyItems();
			
			// [3] make room for implicit tracks
			this.autoGrow();
			
		},
		
		ensureRows: function(yEnd) {
			
			if(this.growY) {
				
				// add rows as necessary
				while(this.ySizes.length<yEnd) {
					this.ySizes.push(this.defaultYSize);
				}
				while(this.rcMatrix.length<yEnd) {
					this.rcMatrix.push([]);
				}
				
			} else {
				
				// add rows as necessary
				while(this.ySizes.length<yEnd) {
					this.ySizes.push(this.defaultYSize);
				}
				
				// walk through columns
				for(var x = this.rcMatrix.length; x--;) {
				
					// add rows as necessary
					if(this.rcMatrix[x].length < yEnd) {
						this.rcMatrix[x].length = yEnd;
					}
					
				}
				
			}
			
		},
		
		ensureColumns: function(xEnd) {
			
			if(this.growY) {
			
				// add columns as necessary
				while(this.xSizes.length<xEnd) {
					this.xSizes.push(this.defaultXSize);
				}
				
				// walk through rows
				for(var y = this.rcMatrix.length; y--;) {
				
					// add columns as necessary
					if(this.rcMatrix[y].length < xEnd) {
						this.rcMatrix[y].length = xEnd;
					}
					
				}
			
			} else {
				
				// add columns as necessary
				while(this.xSizes.length<xEnd) {
					this.xSizes.push(this.defaultXSize);
				}
				while(this.rcMatrix.length<xEnd) {
					this.rcMatrix.push([]);
				}
			
			}
		},
		
		markAsOccupied: function(item) {
			
			var xStart = item.xStart;
			var yStart = item.yStart;
			var xEnd = item.xEnd;
			var yEnd = item.yEnd;
		
			// let's check the rcMatrix mode we're in:
			if(this.growY) {
				
				// add rows as necessary
				this.ensureRows(yEnd);
				
				// walk through rows
				for(var y = yStart; y<yEnd; y++) {
				
					// add columns as necessary
					if(this.rcMatrix[y].length < xEnd-1) {
						this.rcMatrix[y].length = xEnd-1;
					}
					
					// walk through columns
					for(var x = xStart; x<xEnd; x++) {
						
						// the cell is occupied
						this.rcMatrix[y][x] = item;
						
					}
				}
				
			} else {
				
				// add columns as necessary
				this.ensureColumns(xEnd);
				
				// walk through rows
				for(var x = xStart; x<xEnd; x++) {
				
					// add rows as necessary
					if(this.rcMatrix[x].length < yEnd-1) {
						this.rcMatrix[x].length = yEnd-1;
					}
					
					// walk through rows
					for(var y = yStart; y<yEnd; y++) {
						
						// the cell is occupied
						this.rcMatrix[x][y] = item;
						
					}
				}
				
			}

		},
		
		positionNonAutoItems: function() {
			
			for(var i=0, l=this.items.length; i<l; i++) {
				var item = this.items[i];
				
				// if the element has a specific column associated to it
				if(item.specifiedXStart.type == LOCATE_LINE) {
					
					// if the element has a specified row associated to it
					if(item.specifiedYStart.type == LOCATE_LINE) {
						
						// find the start position (x axis)
						var xStart = this.findXStart(item);
						
						// find the start position (y axis)
						var yStart = this.findYStart(item);
						
						// find the end position (x axis)
						var xEnd = this.findXEnd(item);
						
						// find the end position (y axis)
						var yEnd = this.findYEnd(item);
						
						// we're done! this is so cool dude!
						item.xStart = xStart;
						item.yStart = yStart;
						item.xEnd = xEnd;
						item.yEnd = yEnd;
						
						// we should fill the explicit matrix now!
						this.markAsOccupied(item);
						
					}
					
				}
				
			}
			
		},
		
		positionAutoInColumnOnlyItems: function() {
			
			if(this.growY) {
				
				for(var i=0, l=this.items.length; i<l; i++) {
					var item = this.items[i];
					
					// if the element has a specified row associated to it, but is not positioned yet
					if(item.specifiedYStart.type == LOCATE_LINE && (item.yStart==-1)) {
						
						// find the start position (y axis)
						var yStart = this.findYStart(item);
						
						// find the end position (y axis)
						var yEnd = this.findYEnd(item);
						
						// assumption: X is either AUTO + SPAN or AUTO + AUTO
						var spanX = 1;
						if(item.specifiedXEnd.type == LOCATE_SPAN) {
							if(item.specifiedXEnd.name === undefined) {
								// The span is defined as this value
								spanX = item.specifiedXEnd.index;
							} else {
								// If the grid item has an automatic position and a grid span for a named line in a given dimension, instead treat the grid span as one.
								spanX = 1; console.error('[CSS-GRID] UNSUPPORTED: grid-row/column: auto / span [0-9]+ [A-Z]+');
							}
						}
						
						// add rows as necessary
						this.ensureRows(yEnd);
						
						// walk through columns to find a suitable position
						IncrementalColumnAttempts: for(var sx = 0;;sx++) {
							
							for(var x = sx+spanX-1; x>=sx; x--) {
								for(var y = yStart; y<yEnd; y++) {
								
									// if the cell is occupied
									if(this.rcMatrix[y][x]) {
										continue IncrementalColumnAttempts;
									}
								
								}
							}
							
							break;
							
						}
						
						var xStart = sx;
						var xEnd = sx+spanX;
						
						// we're done! this is so cool dude!
						item.xStart = xStart;
						item.yStart = yStart;
						item.xEnd = xEnd;
						item.yEnd = yEnd;
						
						// we should fill the explicit matrix now!
						this.markAsOccupied(item);
						
					}
					
				}
				
			} else {
				
				for(var i=0, l=this.items.length; i<l; i++) {
					var item = this.items[i];
					
					// if the element has a specified column associated to it, but is not positioned yet
					if(item.specifiedXStart.type == LOCATE_LINE && (item.xStart==-1)) {
						
						// find the start position (x axis)
						var xStart = this.findXStart(item);
						
						// find the end position (x axis)
						var xEnd = this.findXEnd(item);
						
						// assumption: Y is either AUTO + SPAN or AUTO + AUTO
						var spanY = 1;
						if(item.specifiedYEnd.type == LOCATE_SPAN) {
							if(item.specifiedYEnd.name === undefined) {
								// The span is defined as this value
								spanY = item.specifiedYEnd.index;
							} else {
								// If the grid item has an automatic position and a grid span for a named line in a given dimension, instead treat the grid span as one.
								spanY = 1;
							}
						}
						
						// add rows as necessary
						this.ensureColumns(xEnd);
						
						// walk through columns to find a suitable position
						IncrementalRowAttempts: for(var sy = 0;;sy++) {
							
							for(var y = sy+spanY-1; y>=sy; y--) {
								for(var x = xStart; x<xEnd; x++) {
								
									// if the cell is occupied
									if(this.rcMatrix[x][y]) {
										continue IncrementalRowAttempts;
									}
								
								}
							}
							
							break;
							
						}
						
						var yStart = sy;
						var yEnd = sy+spanY;
						
						// we're done! this is so cool dude!
						item.xStart = xStart;
						item.yStart = yStart;
						item.xEnd = xEnd;
						item.yEnd = yEnd;
						
						// we should fill the explicit matrix now!
						this.markAsOccupied(item);
						
					}
					
				}
				
			}
	
		},
		
		autoGrow: function() {
			
			// helpers
			var growX = function(index) {
				while(index >= this.xLines.length) {
					this.xLines.push(['*']);
					this.xSizes.push(this.defaultXSize);
				}
			}
			
			var growY = function(index) {
				while(index >= this.yLines.length) {
					this.yLines.push(['*']);
					this.ySizes.push(this.defaultYSize);
				}
			}
			
			// reset the lines to the specified ones if necessary
			this.resetLinesToSpecified(); // TODO: why?
			
			// ensure there's at least one cell
			growX.call(this,1); growY.call(this,1);
			
			// check if an item is explicitly positioned outside the explicit grid, and expand it if needed
			for(var i = this.items.length; i--;) {
				
				var item = this.items[i];
				
				// CONSIDER: items already positioned
				if(item.xEnd > 0) { growX.call(this,item.xEnd); }
				if(item.yEnd > 0) { growY.call(this,item.yEnd); }
				if(item.xEnd > 0 && item.yEnd > 0) { continue; }
				
				// CONSIDER: elements with a known location
				
				// (x axis):
				if(item.specifiedXEnd.type == LOCATE_LINE || item.specifiedXStart.type == LOCATE_LINE) {
					
					var xStart = this.findXStart(item);
					var xEnd = this.findXEnd(item);
					growX.call(this,xEnd);
					
				}
				
				// (y axis):
				if(item.specifiedYEnd.type == LOCATE_LINE || item.specifiedYStart.type == LOCATE_LINE) {
					
					var yStart = this.findYStart(item);
					var yEnd = this.findYEnd(item);
					if(yEnd <= yStart) { yEnd = yStart+1; }
					growY.call(this,yEnd);
					
				}
				
				// CONSIDER: known spans
				// // NOTE: I don't support "grid-row/column-start: span X";
				if(item.specifiedXEnd.type == LOCATE_SPAN && item.specifiedXEnd.name===undefined) {
					growX.call(this,item.specifiedXEnd.index);
				}
				if(item.specifiedYEnd.type == LOCATE_SPAN && item.specifiedYEnd.name===undefined) {
					growY.call(this,item.specifiedYEnd.index);
				}
				
			}
			
			// grow the grid matrix:
			if(this.growY) {
				while(this.ySizes.length>this.rcMatrix.length) {
					this.rcMatrix.push([]);
				}
				for(var r=this.rcMatrix.length; r--;) {
					this.rcMatrix[r].length = this.xSizes.length;
				}
			} else {
				while(this.xSizes.length>this.rcMatrix.length) {
					this.rcMatrix.push([]);
				}
				for(var r=this.rcMatrix.length; r--;) {
					this.rcMatrix[r].length = this.ySizes.length;
				}
			}
			
		},
		
		performLayout: function*() {
		
			// process non-automatic items
			this.buildImplicitMatrix();

			// position the remaining grid items. 
			var cursor = { x: 0, y: 0 };

			if(this.growY) {
				
				//For each grid item that hasnt been positioned by the previous steps, in order-modified document order:
				for(var i=0; i<this.items.length; i++) {
					var item = this.items[i]; if(item.xEnd!=-1 && item.yEnd!=-1) { continue; }
					
					// reset the cursor if the algorithm is set to 'dense'
					if(this.growDense) { cursor = { x: 0, y: 0 }; }
					
					//If the item has a definite column position: 
					if(item.specifiedXStart.type == LOCATE_LINE) {
					
						// 1. Set the column position of the cursor to be equal to the inline-start index of the grid item. 
						var xStart = this.findXStart(item); if(cursor.x > xStart) { cursor.y++; } cursor.x = xStart;
						var xEnd = this.findXEnd(item); if(xStart>=xEnd) { xEnd=xStart+1}
						item.xStart=xStart; item.xEnd=xEnd;
						
						// assumption: Y is either AUTO + SPAN or AUTO + AUTO
						var spanY = 1;
						if(item.specifiedYEnd.type == LOCATE_SPAN) {
							if(item.specifiedYEnd.name === undefined) {
								// The span is defined as this value
								spanY = item.specifiedYEnd.index;
							} else {
								// If the grid item has an automatic position and a grid span for a named line in a given dimension, instead treat the grid span as one.
								spanY = 1;
							}
						}

						// 2. Increment the auto-placement cursors row position until a value is found where the grid item does not overlap any occupied grid cells (creating new rows in the implicit grid as necessary).
						IncrementalRowAttempts: while(true) {
							
							// make room for the currently attempted position
							this.ensureRows(cursor.y+spanY);
							
							// check the non-overlap condition
							for(var y = cursor.y+spanY-1; y>=cursor.y; y--) {
								for(var x = xStart; x<xEnd; x++) {
									
									// if the cell is occupied
									if(this.rcMatrix[y][x]) {
									
										// move to the next row
										cursor.y=y+1; continue IncrementalRowAttempts;
										
									}
									
								}
							}
							
							break;
							
						}
						
						// settle the position
						item.xStart = xStart;
						item.xEnd = xEnd;
						item.yStart = cursor.y;
						item.yEnd = cursor.y+spanY;
						
						this.markAsOccupied(item);					
						
					} else { // If the item has an automatic grid position in both axes: 
						
						// assumption: X is either AUTO + SPAN or AUTO + AUTO
						var spanX = 1;
						if(item.specifiedXEnd.type == LOCATE_SPAN) {
							if(item.specifiedXEnd.name === undefined) {
								// The span is defined as this value
								spanX = item.specifiedXEnd.index;
							} else {
								// If the grid item has an automatic position and a grid span for a named line in a given dimension, instead treat the grid span as one.
								spanX = 1; console.error('[CSS-GRID] UNSUPPORTED: grid-row/column: auto / span [0-9]+ [A-Z]+');
							}
						}
						
						// assumption: Y is either AUTO + SPAN or AUTO + AUTO
						var spanY = 1;
						if(item.specifiedYEnd.type == LOCATE_SPAN) {
							if(item.specifiedYEnd.name === undefined) {
								// The span is defined as this value
								spanY = item.specifiedYEnd.index;
							} else {
								// If the grid item has an automatic position and a grid span for a named line in a given dimension, instead treat the grid span as one.
								spanY = 1;
							}
						}
						
						// Increment the auto-placement cursors row/column position (creating new rows in the implicit grid as necessary)
						var nextStep = function() {
							cursor.x++; if(cursor.x+spanX>this.rcMatrix[0].length) { cursor.y++; this.ensureRows(cursor.y + spanY); cursor.x=0; }
							return true;
						}

						// 1. Increment the column position of the auto-placement cursor until this items grid area does not overlap any occupied grid cells
						IncrementalYXPositionAttempts: while(true) {
							
							// make room for the currently attempted position
							this.ensureRows(cursor.y+spanY);
							
							// check the non-overlap condition
							for(var y = cursor.y+spanY-1; y>=cursor.y; y--) {
								for(var x = cursor.x+spanX-1; x>=cursor.x; x--) {
									
									// if the cell is occupied
									if(this.rcMatrix[y][x]) {
									
										// move to the next row/column
										nextStep.call(this); continue IncrementalYXPositionAttempts;
										
									}
									
								}
							}
							
							break;
							
							
						}
						
						// settle the position
						item.xStart = cursor.x;
						item.xEnd = cursor.x+spanX;
						item.yStart = cursor.y;
						item.yEnd = cursor.y+spanY;
						
						this.markAsOccupied(item);
						
					}
					
				}
				
			} else {
				
				//For each grid item that hasnt been positioned by the previous steps, in order-modified document order:
				for(var i=0; i<this.items.length; i++) {
					var item = this.items[i]; if(item.xEnd!=-1 && item.yEnd!=-1) { continue; }
					
					// reset the cursor if the algorithm is set to 'dense'
					if(this.growDense) { cursor = { x: 0, y: 0 }; }
					
					//If the item has a definite row position: 
					if(item.specifiedYStart.type == LOCATE_LINE) {
					
						// 1. Set the column position of the cursor to be equal to the inline-start index of the grid item. 
						var yStart = this.findYStart(item); if(cursor.y > yStart) { cursor.x++; } cursor.y = yStart;
						var yEnd = this.findYEnd(item); if(yStart>=yEnd) { yEnd=yStart+1}
						item.yStart=yStart; item.yEnd=yEnd;
						
						// assumption: X is either AUTO + SPAN or AUTO + AUTO
						var spanX = 1;
						if(item.specifiedXEnd.type == LOCATE_SPAN) {
							if(item.specifiedXEnd.name === undefined) {
								// The span is defined as this value
								spanX = item.specifiedXEnd.index;
							} else {
								// If the grid item has an automatic position and a grid span for a named line in a given dimension, instead treat the grid span as one.
								spanX = 1; console.error('[CSS-GRID] UNSUPPORTED: grid-row/column: auto / span [0-9]+ [A-Z]+');
							}
						}

						// 2. Increment the auto-placement cursors row position until a value is found where the grid item does not overlap any occupied grid cells (creating new rows in the implicit grid as necessary).
						IncrementalColumnAttempts: while(true) {
							
							// make room for the currently attempted position
							this.ensureColumns(cursor.x+spanX);
							
							// check the non-overlap condition
							for(var x = cursor.x+spanX-1; x>=cursor.x; x--) {
								for(var y = yStart; y<yEnd; y++) {
									
									// if the cell is occupied
									if(this.rcMatrix[x][y]) {
									
										// move to the next row
										cursor.x=x+1; continue IncrementalColumnAttempts;
										
									}
									
								}
							}
							
							break;
							
						}
						
						// settle the position
						item.yStart = yStart;
						item.yEnd = yEnd;
						item.xStart = cursor.x;
						item.yEnd = cursor.x+spanX;
						
						this.markAsOccupied(item);					
						
					} else { // If the item has an automatic grid position in both axes: 
						
						// assumption: Y is either AUTO + SPAN or AUTO + AUTO
						var spanY = 1;
						if(item.specifiedYEnd.type == LOCATE_SPAN) {
							if(item.specifiedYEnd.name === undefined) {
								// The span is defined as this value
								spanY = item.specifiedYEnd.index;
							} else {
								// If the grid item has an automatic position and a grid span for a named line in a given dimension, instead treat the grid span as one.
								spanY = 1;
							}
						}
						
						// assumption: X is either AUTO + SPAN or AUTO + AUTO
						var spanX = 1;
						if(item.specifiedXEnd.type == LOCATE_SPAN) {
							if(item.specifiedXEnd.name === undefined) {
								// The span is defined as this value
								spanX = item.specifiedXEnd.index;
							} else {
								// If the grid item has an automatic position and a grid span for a named line in a given dimension, instead treat the grid span as one.
								spanX = 1; console.error('[CSS-GRID] UNSUPPORTED: grid-row/column: auto / span [0-9]+ [A-Z]+');
							}
						}
						
						// Increment the auto-placement cursors row/column position (creating new rows in the implicit grid as necessary)
						var nextStep = function() {
							cursor.y++; if(cursor.y+spanY>this.rcMatrix[0].length) { cursor.x++; this.ensureRows(cursor.x + spanX); cursor.y=0; }
							return true;
						}

						// 1. Increment the column position of the auto-placement cursor until this items grid area does not overlap any occupied grid cells
						IncrementalXYPositionAttempts: while(true) {
							
							// make room for the currently attempted position
							this.ensureColumns(cursor.x+spanX);
							
							// check the non-overlap condition
							for(var x = cursor.x+spanX-1; x>=cursor.x; x--) {
								for(var y = cursor.y+spanY-1; y>=cursor.y; y--) {
									
									// if the cell is occupied
									if(this.rcMatrix[x][y]) {
									
										// move to the next row/column
										nextStep.call(this); continue IncrementalXYPositionAttempts;
										
									}
									
								}
							}
							
							break;
							
							
						}
						
						// settle the position
						item.xStart = cursor.x;
						item.xEnd = cursor.x+spanX;
						item.yStart = cursor.y;
						item.yEnd = cursor.y+spanY;
						
						this.markAsOccupied(item);
						
					}
					
				}

			}
			yield* this.computeAbsoluteTrackBreadths();

			//
			// position all the fragments
			//

			var xSizes = this.finalXSizes;
			var ySizes = this.finalYSizes;

			var gridWidth = 0, gridHeight = 0;
			for(var x = 0; x<xSizes.length; x++) {
				gridWidth += xSizes[x].breadth;
			}
			for(var y = 0; y<xSizes.length; y++) {
				gridHeight += ySizes[y].breadth;
			}
			this.gridWidth = gridWidth;
			this.gridHeight = gridHeight;

			var width = 0; var height = 0;
			var items_widths = []; var items_heights = []; 
			items_widths.length = items_heights.length = this.items.length;

			for(var i=this.items.length; i--;) { var item = this.items[i]; 

				var left = this.hlPadding;
				for(var x = 0; x<item.xStart; x++) {
					left += xSizes[x].breadth;
				}

				var top = this.vtPadding;
				for(var y = 0; y<item.yStart; y++) {
					top += ySizes[y].breadth;
				}

				item.fragment.inlineOffset = left + item.hlMargin;
				item.fragment.blockOffset = top + item.vtMargin;

			}

		},
		
		computeAbsoluteTrackBreadths: function*() {
		
			var LIMIT_IS_INFINITE = 1;		
			var infinity = 9999999.0;
			var fullWidth = this.element.fixedInlineSize != null ? this.element.fixedInlineSize - this.hPaddings : infinity;
			var fullHeight = this.element.fixedBlockSize != null ? this.element.fixedBlockSize - this.vPaddings : 0; // fixedBlockSize is null if no height is defined
			
			// 
			// 10.3  Initialize Track Sizes
			// 
			var initializeFromConstraints = function(v) {
				
				var base = 0, limit = infinity;
				switch(v.minType) {
					
					// For fixed track sizes, resolve to an absolute length and use that size. 
					case TRACK_BREADTH_LENGTH:      base = v.minValue; break;
					case TRACK_BREADTH_PERCENTAGE:  base = v.minValue*fullSize/100; break;
					
				}
				
				switch(v.maxType) {
					
					// For fixed track sizes, resolve to an absolute length and use that size. 
					case TRACK_BREADTH_LENGTH:      limit = v.minValue; break;
					case TRACK_BREADTH_PERCENTAGE:  limit = v.minValue*fullSize/100; break;
					
					// For flexible track sizes, use the tracks initial base size as its initial growth limit.  
					case TRACK_BREADTH_FRACTION:    limit = base; break;
					
					// For intrinsic track sizes, use an initial growth limit of infinity. 
					default:                        limit = infinity; break;
					
				}
				
				return { base:base, limit:limit, breadth:0, flags:((limit==infinity)?LIMIT_IS_INFINITE:0)|0 };
				
			}
			
			//
			// Equal distribution algorithm
			//
			var distributeEquallyAmongTracks = function distributeEquallyAmongTracks(xSizes, kind, tracks, spaceToDistribute, enforceLimit) {
				// Distribute space to base sizes
				var trackAmount = tracks.length;
				var spacePerTrack = spaceToDistribute/trackAmount;
				if(kind=='base') {
				
					// if we enforce the limit, grow up to the most limitating track
					if(enforceLimit) {
						for(var t = tracks.length; t--;) { var cx = tracks[t].x;
							
							// find the lowest acceptable increase for all tracks
							var newBase = xSizes[cx].base + spacePerTrack;
							
							// if limits are enfo
							if(enforceLimit && (xSizes[cx].flags & LIMIT_IS_INFINITE == 0) && newBase > xSizes[cx].limit) {
								spacePerTrack -= newBase - xSizes[cx].limit;
							}
						}
					}
					
					for(var t = tracks.length; t--;) { var cx = tracks[t].x;
						xSizes[cx].base += spacePerTrack;
					}
					
				} else if(kind == 'limit') {
				
					// Update the tracks' affected sizes by folding in the calculated increase so that the next round of space distribution will account for the increase.
					for(var t = tracks.length; t--;) { var cx = tracks[t].x;
						// If the growth limit is infinite...
						if(xSizes[cx].flags & LIMIT_IS_INFINITE) {
							// set it to the tracks base size plus the calculated increase
							if(xSizes[cx].limit == infinity) {
								xSizes[cx].limit = xSizes[cx].base + spacePerTrack;
							} else {
								xSizes[cx].limit += spacePerTrack; // TODO: THERE IS A BUG HERE ?
							}
						} else {
							// otherwise just increase the limit
							xSizes[cx].limit += spacePerTrack;
						}
					}
				}
			}

			
			// 
			// 10.4  Resolve Content-Based Track Sizing Functions
			// 
			var computeTrackBreadth = function(xSizes, specifiedSizes, getMinWidthOf, getMaxWidthOf, getXStartOf, getXEndOf) {
				
				// For each track
				var items_done = 0; // items already consumed for this algorithm
				for(var x = specifiedSizes.length; x--;) {
				
					var dontCountMaxItems = false;
					
					// If the track has a min-content min track sizing function
					if(specifiedSizes[x].minType == TRACK_BREADTH_MIN_CONTENT || specifiedSizes[x].minType == TRACK_BREADTH_AUTO) {
						
						// Consider the items in it with a span of 1: 
						for(var i = this.items.length; i--;) { var item = this.items[i]; var item_xStart = getXStartOf(item); var item_xEnd = getXEndOf(item);
							if(item_xStart>x || item_xEnd<=x || item_xEnd-item_xStart != 1) continue;
							
							// Set its base size to the maximum of the items min-content contributions. 
							xSizes[x].base = Math.max(xSizes[x].base, getMinWidthOf(item)); items_done++; dontCountMaxItems=true;
							
						}
						
					}
					
					// If the track has a max-content min track sizing function
					else if(specifiedSizes[x].minType == TRACK_BREADTH_MAX_CONTENT) {
						
						// Consider the items in it with a span of 1: 
						for(var i = this.items.length; i--;) { var item = this.items[i]; var item_xStart = getXStartOf(item); var item_xEnd = getXEndOf(item);
							if(item_xStart>x || item_xEnd<=x || item_xEnd-item_xStart != 1) continue;
							
							// Set its base size to the maximum of the items max-content contributions. 
							xSizes[x].base = Math.max(xSizes[x].base, getMaxWidthOf(item)); items_done++; dontCountMaxItems=true;
							
						}
						
					}
					
					// If the track has a min-content max track sizing function
					if(specifiedSizes[x].maxType == TRACK_BREADTH_MIN_CONTENT) {
						
						// Consider the items in it with a span of 1: 
						for(var i = this.items.length; i--;) { var item = this.items[i]; var item_xStart = getXStartOf(item); var item_xEnd = getXEndOf(item);
							if(item_xStart>x || item_xEnd<=x || item_xEnd-item_xStart != 1) continue;
							
							// Set its growth limit to the maximum of the items min-content contributions. 
							if(xSizes[x].limit == infinity) { xSizes[x].limit = getMinWidthOf(item); }
							else { xSizes[x].limit = Math.max(xSizes[x].limit, getMinWidthOf(item)); }
							
							if(!dontCountMaxItems) { items_done++; }
							
						}
						
					} 
					
					// If the track has a max-content max track sizing function
					else if(specifiedSizes[x].maxType == TRACK_BREADTH_MAX_CONTENT || specifiedSizes[x].minType == TRACK_BREADTH_AUTO) {
						
						// Consider the items in it with a span of 1: 
						for(var i = this.items.length; i--;) { var item = this.items[i]; var item_xStart = getXStartOf(item); var item_xEnd = getXEndOf(item);
							if(item_xStart>x || item_xEnd<=x || item_xEnd-item_xStart != 1) continue;
							
							// Set its growth limit to the maximum of the items max-content contributions. 
							if(xSizes[x].limit == infinity) { xSizes[x].limit = getMaxWidthOf(item); }
							else { xSizes[x].limit = Math.max(xSizes[x].limit, getMaxWidthOf(item)); }
							
							if(!dontCountMaxItems) { items_done++; }
							
						}
						
					}
					
					// update infinity flag
					if(xSizes[x].limit != infinity) {
						xSizes[x].flags = xSizes[x].flags & ~LIMIT_IS_INFINITE;
					}
					
				}
				
				// Next, consider the items with a span of 2 that do not span a track with a flexible sizing function: 
				// Repeat incrementally for items with greater spans until all items have been considered.
				for(var span = 2; items_done < this.items.length && span <= specifiedSizes.length; span++) {
					ItemLoop: for(var i = this.items.length; i--;) { var item = this.items[i]; var item_xStart = getXStartOf(item); var item_xEnd = getXEndOf(item);
						if(item_xEnd-item_xStart != span) continue ItemLoop;
						
						// gather some pieces of data about the tracks
						var full_base = 0; var full_limit = 0;
						for(var cx = item_xStart; cx<item_xEnd; cx++) { 
							
							// 1. we want to make sure none is flexible
							if(specifiedSizes[cx].maxType == TRACK_BREADTH_FRACTION) continue ItemLoop;
							
							// 2. compute aggregated sizes
							full_base += xSizes[cx].base;
							full_limit += xSizes[cx].limit;
							
						}
						if(full_limit > infinity) full_limit=infinity;
						
						var distributeFreeSpace = function(requiredSpace, kind /*'base'|'limit'*/, target /*'min-content'|'max-content'*/) {
							
							while (true) {
							
								// compute the required extra space
								var spaceToDistribute = requiredSpace;
								for(var cx = item_xStart; cx<item_xEnd; cx++) {
									spaceToDistribute -= xSizes[cx][kind];
								}
								
								// if no space to distribute, just lock auto columns:
								if(spaceToDistribute <= 1/1024) { //due to double precision, this may never reach perfect 0
									for(var cx = item_xStart; cx<item_xEnd; cx++) {
										if(xSizes[cx].limit == infinity) {
											xSizes[cx].limit = xSizes[cx].base;
										}
									}
									return;
								}

								// sort rows by growth limit
								var rows_and_limits = [];
								for(var cx = item_xStart; cx<item_xEnd; cx++) {
									rows_and_limits.push({ 
										x:cx, 
										base:xSizes[cx].base,
										limit:xSizes[cx].limit,
										minIsMinContent: specifiedSizes[cx].minType == TRACK_BREADTH_MIN_CONTENT || specifiedSizes[cx].minType == TRACK_BREADTH_AUTO,
										minIsMaxContent: specifiedSizes[cx].minType == TRACK_BREADTH_MAX_CONTENT,
										maxIsMinContent: specifiedSizes[cx].maxType == TRACK_BREADTH_MIN_CONTENT,
										maxIsMaxContent: specifiedSizes[cx].maxType == TRACK_BREADTH_MAX_CONTENT || specifiedSizes[cx].maxType == TRACK_BREADTH_AUTO
									});
								}
								rows_and_limits.sort(function(a,b) { return a.limit-b.limit; });
								
								// remove non-affected tracks
								rows_and_limits = rows_and_limits.filter(function(b) {
									if(kind=='base') {
										if(target=='min-content') {
											return b.minIsMinContent||b.minIsMaxContent;
										} else if(target=='max-content') {
											return b.minIsMaxContent;
										}
									} else if (kind == 'limit') {
										if(target=='min-content') {
											return b.maxIsMinContent||b.maxIsMaxContent;
										} else if(target=='max-content') {
											return b.maxIsMaxContent;
										}
									}
									return false;
								});
								
								// check that there is at least one affected track
								if(rows_and_limits.length == 0) { return; }
								
								// apply the algorithm
								if(kind=='base') {
									
									// Distribute space up to growth limits
									var tracks = rows_and_limits.filter(function(b) { return b.base<b.limit; }, 0);
									var trackAmount = tracks.length;
									if(trackAmount > 0) {
										
										distributeEquallyAmongTracks(xSizes, kind, tracks, spaceToDistribute, /*enforceLimit:*/true);
											
									} else {
										
										// Distribute space beyond growth limits
										// If space remains after all tracks are frozen, unfreeze and continue to distribute space to
 
										
										// - when handling min-content base sizes: 
										if(target=='min-content') {
											
											// any affected track that happens to also have an intrinsic max track sizing function; 
											var tracks = rows_and_limits.filter(function(b) { return b.maxIsMinContent||b.maxIsMaxContent; }, 0);
											var trackAmount = tracks.length;
											if(trackAmount>=1) {
												
												// (such tracks exist:)
												distributeEquallyAmongTracks(xSizes, kind, tracks, spaceToDistribute, /*enforceLimit:*/false);
												
											} else {
												
												// if there are no such tracks, then all affected tracks. 
												distributeEquallyAmongTracks(xSizes, kind, rows_and_limits, spaceToDistribute, /*enforceLimit:*/false);
											}
											
										}
										
										// - when handling max-content base sizes: 
										else if(target=='max-content') {
											
											// any affected track that happens to also have a max-content max track sizing function;
											var tracks = rows_and_limits.filter(function(b) { return b.maxIsMaxContent; }, 0);
											var trackAmount = tracks.length;
											if(trackAmount>=1) {
												
												// (such tracks exist:)
												distributeEquallyAmongTracks(xSizes, kind, tracks, spaceToDistribute, /*enforceLimit:*/false);
												
											} else {
												
												// if there are no such tracks, then all affected tracks. 
												distributeEquallyAmongTracks(xSizes, kind, rows_and_limits, spaceToDistribute, /*enforceLimit:*/false);
											}
											
										}
									}
									
								}
								
								else if (kind == 'limit') {
									
									// distribute among all tracks
									distributeEquallyAmongTracks(xSizes, kind, rows_and_limits, spaceToDistribute);
									
								}
							}
						};
						
						var updateInfiniteLimitFlag = function() {
							for(var x = xSizes.length; x--;) {
								if(xSizes[x].limit != infinity) {
									xSizes[x].flags = xSizes[x].flags & ~LIMIT_IS_INFINITE;
								}
							}
						}
						
						//
						// 1. For intrinsic minimums: First increase the base size of tracks with a min track sizing function of min-content or max-content by distributing extra space as needed to account for these items' min-content contributions. 
						//
						distributeFreeSpace(getMinWidthOf(item), 'base', 'min-content');
						updateInfiniteLimitFlag();
						
						
						//
						// 2. For max-content minimums: Next continue to increase the base size of tracks with a min track sizing function of max-content by distributing extra space as needed to account for these items' max-content contributions. 
						//
						distributeFreeSpace(getMaxWidthOf(item), 'base', 'max-content');
						updateInfiniteLimitFlag();
						
						//
						// 3. For intrinsic maximums: Third increase the growth limit of tracks with a max track sizing function of min-content or max-content by distributing extra space as needed to account for these items' min-content contributions. 
						// Mark any tracks whose growth limit changed from infinite to finite in this step as infinitely growable for the next step. 
						// (aka do not update infinity flag)
						//
						distributeFreeSpace(getMinWidthOf(item), 'limit', 'min-content');
						
						//
						// 4. For max-content maximums: Lastly continue to increase the growth limit of tracks with a max track sizing function of max-content by distributing extra space as needed to account for these items' max-content contributions. 
						//
						distributeFreeSpace(getMaxWidthOf(item), 'limit', 'max-content');
						updateInfiniteLimitFlag();
						
						items_done++;
						
					}
				}

			}
			
			var computeTrackBreadthIncrease = function(xSizes, specifiedSizes, fullSize, getMinWidthOf, getMaxWidthOf, getXStartOf, getXEndOf) {
				
				// sort rows by growth limit
				var rows_and_limits = xSizes.map(function(item, cx) { 
					return { 
						x:cx, 
						base:xSizes[cx].base,
						limit:xSizes[cx].limit,
						minIsMinContent: specifiedSizes[cx].minType == TRACK_BREADTH_MIN_CONTENT || specifiedSizes[cx].minType == TRACK_BREADTH_AUTO,
						minIsMaxContent: specifiedSizes[cx].minType == TRACK_BREADTH_MAX_CONTENT,
						maxIsMinContent: specifiedSizes[cx].maxType == TRACK_BREADTH_MIN_CONTENT,
						maxIsMaxContent: specifiedSizes[cx].maxType == TRACK_BREADTH_MAX_CONTENT || specifiedSizes[cx].maxType == TRACK_BREADTH_AUTO
					};
				});
				rows_and_limits.sort(function(a,b) { return a.limit-b.limit; });
				
				while(true) {
					
					// compute size to distribute
					var spaceToDistribute = fullSize;
					for(var cx = xSizes.length; cx--;) {
						spaceToDistribute -= xSizes[cx].base;
					}
					
					// check that there is some space to distribute
					if(spaceToDistribute <= 1/1024) { return; } // NOTE: the space may never become 0 due to a rounding issue
					
					// Distribute space up to growth limits
					var tracks = rows_and_limits = rows_and_limits.filter(function(b) { return ((b.minIsMinContent||b.minIsMaxContent) && b.base<b.limit); }, 0);
					var trackAmount = tracks.length; if(trackAmount <= 0) { return; }
					distributeEquallyAmongTracks(xSizes, 'base', tracks, spaceToDistribute, /*enforceLimit:*/true);
					
				}
			}
			
			var computeFlexibleTrackBreadth = function(xSizes, specifiedSizes, fullSize, getMinWidthOf, getMaxWidthOf, getXStartOf, getXEndOf) {
				
				// If the free space is an indefinite length: 
				if(fullSize==0) {
					
					//The used flex fraction is the maximum of: 
					var currentFraction = 0;
					
					//  Each flexible tracks base size divided by its flex factor. 
					'TODO: I believe this is completely useless, but CSSWG will not change it.';
					
					//  The result of finding the size of an fr for each grid item that crosses a flexible track, using all the grid tracks that the item crosses and a space to fill of the items max-content contribution. 
					for(var i = this.items.length; i--;) { var item = this.items[i]; var item_xStart = getXStartOf(item); var item_xEnd = getXEndOf(item);
						
						// gather some pieces of data about the tracks
						var spaceToDistribute = getMaxWidthOf(item); var flexFactorSum = 0;
						for(var cx = item_xStart; cx<item_xEnd; cx++) { 
							
							if(specifiedSizes[cx].maxType == TRACK_BREADTH_FRACTION) {
								// compute how much flexible tracks are required
								flexFactorSum += specifiedSizes[cx].maxValue;
							} else {
								// deduce non-flexible tracks from the space to distribute
								spaceToDistribute -= xSizes[cx].base;
							}
							
						}
						
						// compute the minimum flex fraction for this item
						if(spaceToDistribute > 0 && flexFactorSum > 0) {
							currentFraction = Math.max(currentFraction, spaceToDistribute / flexFactorSum)
						}
						
					}
					
					// for each flexible track
					for(var x = xSizes.length; x--;) {
						if(specifiedSizes[x].maxType == TRACK_BREADTH_FRACTION) {
							
							// Compute the product of the hypothetical flex fraction and the tracks flex factor
							var trackSize = currentFraction * specifiedSizes[x].maxValue;
							
							// If that size is less than the tracks base size:
							if(xSizes[x].base < trackSize) {
								
								// set its base size to that product.
								xSizes[x].breadth = trackSize;
								
							} else {
								
								xSizes[x].breadth = xSizes[x].base;
								
							}
							
						} else {
							
							xSizes[x].breadth = xSizes[x].base;
							
						}
					}
					
				} else {
				
					// compute the leftover space
					var spaceToDistribute = fullSize;
					var tracks = []; var fractionSum = 0;
					for(var x = xSizes.length; x--;) {
						if(specifiedSizes[x].maxType == TRACK_BREADTH_FRACTION) {
							tracks.push(x); fractionSum += specifiedSizes[x].maxValue;
						} else {
							spaceToDistribute -= (xSizes[x].breadth = xSizes[x].base);
						}
					}

					// while there are flexible tracks to size
					while(tracks.length>0) {
						
						// Let the hypothetical flex fraction be the leftover space divided by the sum of the flex factors of the flexible tracks.
						var currentFraction = spaceToDistribute / fractionSum; var restart = false;
						
						// for each flexible track
						for(var i = tracks.length; i--;) { var x = tracks[i];
							
							// Compute the product of the hypothetical flex fraction and the tracks flex factor
							var trackSize = currentFraction * specifiedSizes[x].maxValue;
							
							// If that size is less than the tracks base size:
							if(xSizes[x].base < trackSize) {
								
								// set its base size to that product.
								xSizes[x].breadth = trackSize;

							} else {
								
								// mark as non-flexible
								xSizes[x].breadth = xSizes[x].base;
								
								// remove from computation
								fractionSum -= specifiedSizes[x].maxValue;
								tracks.splice(i,1);
								
								// restart
								restart=true;
								
							}
							
						}
						
						if(!restart) { tracks.length = 0; }
						
					}
					
				}
			}
			
			var computeFinalTrackBreadth = function(xSizes, this_xSizes, fullWidth, getMinWidthOf, getMaxWidthOf, getXStartOf, getXEndOf) {
				
				// compute base and limit
				computeTrackBreadth.call(
					this,
					xSizes,
					this_xSizes,
					getMinWidthOf,
					getMaxWidthOf,
					getXStartOf,
					getXEndOf
				);
				
				// ResolveContentBasedTrackSizingFunctions (step 4)
				for(var x = this_xSizes.length; x--;) {
					if(xSizes[x].limit == infinity) { xSizes[x].limit = xSizes[x].base; }
				}
				
				// grow tracks up to their max
				computeTrackBreadthIncrease.call(
					this,
					xSizes,
					this_xSizes,
					fullWidth,
					getMinWidthOf,
					getMaxWidthOf,
					getXStartOf,
					getXEndOf
				);
				
				// handle flexible things
				computeFlexibleTrackBreadth.call(
					this,
					xSizes,
					this_xSizes,
					fullWidth,
					getMinWidthOf,
					getMaxWidthOf,
					getXStartOf,
					getXEndOf
				);

			}
			
			///////////////////////////////////////////////////////////
			// compute breadth of columns
			///////////////////////////////////////////////////////////
			var mode = 'x';
			var fullSize = fullWidth;
			var xSizes = this.xSizes.map(initializeFromConstraints);
			
			var getMinWidthOf = function(item) { return item.minWidth+item.hMargins; };
			var getMaxWidthOf = function(item) { return item.maxWidth+item.hMargins; };
			var getXStartOf = function(item) { return item.xStart; }; 
			var getXEndOf = function(item) { return item.xEnd; };
			
			// compute base and limit
			computeFinalTrackBreadth.call(
				this,
				xSizes,
				this.xSizes,
				fullWidth,
				getMinWidthOf,
				getMaxWidthOf,
				getXStartOf,
				getXEndOf
			);
			
			///////////////////////////////////////////////////////////
			// position each element absolutely, and set width to compute height
			///////////////////////////////////////////////////////////

			for(var item of this.items) {
				
				// firstly, compute the total breadth of the spanned tracks
				var totalBreadth = 0;
				for(var cx = item.xStart; cx<item.xEnd; cx++) {
					totalBreadth += xSizes[cx].breadth;
				}
				
				// secondly, adapt to the alignment properties
				"TODO: alignment";
				
				// finally, set the style
				item.fragment = yield item.element.layoutNextFragment({
					fixedInlineSize: totalBreadth-item.hMargins
				});
				
			}
			
			///////////////////////////////////////////////////////////
			// compute breadth of rows
			///////////////////////////////////////////////////////////
			var mode = 'y';
			var fullSize = fullHeight;
			var ySizes = this.ySizes.map(initializeFromConstraints);
			
			var getMinHeightOf = function(item) { return item.fragment.blockSize+item.vMargins; };
			var getMaxHeightOf = function(item) { return item.fragment.blockSize+item.vMargins; };
			var getYStartOf = function(item) { return item.yStart; };
			var getYEndOf = function(item) { return item.yEnd; };
			
			computeFinalTrackBreadth.call(
				this,
				ySizes,
				this.ySizes,
				fullHeight,
				getMinHeightOf,
				getMaxHeightOf,
				getYStartOf,
				getYEndOf
			);
									
			///////////////////////////////////////////////////////////
			// relayout all the children
			///////////////////////////////////////////////////////////
			for(var item of this.items) {
				
				// firstly, compute the total breadth of the spanned tracks
				var totalHorizontalBreadth = 0;
				for(var cx = item.xStart; cx<item.xEnd; cx++) {
					totalHorizontalBreadth += xSizes[cx].breadth;
				}

				var totalVerticalBreadth = 0;				
				for(var cy = item.yStart; cy<item.yEnd; cy++) {
					totalVerticalBreadth += ySizes[cy].breadth;
				}
				
				// secondly, adapt to the alignment properties
				"TODO: alignment";
				
				// finally, set the style
				item.fragment = yield item.element.layoutNextFragment({
					fixedInlineSize: totalHorizontalBreadth-item.hMargins,
					fixedBlockSize: totalVerticalBreadth-item.vMargins
				});
				
			}
			
			///////////////////////////////////////////////////////////
			// save the results
			////
			this.finalXSizes = xSizes;
			this.finalYSizes = ySizes;
			
			///////////////////////////////////////////////////////////
			// log the results
			///////////////////////////////////////////////////////////
			/*console.log({
				x: xSizes,
				xBreadths: xSizes.map(function(e) { return e.breadth; }),
				y: ySizes,
				yBreadths: ySizes.map(function(e) { return e.breadth; }),
			});*/
		
		},
		
		findXStart: function(item) {
		
			//////////////////////////////////////////////////////////////////////////////
			// TODO: this doesn't reflect the spec after the changes made at my request //
			//////////////////////////////////////////////////////////////////////////////
			
			var xStart = -1;
			if(item.specifiedXStart.type !== LOCATE_LINE) return 0;
			
			if(item.specifiedXStart.name) {
				
				//
				// <integer>? <custom-ident>
				//
				
				if(item.specifiedXStart.index === undefined) {
					
					// First attempts to match the grid areas edge to a named grid area
					xStart = this.findXLine(item.specifiedXStart.name+"-start", 0, 0, /*dontFallback*/true);
					
				}
				if(xStart==-1) {
				
					// Otherwise, contributes the first named line with the specified name to the grid items placement. 
					xStart = this.findXLine(item.specifiedXStart.name, 0, (item.specifiedXStart.index||1)-1);
					
				}
				
			} else {
				
				//
				// <integer>
				//
				xStart = (item.specifiedXStart.index||1)-1;
				
			}
			
			// correct impossible values
			if(xStart < 0) { xStart=0; }
			
			// return the final result
			return item.xStart = xStart;
			
		},
		
		findYStart: function(item) {
			
			var yStart = -1;
			if(item.specifiedYStart.type !== LOCATE_LINE) return 0;

			if(item.specifiedYStart.name) {
				
				//
				// <interger>? <custom-ident>
				//
				
				if(item.specifiedYStart.index === undefined) {
					
					// First attempts to match the grid areas edge to a named grid area
					yStart = this.findYLine(item.specifiedYStart.name+"-start", 0, 0, /*dontFallback*/true);
					
				}
				if(yStart == -1) {
					
					// Otherwise, contributes the first named line with the specified name to the grid items placement. 
					yStart = this.findYLine(item.specifiedYStart.name, 0,(item.specifiedYStart.index||1)-1);
					
				}
				
			} else {
				
				//
				// <integer>
				//
				yStart = (item.specifiedYStart.index||1)-1;
				
			}
			
			// correct impossible values
			if(yStart < 0) { yStart=0; }
			
			// return the final result
			return item.yStart = yStart;
			
		},
		
		findXEnd: function(item) {
			
			var xEnd = -1;
			var xStart = item.xStart;
			switch(item.specifiedXEnd.type) {
				
				case LOCATE_LINE:
					if(item.specifiedXEnd.name) {
						if(item.specifiedXEnd.index === undefined) {
							
							// First attempts to match the grid areas edge to a named grid area
							xEnd = this.findXLine(item.specifiedXEnd.name+"-end", 0, 0, /*dontFallback*/true);
							
						}
						if(xEnd == -1) {
							
							// Otherwise, contributes the first named line with the specified name to the grid items placement. 
							xEnd = this.findXLine(item.specifiedXEnd.name, 0, (item.specifiedXEnd.index||1)-1);
							
						}
					} else {
						xEnd = (item.specifiedXEnd.index||1)-1;
					}
					break;
					
				case LOCATE_SPAN:
					if(item.specifiedXEnd.name) {
					
						// Set the corresponding edge N lines apart from its opposite edge. 
						xEnd = this.findXLine(item.specifiedXEnd.name, xStart+1, (item.specifiedXEnd.index||1)-1);
						
					} else {
						
						// Set the corresponding edge N lines apart from its opposite edge. 
						xEnd = xStart+((item.specifiedXEnd.index|0)||1);
					}
					break;
					
				case LOCATE_AUTO:
					// I don't support subgrids, so this is always true:
					xEnd = xStart+1;
					break;
			}
			
			if(xEnd <= xStart) { xEnd = xStart+1; }
			return item.xEnd = xEnd;
			
		},
		
		findYEnd: function(item) {
			
			var yEnd = -1;
			var yStart = item.yStart;
			switch(item.specifiedYEnd.type) {
				
				case LOCATE_LINE:
					if(item.specifiedYEnd.name) {
						
						//
						// <integer>? <identifier>
						// 
						if(item.specifiedYEnd.index === undefined) {
							
							// First attempts to match the grid areas edge to a named grid area
							yEnd = this.findYLine(item.specifiedYEnd.name+"-end", 0, 0, /*dontFallback*/true);
							
						}
						if(yEnd == -1) {
							
							// Otherwise, contributes the first named line with the specified name to the grid items placement. 
							yEnd = this.findYLine(item.specifiedYEnd.name, 0, (item.specifiedYEnd.index||1)-1);
							
						}
						
					} else {
						
						//
						// <integer>
						//
						yEnd = (item.specifiedYEnd.index||1)-1;
						
					}
					break;
					
				case LOCATE_SPAN:
					if(item.specifiedYEnd.name) {
					
						// Set the corresponding edge N lines apart from its opposite edge. 
						yEnd = this.findYLine(item.specifiedYEnd.name, yStart+1, (item.specifiedYEnd.index||1)-1);
						
						// TODO: I'm having the wrong behavior here, I sent a mail to csswg to get the spec changed
						// "The spec is more what you'd call 'guidelines' than actual rules"
						if(yEnd==-1) { yEnd = 0; }
						
					} else {
						
						// Set the corresponding edge N lines apart from its opposite edge. 
						yEnd = yStart+((item.specifiedYEnd.index|0)||1);
					}
					break;
					
				case LOCATE_AUTO:
					// I don't support subgrids, so this is always true:
					yEnd = yStart+1;
					break;
					
			}
			
			// correct impossible end values
			if(yEnd <= yStart) { yEnd = yStart+1; }
			
			// return the final result
			return item.yEnd = yEnd;

		},
		
		findXLine: function(name, startIndex, skipCount, dontFallback) {
		
			startIndex=startIndex|0;
			skipCount=skipCount|0;
			
			// special case for cases where the name isn't provided
			if(!name) {
				if(startIndex+skipCount < this.xLines.length) {
					return startIndex+skipCount;
				} else {
					return this.xLines.length;
				}
			}
			
			// find the 1+skipCount'th line to match the right name
			var last = -1;
			for(var i = startIndex; i<this.xLines.length; i++) {
				if(this.xLines[i].indexOf(name) >= 0 || (!dontFallback && this.xLines[i].indexOf('*') >= 0)) { 
					if(skipCount>0) { last=i; skipCount--; }
					else { return i; }
				}
			}

			// if we still have lines to find, we know that lines of the implicit grid match all names
			if(!dontFallback) { console.warn('[CSS-GRID] Missing '+(skipCount+1)+' lines named "'+name+'" after line '+startIndex+'.'); last = this.xLines.length+skipCount+1; this.ensureRows(last); }
			return last;
			
		},
		
		findYLine: function(name, startIndex, skipCount, dontFallback) {

			startIndex=startIndex|0;
			skipCount=skipCount|0;
			
			// special case for cases where the name isn't provided
			if(!name) {
				if(startIndex+skipCount < this.yLines.length) {
					return startIndex+skipCount;
				} else {
					return this.yLines.length;
				}
			}
			
			// find the 1+skipCount'th line to match the right name
			var last = -1;
			for(var i = startIndex; i<this.yLines.length; i++) {
				if(this.yLines[i].indexOf(name) >= 0 || (!dontFallback && this.yLines[i].indexOf('*') >= 0)) { 
					if(skipCount>0) { last=i; skipCount--; }
					else { return i; }
				}
			}
			
			// if we still have lines to find, we know that lines of the implicit grid match all names
			if(!dontFallback) { console.warn('[CSS-GRID] Missing '+(skipCount+1)+' lines named "'+name+'" after line '+startIndex+'.'); last = this.yLines.length+skipCount+1; this.ensureColumns(last); }
			return last;
			
		},
		
	}
	
	var cssGrid = {
		
		LOCATE_LINE   :  LOCATE_LINE,
		LOCATE_SPAN   :  LOCATE_SPAN,
		LOCATE_AREA   :  LOCATE_AREA,
		LOCATE_AUTO   :  LOCATE_AUTO,
		
		ALIGN_START   :  ALIGN_START,
		ALIGN_CENTER  :  ALIGN_CENTER,
		ALIGN_END     :  ALIGN_END,
		ALIGN_FIT     :  ALIGN_FIT,  
		
		TRACK_BREADTH_AUTO        : TRACK_BREADTH_AUTO,
		TRACK_BREADTH_LENGTH      : TRACK_BREADTH_LENGTH,
		TRACK_BREADTH_FRACTION    : TRACK_BREADTH_FRACTION,
		TRACK_BREADTH_PERCENTAGE  : TRACK_BREADTH_PERCENTAGE,
		TRACK_BREADTH_MIN_CONTENT : TRACK_BREADTH_MIN_CONTENT,
		TRACK_BREADTH_MAX_CONTENT : TRACK_BREADTH_MAX_CONTENT,

		GridLayout: GridLayout, 
		GridItem: GridItem, 
		GridItemPosition: GridItemPosition,
		GridTrackBreadth: GridTrackBreadth,
		
	};
	return cssGrid;
	
})()

require.define('src/css-grid/lib/grid-layout.js');

////////////////////////////////////////

// TODO: document the "no_auto_css_grid" flag?
// TOOD: document the "no_ms_grid_implementation" flag?

!(function() { "use strict";

	var cssGrid = require('src/css-grid/lib/grid-layout.js');
	console.log("css-grid-polyfill");

	var layoutProperties = ['box-sizing','margin-left','margin-right','margin-top','margin-bottom','padding-left','padding-right','padding-top','padding-bottom','border-left-width','border-right-width','border-top-width','border-bottom-width'];
	registerLayout('grid', class GridLayout {
		
		//
		// [0] define css properties
		//
		static get inputProperties() {
			return ['--grid','--grid-template','--grid-template-rows','--grid-template-columns','--grid-template-areas','--grid-areas','--grid-auto-flow',...layoutProperties];
		}
		static get childInputProperties() {
			return ['--grid-area','--grid-row','--grid-column','--grid-row-start','--grid-row-end','--grid-column-start','--grid-column-end','order',...layoutProperties]
		}

		*intrinsicSizes() { /* ... */ }

		*layout(children, edges, constraints, styleMap) {

			//
			// Initialize the grid layout
			//

			var grid = new cssGrid.GridLayout({ 
				styleMap:styleMap, 
				children:children,
				fixedInlineSize:constraints.fixedInlineSize, 
				fixedBlockSize:constraints.fixedBlockSize
			});

			yield* grid.updateFromElement();
			
			//
			// Perform the grid layout
			// 

			yield* grid.performLayout();

			//
			// Return the layout results
			//
			
			return {
				autoBlockSize: grid.gridHeight + grid.vtPadding + grid.vbPadding, 
				childFragments: grid.items.map(item => item.fragment)
			};

		}

	});

})()
require.define('src/css-grid/polyfill.js');

////////////////////////////////////////

//require('core:dom-matchMedia-polyfill');
//require('core:dom-classList-polyfill');
require('src/css-grid/polyfill.js');
require.define('src/requirements.js');

var cssPolyfills = { require: require };

})();
//# sourceMappingURL=css-polyfills.js.map