/// <reference path="../requirements.ts" />
interface ModuleHub { (file: 'core:css-syntax'): CSSSyntax.CSSSyntaxModule; }
module CSSSyntax {

	/**
	*   Provides a "css-syntax-3" css parser.
	*/
	export interface CSSSyntaxModule extends Object {

		/** 
		*   Transforms a CSS String into a raw token list.
		*   
		*   @param cssValue The CSS String to tokenize.
		*/
		tokenize(cssValue: string): TokenList
		
		/**
		*   Transforms a CSS String into a parsed Stylesheet.
		*
		*   @param cssValue The CSS String to parse.
		*/
		parse(cssValue: string): StyleSheet

		/**
		*   Transforms a CSS String into a parsed declaration value.
		*
		*   @param cssValue The CSS String to parse.
		*/
		parseCSSValue(cssValue: string): TokenList

		TokenList: Constructor<TokenList>
		
		CSSParserToken: Constructor<CSSParserToken>
		BadStringToken: Constructor<BadStringToken>
		BadURLToken: Constructor<BadURLToken>
		WhitespaceToken: Constructor<WhitespaceToken>
		CDOToken: Constructor<CDOToken>
		CDCToken: Constructor<CDCToken>
		ColonToken: Constructor<ColonToken>
		SemicolonToken: Constructor<SemicolonToken>
		OpenCurlyToken: Constructor<OpenCurlyToken>
		CloseCurlyToken: Constructor<CloseCurlyToken>
		OpenSquareToken: Constructor<OpenSquareToken>
		CloseSquareToken: Constructor<CloseSquareToken>
		OpenParenToken: Constructor<OpenParenToken>
		CloseParenToken: Constructor<CloseParenToken>
		EOFToken: Constructor<EOFToken>
		DelimToken: Constructor<DelimToken>
		IdentifierToken: Constructor<IdentifierToken>
		FunctionToken: Constructor<FunctionToken>
		AtKeywordToken: Constructor<AtKeywordToken>
		HashToken: Constructor<HashToken>
		StringToken: Constructor<StringToken>
		NumberToken: Constructor<NumberToken>
		PercentageToken: Constructor<PercentageToken>
		DimensionToken: Constructor<DimensionToken>
		UnicodeRangeToken: Constructor<UnicodeRangeToken>

		CSSParserRule: Constructor<CSSParserRule>
		AtRule      : Constructor<AtRule<CSSParserToken>>
		StyleRule   : Constructor<StyleRule>
		Declaration : Constructor<Declaration>
		SimpleBlock : Constructor<SimpleBlock>
		Func        : Constructor<Func>
		FuncArg: Constructor<FuncArg>

	}



	/*=========================================================*/ /**
	Stores a list of css tokens */
	export interface SpecializedTokenList< T > extends Array<T> {

		/*=========================================================*/ /**
		Returns the original css string that generated this token list. */
		toString(): string

	}

	/*=========================================================*/ /**
	Stores a list of css tokens */
	export interface TokenList extends SpecializedTokenList<CSSParserToken> {

		/*=========================================================*/ /**
		Returns the original css string that generated this token list. */
		toString(): string

	}




	/*=========================================================*/ /**
	Represents a single css token */
	export interface CSSParserToken extends Object {

		/*=========================================================*/ /**
		Returns the type of this css token. */
		tokenType: string

		/*=========================================================*/ /**
		Returns the original css string that generated this token. */
		toString(): string

		/*=========================================================*/ /**
		Returns a CSS representation of the object, as a string. */
		toCSSString(): string

	}

	export interface BadStringToken extends CSSParserToken { }
	export interface BadURLToken extends CSSParserToken { }
	export interface WhitespaceToken extends CSSParserToken { }
	export interface CDOToken extends CSSParserToken { }
	export interface CDCToken extends CSSParserToken { }
	export interface ColonToken extends CSSParserToken { }
	export interface SemicolonToken extends CSSParserToken { }
	export interface OpenCurlyToken extends CSSParserToken { }
	export interface CloseCurlyToken extends CSSParserToken { }
	export interface OpenSquareToken extends CSSParserToken { }
	export interface CloseSquareToken extends CSSParserToken { }
	export interface OpenParenToken extends CSSParserToken { }
	export interface CloseParenToken extends CSSParserToken { }
	export interface EOFToken extends CSSParserToken { }
	export interface DelimToken extends CSSParserToken { /** The char value */ value: string }
	export interface IdentifierToken extends CSSParserToken { /** The identifier name */ value: string }
	export interface FunctionToken extends CSSParserToken { /** The function name */ value: string }
	export interface AtKeywordToken extends CSSParserToken { /** The @token name */ value: string }
	export interface HashToken extends CSSParserToken { /** The #token name */ value: string }
	export interface StringToken extends CSSParserToken { /** The string value */ value: string }
	export interface NumberToken extends CSSParserToken { /** The number value */ value: number; /** The number, as a string */ repr: string; /** Either integer or number */ type: string }
	export interface PercentageToken extends CSSParserToken { /** The number value */ value: number; /** The number, as a string */ repr: string; }
	export interface DimensionToken extends CSSParserToken { /** The number value */ num: number; /** The full dimension, as a string */ repr: string; /** The unit, as a string */ unit: string }
	export interface UnicodeRangeToken extends CSSParserToken { start: number; end: number; }

	/*=========================================================*/ /**
	Represents a single css rule */
	export interface CSSParserRule extends CSSParserToken {

		/*=========================================================*/ /**
		Returns the type of the elements found in this rule. */
		fillType: string

		/*=========================================================*/ /**
		Returns a JSON representation of the object, as a string. */
		toString(): string

		/*=========================================================*/ /**
		Returns a CSS representation of the object, as a string. */
		toCSSString(): string

	}

	/*=========================================================*/ /**
	Represents a single css rule */
	export interface AtRule< T extends CSSParserToken > extends CSSParserRule {

		/*=========================================================*/ /**
		Returns the @name of the rule. */
		name: string

		/*=========================================================*/ /**
		Returns a list of tokens following. */
		prelude: DOMTokenList

		/*=========================================================*/ /**
		Returns the tokens or declarations found in this rule. */
		value: Array<T>

	}

	/*=========================================================*/ /**
	Represents a single css rule */
	export interface StyleRule extends CSSParserRule {

		/*=========================================================*/ /**
		Returns the @name of the rule.                                 */
		name: string

		/*=========================================================*/ /**
		Returns the declarations found in this rule.                   */
		value: SpecializedTokenList<Declaration>

	}

	/*=========================================================*/ /**
	Represents a single css declaration.                            */
	export interface Declaration extends CSSParserRule {

		/*=========================================================*/ /**
		Returns the name of the property being declared.               */
		name: string
		
		/*=========================================================*/ /**
		Returns the tokens found in the value part of this declaration. */
		value: TokenList

	}

	/*=========================================================*/ /**
	Represents a single css block.                                  */
	export interface SimpleBlock extends CSSParserRule {

		/*=========================================================*/ /**
		Returns the opening char; one of '(', '{' or '['.              */
		name: string
		
		/*=========================================================*/ /**
		Returns the tokens found in the value part of this declaration. */
		value: TokenList

	}

	/*=========================================================*/ /**
	Represents a single css function-call.                          */
	export interface Func extends CSSParserRule {

		/*=========================================================*/ /**
		Returns the opening char; one of '(', '{' or '['.              */
		name: string
		
		/*=========================================================*/ /**
		Returns the arguments of this function call. */
		value: SpecializedTokenList<FuncArg>

	}

	/*=========================================================*/ /**
	Represents a single css function-call.                          */
	export interface FuncArg extends CSSParserRule {
		
		/*=========================================================*/ /**
		Returns the arguments of this function call. */
		value: TokenList

	}

}


/////////////////////////////////////////////////////////////////////////
//// EXAMPLES ///////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////



/** How do you transform a css text into tokens? */
function tokenize_some_css() {
	
	var cssSyntax = require('core:css-syntax');
	return cssSyntax.tokenize("* { color: red; }");

}



/** How do you parse a css stylesheet?? */
function parse_some_css() {
	
	var cssSyntax = require('core:css-syntax');
	return cssSyntax.parse("* { color: red; }");

}



/** How do you transform a css text into tokens? */
function parse_some_css_vaue() {
	
	var cssSyntax = require('core:css-syntax');
	return cssSyntax.parseCSSValue("url('bg.png')");

}