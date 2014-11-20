//
// note: this file is based on Tab Atkins's CSS Parser
// please include him (@tabatkins) if you open any issue for this file
// 
module.exports = (function(window, document) { "use strict";

	// 
	// exports
	//
	var cssSyntax = { 
		tokenize: function(string) {/*filled later*/}, 
		parse: function(tokens) {/*filled later*/},
		parseCSSValue: function(bestValue, stringOnly) {
			if(stringOnly) {
				var result = /*bestValue ? cssSyntax.parse("*{a:"+bestValue+"}").value[0].value[0].value : */new cssSyntax.TokenList();
				result.asCSSString = bestValue; // optimize conversion
				return result;
			} else {
				var result = bestValue ? cssSyntax.parse("*{a:"+bestValue+"}").value[0].value[0].value : new cssSyntax.TokenList();
				result.asCSSString = bestValue; // optimize conversion
				return result;
			}
		}
	};

	//
	// css tokenizer
	//
    
    var between = function (num, first, last) { return num >= first && num <= last; }
    function digit(code) { return between(code, 0x30,0x39); }
    function hexdigit(code) { return digit(code) || between(code, 0x41,0x46) || between(code, 0x61,0x66); }
    function uppercaseletter(code) { return between(code, 0x41,0x5a); }
    function lowercaseletter(code) { return between(code, 0x61,0x7a); }
    function letter(code) { return uppercaseletter(code) || lowercaseletter(code); }
    function nonascii(code) { return code >= 0xa0; }
    function namestartchar(code) { return letter(code) || nonascii(code) || code == 0x5f; }
    function namechar(code) { return namestartchar(code) || digit(code) || code == 0x2d; }
    function nonprintable(code) { return between(code, 0,8) || between(code, 0xe,0x1f) || between(code, 0x7f,0x9f); }
    function newline(code) { return code == 0xa || code == 0xd; }
    function whitespace(code) { return newline(code) || code == 9 || code == 0x20; }
    function badescape(code) { return newline(code) || isNaN(code); }
    
    // Note: I'm not yet acting smart enough to actually handle astral characters.
    var maximumallowedcodepoint = 0x10ffff;
    
    // Add support for token lists (superclass of array)
    var TokenList = cssSyntax.TokenList = function TokenList() {
        var array = []; 
        array.toCSSString=cssSyntax.TokenListToCSSString;
        return array;
    }
    var TokenListToCSSString = cssSyntax.TokenListToCSSString = function TokenListToCSSString(sep) {
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
    
    function tokenize(str, options) {
        if(options == undefined) options = {transformFunctionWhitespace:false, scientificNotation:false};
        var i = -1;
        var tokens = new TokenList();
        var state = "data";
        var code;
        var currtoken;
    
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
    
        var next = function(num) { if(num === undefined) num = 1; return str.charCodeAt(i+num); };
        var consume = function(num) {
            if(num === undefined)
                num = 1;
            i += num;
            code = str.charCodeAt(i);
            if (newline(code)) incrLineno();
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
        var eof = function() { return i >= str.length; };
        var donothing = function() {};
        var emit = function(token) {
            if(token) {
                token.finish();
            } else {
                token = currtoken.finish();
            }
            if (options.loc === true) {
                token.loc = {};
                token.loc.start = {line:locStart.line, column:locStart.column};
                locStart = {line: line, column: column};
                token.loc.end = locStart;
            }
            tokens.push(token);
            //console.log('Emitting ' + token);
            currtoken = undefined;
            return true;
        };
        var create = function(token) { currtoken = token; return true; };
        var parseerror = function() { console.log("Parse error at index " + i + ", processing codepoint 0x" + code.toString(16) + " in state " + state + ".");return true; };
        var catchfire = function(msg) { console.log("MAJOR SPEC ERROR: " + msg); return true;}
        var switchto = function(newstate) {
            state = newstate;
            //console.log('Switching to ' + state);
            return true;
        };
        var consumeEscape = function() {
            // Assume the the current character is the \
            consume();
            if(hexdigit(code)) {
                // Consume 1-6 hex digits
                var digits = [];
                for(var total = 0; total < 6; total++) {
                    if(hexdigit(code)) {
                        digits.push(code);
                        consume();
                    } else { break; }
                }
                var value = parseInt(digits.map(String.fromCharCode).join(''), 16);
                if( value > maximumallowedcodepoint ) value = 0xfffd;
                // If the current char is whitespace, cool, we'll just eat it.
                // Otherwise, put it back.
                if(!whitespace(code)) reconsume();
                return value;
            } else {
                return code;
            }
        };
    
        for(;;) {
            if(i > str.length*2) return "I'm infinite-looping!";
            consume();
            switch(state) {
            case "data":
                if(whitespace(code)) {
                    emit(new WhitespaceToken);
                    while(whitespace(next())) consume();
                }
                else if(code == 0x22) switchto("double-quote-string");
                else if(code == 0x23) switchto("hash");
                else if(code == 0x27) switchto("single-quote-string");
                else if(code == 0x28) emit(new OpenParenToken);
                else if(code == 0x29) emit(new CloseParenToken);
                else if(code == 0x2b) {
                    if(digit(next()) || (next() == 0x2e && digit(next(2)))) switchto("number") && reconsume();
                    else emit(new DelimToken(code));
                }
                else if(code == 0x2d) {
                    if(next(1) == 0x2d && next(2) == 0x3e) consume(2) && emit(new CDCToken);
                    else if(digit(next()) || (next(1) == 0x2e && digit(next(2)))) switchto("number") && reconsume();
                    else switchto('ident') && reconsume();
                }
                else if(code == 0x2e) {
                    if(digit(next())) switchto("number") && reconsume();
                    else emit(new DelimToken(code));
                }
                else if(code == 0x2f) {
                    if(next() == 0x2a) consume() && switchto("comment");
                    else emit(new DelimToken(code));
                }
                else if(code == 0x3a) emit(new ColonToken);
                else if(code == 0x3b) emit(new SemicolonToken);
                else if(code == 0x3c) {
                    if(next(1) == 0x21 && next(2) == 0x2d && next(3) == 0x2d) consume(3) && emit(new CDOToken);
                    else emit(new DelimToken(code));
                }
                else if(code == 0x40) switchto("at-keyword");
                else if(code == 0x5b) emit(new OpenSquareToken);
                else if(code == 0x5c) {
                    if(badescape(next())) parseerror() && emit(new DelimToken(code));
                    else switchto('ident') && reconsume();
                }
                else if(code == 0x5d) emit(new CloseSquareToken);
                else if(code == 0x7b) emit(new OpenCurlyToken);
                else if(code == 0x7d) emit(new CloseCurlyToken);
                else if(digit(code)) switchto("number") && reconsume();
                else if(code == 0x55 || code == 0x75) {
                    if(next(1) == 0x2b && hexdigit(next(2))) consume() && switchto("unicode-range");
                    else switchto('ident') && reconsume();
                }
                else if(namestartchar(code)) switchto('ident') && reconsume();
                else if(eof()) { emit(new EOFToken); return tokens; }
                else emit(new DelimToken(code));
                break;
    
            case "double-quote-string":
                if(currtoken == undefined) create(new StringToken);
    
                if(code == 0x22) emit() && switchto("data");
                else if(eof()) parseerror() && emit() && switchto("data") && reconsume();
                else if(newline(code)) parseerror() && emit(new BadStringToken) && switchto("data") && reconsume();
                else if(code == 0x5c) {
                    if(badescape(next())) parseerror() && emit(new BadStringToken) && switchto("data");
                    else if(newline(next())) consume();
                    else currtoken.append(consumeEscape());
                }
                else currtoken.append(code);
                break;
    
            case "single-quote-string":
                if(currtoken == undefined) create(new StringToken);
    
                if(code == 0x27) emit() && switchto("data");
                else if(eof()) parseerror() && emit() && switchto("data");
                else if(newline(code)) parseerror() && emit(new BadStringToken) && switchto("data") && reconsume();
                else if(code == 0x5c) {
                    if(badescape(next())) parseerror() && emit(new BadStringToken) && switchto("data");
                    else if(newline(next())) consume();
                    else currtoken.append(consumeEscape());
                }
                else currtoken.append(code);
                break;
    
            case "hash":
                if(namechar(code)) create(new HashToken(code)) && switchto("hash-rest");
                else if(code == 0x5c) {
                    if(badescape(next())) parseerror() && emit(new DelimToken(0x23)) && switchto("data") && reconsume();
                    else create(new HashToken(consumeEscape())) && switchto('hash-rest');
                }
                else emit(new DelimToken(0x23)) && switchto('data') && reconsume();
                break;
    
            case "hash-rest":
                if(namechar(code)) currtoken.append(code);
                else if(code == 0x5c) {
                    if(badescape(next())) parseerror() && emit() && switchto("data") && reconsume();
                    else currtoken.append(consumeEscape());
                }
                else emit() && switchto('data') && reconsume();
                break;
    
            case "comment":
                if(code == 0x2a) {
                    if(next() == 0x2f) consume() && switchto('data');
                    else donothing();
                }
                else if(eof()) parseerror() && switchto('data') && reconsume();
                else donothing();
                break;
    
            case "at-keyword":
                if(code == 0x2d) {
                    if(namestartchar(next()) || next()==0x2d) create(new AtKeywordToken(0x2d)) && switchto('at-keyword-rest');
                    else if(next(1) == 0x5c && !badescape(next(2))) create(new AtKeywordtoken(0x2d)) && switchto('at-keyword-rest');
                    else parseerror() && emit(new DelimToken(0x40)) && switchto('data') && reconsume();
                }
                else if(namestartchar(code)) create(new AtKeywordToken(code)) && switchto('at-keyword-rest');
                else if(code == 0x5c) {
                    if(badescape(next())) parseerror() && emit(new DelimToken(0x23)) && switchto("data") && reconsume();
                    else create(new AtKeywordToken(consumeEscape())) && switchto('at-keyword-rest');
                }
                else emit(new DelimToken(0x40)) && switchto('data') && reconsume();
                break;
    
            case "at-keyword-rest":
                if(namechar(code)) currtoken.append(code);
                else if(code == 0x5c) {
                    if(badescape(next())) parseerror() && emit() && switchto("data") && reconsume();
                    else currtoken.append(consumeEscape());
                }
                else emit() && switchto('data') && reconsume();
                break;
    
            case "ident":
                if(code == 0x2d) {
                    if(namestartchar(next()) || next()==0x2d) create(new IdentifierToken(code)) && switchto('ident-rest');
                    else if(next(1) == 0x5c && !badescape(next(2))) create(new IdentifierToken(code)) && switchto('ident-rest');
                    else emit(new DelimToken(0x2d)) && switchto('data');
                }
                else if(namestartchar(code)) create(new IdentifierToken(code)) && switchto('ident-rest');
                else if(code == 0x5c) {
                    if(badescape(next())) parseerror() && switchto("data") && reconsume();
                    else create(new IdentifierToken(consumeEscape())) && switchto('ident-rest');
                }
                else catchfire("Hit the generic 'else' clause in ident state.") && switchto('data') && reconsume();
                break;
    
            case "ident-rest":
                if(namechar(code)) currtoken.append(code);
                else if(code == 0x5c) {
                    if(badescape(next())) parseerror() && emit() && switchto("data") && reconsume();
                    else currtoken.append(consumeEscape());
                }
                else if(code == 0x28) {
                    if(currtoken.ASCIImatch('url')) switchto('url');
                    else emit(new FunctionToken(currtoken)) && switchto('data');
                } 
                else if(whitespace(code) && options.transformFunctionWhitespace) switchto('transform-function-whitespace') && reconsume();
                else emit() && switchto('data') && reconsume();
                break;
    
            case "transform-function-whitespace":
                if(whitespace(next())) donothing();
                else if(code == 0x28) emit(new FunctionToken(currtoken)) && switchto('data');
                else emit() && switchto('data') && reconsume();
                break;
    
            case "number":
                create(new NumberToken());
    
                if(code == 0x2d) {
                    if(digit(next())) consume() && currtoken.append([0x2d,code]) && switchto('number-rest');
                    else if(next(1) == 0x2e && digit(next(2))) consume(2) && currtoken.append([0x2d,0x2e,code]) && switchto('number-fraction');
                    else switchto('data') && reconsume();
                }
                else if(code == 0x2b) {
                    if(digit(next())) consume() && currtoken.append([0x2b,code]) && switchto('number-rest');
                    else if(next(1) == 0x2e && digit(next(2))) consume(2) && currtoken.append([0x2b,0x2e,code]) && switchto('number-fraction');
                    else switchto('data') && reconsume();
                }
                else if(digit(code)) currtoken.append(code) && switchto('number-rest');
                else if(code == 0x2e) {
                    if(digit(next())) consume() && currtoken.append([0x2e,code]) && switchto('number-fraction');
                    else switchto('data') && reconsume();
                }
                else switchto('data') && reconsume();
                break;
    
            case "number-rest":
                if(digit(code)) currtoken.append(code);
                else if(code == 0x2e) {
                    if(digit(next())) consume() && currtoken.append([0x2e,code]) && switchto('number-fraction');
                    else emit() && switchto('data') && reconsume();
                }
                else if(code == 0x25) emit(new PercentageToken(currtoken)) && switchto('data');
                else if(code == 0x45 || code == 0x65) {
                    if(digit(next())) consume() && currtoken.append([0x25,code]) && switchto('sci-notation');
                    else if((next(1) == 0x2b || next(1) == 0x2d) && digit(next(2))) currtoken.append([0x25,next(1),next(2)]) && consume(2) && switchto('sci-notation');
                    else create(new DimensionToken(currtoken,code)) && switchto('dimension');
                }
                else if(code == 0x2d) {
                    if(namestartchar(next())) consume() && create(new DimensionToken(currtoken,[0x2d,code])) && switchto('dimension');
                    else if(next(1) == 0x5c && badescape(next(2))) parseerror() && emit() && switchto('data') && reconsume();
                    else if(next(1) == 0x5c) consume() && create(new DimensionToken(currtoken, [0x2d,consumeEscape()])) && switchto('dimension');
                    else emit() && switchto('data') && reconsume();
                }
                else if(namestartchar(code)) create(new DimensionToken(currtoken, code)) && switchto('dimension');
                else if(code == 0x5c) {
                    if(badescape(next)) parseerror() && emit() && switchto('data') && reconsume();
                    else create(new DimensionToken(currtoken,consumeEscape)) && switchto('dimension');
                }
                else emit() && switchto('data') && reconsume();
                break;
    
            case "number-fraction":
                currtoken.type = "number";
    
                if(digit(code)) currtoken.append(code);
                else if(code == 0x25) emit(new PercentageToken(currtoken)) && switchto('data');
                else if(code == 0x45 || code == 0x65) {
                    if(digit(next())) consume() && currtoken.append([0x65,code]) && switchto('sci-notation');
                    else if((next(1) == 0x2b || next(1) == 0x2d) && digit(next(2))) currtoken.append([0x65,next(1),next(2)]) && consume(2) && switchto('sci-notation');
                    else create(new DimensionToken(currtoken,code)) && switchto('dimension');
                }
                else if(code == 0x2d) {
                    if(namestartchar(next())) consume() && create(new DimensionToken(currtoken,[0x2d,code])) && switchto('dimension');
                    else if(next(1) == 0x5c && badescape(next(2))) parseerror() && emit() && switchto('data') && reconsume();
                    else if(next(1) == 0x5c) consume() && create(new DimensionToken(currtoken, [0x2d,consumeEscape()])) && switchto('dimension');
                    else emit() && switchto('data') && reconsume();
                }
                else if(namestartchar(code)) create(new DimensionToken(currtoken, code)) && switchto('dimension');
                else if(code == 0x5c) {
                    if(badescape(next)) parseerror() && emit() && switchto('data') && reconsume();
                    else create(new DimensionToken(currtoken,consumeEscape())) && switchto('dimension');
                }
                else emit() && switchto('data') && reconsume();
                break;
    
            case "dimension":
                if(namechar(code)) currtoken.append(code);
                else if(code == 0x5c) {
                    if(badescape(next())) parseerror() && emit() && switchto('data') && reconsume();
                    else currtoken.append(consumeEscape());
                }
                else emit() && switchto('data') && reconsume();
                break;
    
            case "sci-notation":
                currtoken.type = "number";
    
                if(digit(code)) currtoken.append(code);
                else emit() && switchto('data') && reconsume();
                break;
    
            case "url":
                if(eof()) parseerror() && emit(new BadURLToken) && switchto('data');
                else if(code == 0x22) switchto('url-double-quote');
                else if(code == 0x27) switchto('url-single-quote');
                else if(code == 0x29) emit(new URLToken) && switchto('data');
                else if(whitespace(code)) donothing();
                else switchto('url-unquoted') && reconsume();
                break;
    
            case "url-double-quote":
                if(! (currtoken instanceof URLToken)) create(new URLToken);
    
                if(eof()) parseerror() && emit(new BadURLToken) && switchto('data');
                else if(code == 0x22) switchto('url-end');
                else if(newline(code)) parseerror() && switchto('bad-url');
                else if(code == 0x5c) {
                    if(newline(next())) consume();
                    else if(badescape(next())) parseerror() && emit(new BadURLToken) && switchto('data') && reconsume();
                    else currtoken.append(consumeEscape());
                }
                else currtoken.append(code);
                break;
    
            case "url-single-quote":
                if(! (currtoken instanceof URLToken)) create(new URLToken);
    
                if(eof()) parseerror() && emit(new BadURLToken) && switchto('data');
                else if(code == 0x27) switchto('url-end');
                else if(newline(code)) parseerror() && switchto('bad-url');
                else if(code == 0x5c) {
                    if(newline(next())) consume();
                    else if(badescape(next())) parseerror() && emit(new BadURLToken) && switchto('data') && reconsume();
                    else currtoken.append(consumeEscape());
                }
                else currtoken.append(code);
                break;
    
            case "url-end":
                if(eof()) parseerror() && emit(new BadURLToken) && switchto('data');
                else if(whitespace(code)) donothing();
                else if(code == 0x29) emit() && switchto('data');
                else parseerror() && switchto('bad-url') && reconsume();
                break;
    
            case "url-unquoted":
                if(! (currtoken instanceof URLToken)) create(new URLToken);
    
                if(eof()) parseerror() && emit(new BadURLToken) && switchto('data');
                else if(whitespace(code)) switchto('url-end');
                else if(code == 0x29) emit() && switchto('data');
                else if(code == 0x22 || code == 0x27 || code == 0x28 || nonprintable(code)) parseerror() && switchto('bad-url');
                else if(code == 0x5c) {
                    if(badescape(next())) parseerror() && switchto('bad-url');
                    else currtoken.append(consumeEscape());
                }
                else currtoken.append(code);
                break;
    
            case "bad-url":
                if(eof()) parseerror() && emit(new BadURLToken) && switchto('data');
                else if(code == 0x29) emit(new BadURLToken) && switchto('data');
                else if(code == 0x5c) {
                    if(badescape(next())) donothing();
                    else consumeEscape();
                }
                else donothing();
                break;
    
            case "unicode-range":
                // We already know that the current code is a hexdigit.
    
                var start = [code], end = [code];
    
                for(var total = 1; total < 6; total++) {
                    if(hexdigit(next())) {
                        consume();
                        start.push(code);
                        end.push(code);
                    }
                    else break;
                }
    
                if(next() == 0x3f) {
                    for(;total < 6; total++) {
                        if(next() == 0x3f) {
                            consume();
                            start.push("0".charCodeAt(0));
                            end.push("f".charCodeAt(0));
                        }
                        else break;
                    }
                    emit(new UnicodeRangeToken(start,end)) && switchto('data');
                }
                else if(next(1) == 0x2d && hexdigit(next(2))) {
                    consume();
                    consume();
                    end = [code];
                    for(var total = 1; total < 6; total++) {
                        if(hexdigit(next())) {
                            consume();
                            end.push(code);
                        }
                        else break;
                    }
                    emit(new UnicodeRangeToken(start,end)) && switchto('data');
                }
                else emit(new UnicodeRangeToken(start)) && switchto('data');
                break;
    
            default:
                catchfire("Unknown state '" + state + "'");
            }
        }
    }
    
    function stringFromCodeArray(arr) {
        return String.fromCharCode.apply(null,arr.filter(function(e){return e;}));
    }
    
    var CSSParserToken = cssSyntax.CSSParserToken = function CSSParserToken(options) { return this; }
    CSSParserToken.prototype.tokenType = "UNKNOWN";
    CSSParserToken.prototype.finish = function() { return this; }
    CSSParserToken.prototype.toString = function() { return this.tokenType; }
    CSSParserToken.prototype.toJSON = function() { return this.toString(); }
    CSSParserToken.prototype.toCSSString = function() { return this.toString(); }
    
    var BadStringToken = cssSyntax.BadStringToken = function BadStringToken() { return this; }
    BadStringToken.prototype = new CSSParserToken;
    BadStringToken.prototype.tokenType = "BADSTRING";
    BadStringToken.prototype.toCSSString = function() { return "'"; }
    
    var BadURLToken = cssSyntax.BadURLToken = function BadURLToken() { return this; }
    BadURLToken.prototype = new CSSParserToken;
    BadURLToken.prototype.tokenType = "BADURL";
    BadURLToken.prototype.toCSSString = function() { return "url("; }
    
    var WhitespaceToken = cssSyntax.WhitespaceToken = function WhitespaceToken() { return this; }
    WhitespaceToken.prototype = new CSSParserToken;
    WhitespaceToken.prototype.tokenType = "WHITESPACE";
    WhitespaceToken.prototype.toString = function() { return "WS"; }
    WhitespaceToken.prototype.toCSSString = function() { return " "; }
    
    var CDOToken = cssSyntax.CDOToken = function CDOToken() { return this; }
    CDOToken.prototype = new CSSParserToken;
    CDOToken.prototype.tokenType = "CDO";
    CDOToken.prototype.toCSSString = function() { return "<!--"; }
    
    var CDCToken = cssSyntax.CDCToken = function CDCToken() { return this; }
    CDCToken.prototype = new CSSParserToken;
    CDCToken.prototype.tokenType = "CDC";
    CDOToken.prototype.toCSSString = function() { return "-->"; }
    
    var ColonToken = cssSyntax.ColonToken = function ColonToken() { return this; }
    ColonToken.prototype = new CSSParserToken;
    ColonToken.prototype.tokenType = ":";
    
    var SemicolonToken = cssSyntax.SemicolonToken = function SemicolonToken() { return this; }
    SemicolonToken.prototype = new CSSParserToken;
    SemicolonToken.prototype.tokenType = ";";
    
    var OpenCurlyToken = cssSyntax.OpenCurlyToken = function OpenCurlyToken() { return this; }
    OpenCurlyToken.prototype = new CSSParserToken;
    OpenCurlyToken.prototype.tokenType = "{";
    
    var CloseCurlyToken = cssSyntax.CloseCurlyToken = function CloseCurlyToken() { return this; }
    CloseCurlyToken.prototype = new CSSParserToken;
    CloseCurlyToken.prototype.tokenType = "}";
    
    var OpenSquareToken = cssSyntax.OpenSquareToken = function OpenSquareToken() { return this; }
    OpenSquareToken.prototype = new CSSParserToken;
    OpenSquareToken.prototype.tokenType = "[";
    
    var CloseSquareToken = cssSyntax.CloseSquareToken = function CloseSquareToken() { return this; }
    CloseSquareToken.prototype = new CSSParserToken;
    CloseSquareToken.prototype.tokenType = "]";
    
    var OpenParenToken = cssSyntax.OpenParenToken = function OpenParenToken() { return this; }
    OpenParenToken.prototype = new CSSParserToken;
    OpenParenToken.prototype.tokenType = "(";
    
    var CloseParenToken = cssSyntax.CloseParenToken = function CloseParenToken() { return this; }
    CloseParenToken.prototype = new CSSParserToken;
    CloseParenToken.prototype.tokenType = ")";
    
    var EOFToken = cssSyntax.EOFToken = function EOFToken() { return this; }
    EOFToken.prototype = new CSSParserToken;
    EOFToken.prototype.tokenType = "EOF";
    EOFToken.prototype.toCSSString = function() { return ""; }
    
    var DelimToken = cssSyntax.DelimToken = function DelimToken(code) {
        this.value = String.fromCharCode(code);
        return this;
    }
    DelimToken.prototype = new CSSParserToken;
    DelimToken.prototype.tokenType = "DELIM";
    DelimToken.prototype.toString = function() { return "DELIM("+this.value+")"; }
    DelimToken.prototype.toCSSString = function() { return this.value; }
    
    var StringValuedToken = cssSyntax.StringValuedToken = function StringValuedToken() { return this; }
    StringValuedToken.prototype = new CSSParserToken;
    StringValuedToken.prototype.append = function(val) {
        if(val instanceof Array) {
            for(var i = 0; i < val.length; i++) {
                this.value.push(val[i]);
            }
        } else {
            this.value.push(val);
        }
        return true;
    }
    StringValuedToken.prototype.finish = function() {
        this.value = this.valueAsString();
        return this;
    }
    StringValuedToken.prototype.ASCIImatch = function(str) {
        return this.valueAsString().toLowerCase() == str.toLowerCase();
    }
    StringValuedToken.prototype.valueAsString = function() {
        if(typeof this.value == 'string') return this.value;
        return stringFromCodeArray(this.value);
    }
    StringValuedToken.prototype.valueAsCodes = function() {
        if(typeof this.value == 'string') {
            var ret = [];
            for(var i = 0; i < this.value.length; i++)
                ret.push(this.value.charCodeAt(i));
            return ret;
        }
        return this.value.filter(function(e){return e;});
    }
    
    var IdentifierToken = cssSyntax.IdentifierToken = function IdentifierToken(val) {
        this.value = new TokenList();
        this.append(val);
    }
    IdentifierToken.prototype = new StringValuedToken;
    IdentifierToken.prototype.tokenType = "IDENT";
    IdentifierToken.prototype.toString = function() { return "IDENT("+this.value+")"; }
    IdentifierToken.prototype.toCSSString = function() { return this.value; }
    
    var FunctionToken = cssSyntax.FunctionToken = function FunctionToken(val) {
        // These are always constructed by passing an IdentifierToken
        this.value = val.finish().value;
    }
    FunctionToken.prototype = new StringValuedToken;
    FunctionToken.prototype.tokenType = "FUNCTION";
    FunctionToken.prototype.toString = function() { return "FUNCTION("+this.value+")"; }
    FunctionToken.prototype.toCSSString = function() { return this.value+"("; }
    
    var AtKeywordToken = cssSyntax.AtKeywordToken = function AtKeywordToken(val) {
        this.value = new TokenList();
        this.append(val);
    }
    AtKeywordToken.prototype = new StringValuedToken;
    AtKeywordToken.prototype.tokenType = "AT-KEYWORD";
    AtKeywordToken.prototype.toString = function() { return "AT("+this.value+")"; }
    AtKeywordToken.prototype.toCSSString = function() { return "@"+this.value; }
    
    var HashToken = cssSyntax.HashToken = function HashToken(val) {
        this.value = new TokenList();
        this.append(val);
    }
    HashToken.prototype = new StringValuedToken;
    HashToken.prototype.tokenType = "HASH";
    HashToken.prototype.toString = function() { return "HASH("+this.value+")"; }
    HashToken.prototype.toCSSString = function() { return "#"+this.value; }
    
    var StringToken = cssSyntax.StringToken = function StringToken(val) {
        this.value = new TokenList();
        this.append(val);
    }
    StringToken.prototype = new StringValuedToken;
    StringToken.prototype.tokenType = "STRING";
    StringToken.prototype.toString = function() { return '"'+this.value+'"'; }
    StringToken.prototype.toCSSString = function() { return '"'+this.value.replace(/"/g,'\\"')+'"'; } // TODO: improve string serialization?
    
    var URLToken = cssSyntax.URLToken = function URLToken(val) {
        this.value = new TokenList();
        this.append(val);
    }
    URLToken.prototype = new StringValuedToken;
    URLToken.prototype.tokenType = "URL";
    URLToken.prototype.toString = function() { return "URL("+this.value+")"; }
    URLToken.prototype.toCSSString = function() { return 'url("'+this.value.replace(/"/g,'\\"')+'")'; } // TODO: improve string serialization?; }
    
    var NumberToken = cssSyntax.NumberToken = function NumberToken(val) {
        this.value = new TokenList();
        this.append(val);
        this.type = "integer";
    }
    NumberToken.prototype = new StringValuedToken;
    NumberToken.prototype.tokenType = "NUMBER";
    NumberToken.prototype.toString = function() {
        if(this.type == "integer")
            return "INT("+this.value+")";
        return "NUMBER("+this.value+")";
    }
    NumberToken.prototype.finish = function() {
        this.repr = this.valueAsString();
        this.value = this.repr * 1;
        if(Math.abs(this.value) % 1 != 0) this.type = "number";
        return this;
    }
    NumberToken.prototype.toCSSString = function() { return ""+this.value; }
    
    
    var PercentageToken = cssSyntax.PercentageToken = function PercentageToken(val) {
        // These are always created by passing a NumberToken as val
        val.finish();
        this.value = val.value;
        this.repr = val.repr;
    }
    PercentageToken.prototype = new CSSParserToken;
    PercentageToken.prototype.tokenType = "PERCENTAGE";
    PercentageToken.prototype.toString = function() { return "PERCENTAGE("+this.value+")"; }
    PercentageToken.prototype.toCSSString = function() { return this.value+"%"; }
    
    var DimensionToken = cssSyntax.DimensionToken = function DimensionToken(val,unit) {
        // These are always created by passing a NumberToken as the val
        val.finish();
        this.num = val.value;
        this.unit = [];
        this.repr = val.repr;
        this.append(unit);
    }
    DimensionToken.prototype = new CSSParserToken;
    DimensionToken.prototype.tokenType = "DIMENSION";
    DimensionToken.prototype.toString = function() { return "DIM("+this.num+","+this.unit+")"; }
    DimensionToken.prototype.toCSSString = function() { return this.num+this.unit; }
    DimensionToken.prototype.append = function(val) {
        if(val instanceof Array) {
            for(var i = 0; i < val.length; i++) {
                this.unit.push(val[i]);
            }
        } else {
            this.unit.push(val);
        }
        return true;
    }
    DimensionToken.prototype.finish = function() {
        this.unit = stringFromCodeArray(this.unit);
        this.repr += this.unit;
        return this;
    }
    
    var UnicodeRangeToken = cssSyntax.UnicodeRangeToken = function UnicodeRangeToken(start,end) {
        // start and end are array of char codes, completely finished
        start = parseInt(stringFromCodeArray(start),16);
        if(end === undefined) end = start + 1;
        else end = parseInt(stringFromCodeArray(end),16);
    
        if(start > maximumallowedcodepoint) end = start;
        if(end < start) end = start;
        if(end > maximumallowedcodepoint) end = maximumallowedcodepoint;
    
        this.start = start;
        this.end = end;
        return this;
    }
    UnicodeRangeToken.prototype = new CSSParserToken;
    UnicodeRangeToken.prototype.tokenType = "UNICODE-RANGE";
    UnicodeRangeToken.prototype.toCSSString = function() { return "¿"; }
    UnicodeRangeToken.prototype.toString = function() {
        if(this.start+1 == this.end)
            return "UNICODE-RANGE("+this.start.toString(16).toUpperCase()+")";
        if(this.start < this.end)
            return "UNICODE-RANGE("+this.start.toString(16).toUpperCase()+"-"+this.end.toString(16).toUpperCase()+")";
        return "UNICODE-RANGE()";
    }
    UnicodeRangeToken.prototype.contains = function(code) {
        return code >= this.start && code < this.end;
    }
    
    
    // Exportation.
    cssSyntax.tokenize = tokenize;
	
	//
	// css parser
	//
    
    var TokenList = cssSyntax.TokenList;
    function parse(tokens) {
        // FREMY's ADDITION:
        // You can give a string to parse, it will tokenize it for you
        // { this break module boundaries, but who cares? }
        if(typeof(tokens)=="string") {
            tokens = cssSyntax.tokenize(tokens);
        }
        
        var mode = 'top-level';
        var i = -1;
        var token;
    
        var stylesheet = new Stylesheet;
        var stack = [stylesheet];
        var rule = stack[0];
    
        var consume = function(advance) {
            if(advance === undefined) advance = 1;
            i += advance;
            if(i < tokens.length)
                token = tokens[i];
            else
                token = new EOFToken;
            return true;
        };
        var reprocess = function() {
            i--;
            return true;
        }
        var next = function() {
            return tokens[i+1];
        };
        var switchto = function(newmode) {
            if(newmode === undefined) {
                if(rule.fillType !== '')
                    mode = rule.fillType;
                else if(rule.type == 'STYLESHEET')
                    mode = 'top-level'
                else { console.log("Unknown rule-type while switching to current rule's content mode: ",rule); mode = ''; }
            } else {
                mode = newmode;
            }
            return true;
        }
        var push = function(newRule) {
            rule = newRule;
            stack.push(rule);
            return true;
        }
        var parseerror = function(msg) {
            console.log("Parse error at token " + i + ": " + token + ".\n" + msg);
            return true;
        }
        var pop = function() {
            var oldrule = stack.pop();
            rule = stack[stack.length - 1];
            rule.append(oldrule);
            return true;
        }
        var discard = function() {
            stack.pop();
            rule = stack[stack.length - 1];
            return true;
        }
        var finish = function() {
            while(stack.length > 1) {
                pop();
            }
        }
    
        for(;;) {
            consume();
    
            switch(mode) {
            case "top-level":
                switch(token.tokenType) {
                case "CDO":
                case "CDC":
                case "WHITESPACE": break;
                case "AT-KEYWORD": push(new AtRule(token.value)) && switchto('at-rule'); break;
                case "{": parseerror("Attempt to open a curly-block at top-level.") && consumeAPrimitive(); break;
                case "EOF": finish(); return stylesheet;
                default: push(new StyleRule) && switchto('selector') && reprocess();
                }
                break;
    
            case "at-rule":
                switch(token.tokenType) {
                case ";": pop() && switchto(); break;
                case "{":
                    if(rule.fillType !== '') switchto(rule.fillType);
                    else parseerror("Attempt to open a curly-block in a statement-type at-rule.") && discard() && switchto('next-block') && reprocess();
                    break;
                case "EOF": finish(); return stylesheet;
                default: rule.appendPrelude(consumeAPrimitive());
                }
                break;
    
            case "rule":
                switch(token.tokenType) {
                case "WHITESPACE": break;
                case "}": pop() && switchto(); break;
                case "AT-KEYWORD": push(new AtRule(token.value)) && switchto('at-rule'); break;
                case "EOF": finish(); return stylesheet;
                default: push(new StyleRule) && switchto('selector') && reprocess();
                }
                break;
    
            case "selector":
                switch(token.tokenType) {
                case "{": switchto('declaration'); break;
                case "EOF": discard() && finish(); return stylesheet;
                default: rule.appendSelector(consumeAPrimitive()); 
                }
                break;
    
            case "declaration":
                switch(token.tokenType) {
                case "WHITESPACE":
                case ";": break;
                case "}": pop() && switchto(); break;
                case "AT-RULE": push(new AtRule(token.value)) && switchto('at-rule'); break;
                case "IDENT": push(new Declaration(token.value)) && switchto('after-declaration-name'); break;
                case "EOF": finish(); return stylesheet;
                default: parseerror() && discard() && switchto('next-declaration');
                }
                break;
    
            case "after-declaration-name":
                switch(token.tokenType) {
                case "WHITESPACE": break;
                case ":": switchto('declaration-value'); break;
                case ";": parseerror("Incomplete declaration - semicolon after property name.") && discard() && switchto(); break;
                case "EOF": discard() && finish(); return stylesheet;
                default: parseerror("Invalid declaration - additional token after property name") && discard() && switchto('next-declaration');
                }
                break;
    
            case "declaration-value":
                switch(token.tokenType) {
                case "DELIM":
                    if(token.value == "!" && next().tokenType == 'IDENT' && next().value.toLowerCase() == "important") {
                        consume();
                        rule.important = true;
                        switchto('declaration-end');
                    } else {
                        rule.append(token);
                    }
                    break;
                case ";": pop() && switchto(); break;
                case "}": pop() && pop() && switchto(); break;
                case "EOF": finish(); return stylesheet;
                default: rule.append(consumeAPrimitive());
                }
                break;
    
            case "declaration-end":
                switch(token.tokenType) {
                case "WHITESPACE": break;
                case ";": pop() && switchto(); break;
                case "}": pop() && pop() && switchto(); break;
                case "EOF": finish(); return stylesheet;
                default: parseerror("Invalid declaration - additional token after !important.") && discard() && switchto('next-declaration');
                }
                break;
    
            case "next-block":
                switch(token.tokenType) {
                case "{": consumeAPrimitive() && switchto(); break;
                case "EOF": finish(); return stylesheet;
                default: consumeAPrimitive(); break;
                }
                break;
    
            case "next-declaration":
                switch(token.tokenType) {
                case ";": switchto('declaration'); break;
                case "}": switchto('declaration') && reprocess(); break;
                case "EOF": finish(); return stylesheet;
                default: consumeAPrimitive(); break;
                }
                break;
    
            default:
                // If you hit this, it's because one of the switchto() calls is typo'd.
                console.log('Unknown parsing mode: ' + mode);
                return;
            }
        }
    
        function consumeAPrimitive() {
            switch(token.tokenType) {
            case "(":
            case "[":
            case "{": return consumeASimpleBlock();
            case "FUNCTION": return consumeAFunc();
            default: return token;
            }
        }
    
        function consumeASimpleBlock() {
            var endingTokenType = {"(":")", "[":"]", "{":"}"}[token.tokenType];
            var block = new SimpleBlock(token.tokenType);
    
            for(;;) {
                consume();
                switch(token.tokenType) {
                case "EOF":
                case endingTokenType: return block;
                default: block.append(consumeAPrimitive());
                }
            }
        }
    
        function consumeAFunc() {
            var func = new Func(token.value);
            var arg = new FuncArg();
    
            for(;;) {
                consume();
                switch(token.tokenType) {
                case "EOF":
                case ")": func.append(arg); return func;
                case "DELIM":
                    if(token.value == ",") {
                        func.append(arg);
                        arg = new FuncArg();
                    } else {
                        arg.append(token);
                    }
                    break;
                default: arg.append(consumeAPrimitive());
                }
            }
        }
    }
    
    var CSSParserRule = cssSyntax.CSSParserRule = function CSSParserRule() { return this; }
	CSSParserRule.prototype.fillType = '';
    CSSParserRule.prototype.tokenType = 'NOT_A_TOKEN';
    CSSParserRule.prototype.toString = function(indent) {
        return JSON.stringify(this.toJSON(),null,indent);
    }
    CSSParserRule.prototype.append = function(val) {
        this.value.push(val);
        return this;
    }
    
    var Stylesheet = cssSyntax.Stylesheet = function Stylesheet() {
        this.value = new TokenList();
        return this;
    }
    Stylesheet.prototype = new CSSParserRule;
    Stylesheet.prototype.type = "STYLESHEET";
    Stylesheet.prototype.toJSON = function() {
        return {type:'stylesheet', value: this.value.map(function(e){return e.toJSON();})};
    }
    Stylesheet.prototype.toCSSString = function() { return this.value.toCSSString("\n"); }
    
    var AtRule = cssSyntax.AtRule = function AtRule(name) {
        this.name = name;
        this.prelude = new TokenList();
        this.value = new TokenList();
        if(name in AtRule.registry)
            this.fillType = AtRule.registry[name];
        return this;
    }
    AtRule.prototype = new CSSParserRule;
    AtRule.prototype.type = "AT-RULE";
    AtRule.prototype.appendPrelude = function(val) {
        this.prelude.push(val);
        return this;
    }
    AtRule.prototype.toJSON = function() {
        return {type:'at', name:this.name, prelude:this.prelude.map(function(e){return e.toJSON();}), value:this.value.map(function(e){return e.toJSON();})};
    }
    AtRule.prototype.toCSSString = function() { 
        if(this.fillType != '') {
            return "@" + this.name + " " + this.prelude.toCSSString() + '{' + this.value.toCSSString() + '} '; 
        } else {
            return "@" + this.name + " " + this.prelude.toCSSString() + '; '; 
        }
    }
    AtRule.registry = {
        'import': '',
        'media': 'rule',
        'font-face': 'declaration',
        'page': 'declaration',
        'keyframes': 'rule',
        'namespace': '',
        'counter-style': 'declaration',
        'supports': 'rule',
        'document': 'rule',
        'font-feature-values': 'declaration',
        'viewport': '',
        'region-style': 'rule'
    };
    
    var StyleRule = cssSyntax.StyleRule = function StyleRule() {
        this.selector = new TokenList();
        this.value = new TokenList();
        return this;
    }
    StyleRule.prototype = new CSSParserRule;
    StyleRule.prototype.type = "STYLE-RULE";
    StyleRule.prototype.fillType = 'declaration';
    StyleRule.prototype.appendSelector = function(val) {
        this.selector.push(val);
        return this;
    }
    StyleRule.prototype.toJSON = function() {
        return {type:'selector', selector:this.selector.map(function(e){return e.toJSON();}), value:this.value.map(function(e){return e.toJSON();})};
    }
    StyleRule.prototype.toCSSString = function() { return this.selector.toCSSString() + '{' + this.value.toCSSString() + '} '; }

    
    var Declaration = cssSyntax.Declaration = function Declaration(name) {
        this.name = name;
        this.value = new TokenList();
        return this;
    }
    Declaration.prototype = new CSSParserRule;
    Declaration.prototype.type = "DECLARATION";
    Declaration.prototype.toJSON = function() {
        return {type:'declaration', name:this.name, value:this.value.map(function(e){return e.toJSON();})};
    }
    Declaration.prototype.toCSSString = function() { return this.name + ':' + this.value.toCSSString() + '; '; }
    
    var SimpleBlock = cssSyntax.SimpleBlock = function SimpleBlock(type) {
        this.name = type;
        this.value = new TokenList();
        return this;
    }
    SimpleBlock.prototype = new CSSParserRule;
    SimpleBlock.prototype.type = "BLOCK";
    SimpleBlock.prototype.toJSON = function() {
        return {type:'block', name:this.name, value:this.value.map(function(e){return e.toJSON();})};
    }
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
    
    var Func = cssSyntax.Func = function Func(name) {
        this.name = name;
        this.value = new TokenList();
        return this;
    }
    Func.prototype = new CSSParserRule;
    Func.prototype.type = "FUNCTION";
    Func.prototype.toJSON = function() {
        return {type:'func', name:this.name, value:this.value.map(function(e){return e.toJSON();})};
    }
    Func.prototype.toCSSString = function() {
        return this.name+'('+this.value.toCSSString().slice(0,-2)+')';
    }
    
    var FuncArg = cssSyntax.FuncArg = function FuncArg() {
        this.value = new TokenList();
        return this;
    }
    FuncArg.prototype = new CSSParserRule;
    FuncArg.prototype.type = "FUNCTION-ARG";
    FuncArg.prototype.toJSON = function() {
        return this.value.map(function(e){return e.toJSON();});
    }
    FuncArg.prototype.toCSSString = function() {
        return this.value.toCSSString()+', ';
    }
    
    // Exportation.
    cssSyntax.parse = parse;
	return cssSyntax;

}());
