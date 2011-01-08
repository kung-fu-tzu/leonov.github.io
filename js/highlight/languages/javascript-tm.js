/*
Language: Javascript (mimics TextMate)
*/
;(function(){

var KEYWORD = {'in': 1, 'if': 1, 'for': 1, 'while': 1, 'finally': 1, 'new': 1, 'do': 1, 'return': 1, 'else': 1, 'break': 1, 'catch': 1, 'instanceof': 1, 'with': 1, 'throw': 1, 'case': 1, 'default': 1, 'try': 1, 'this': 1, 'switch': 1, 'continue': 1, 'typeof': 1, 'delete': 1, 'arguments': 1, 'delete': 1, 'with': 1},
  CONSTANT = {'true': 1, 'false': 1, 'null': 1, 'undefined': 1},
  STORAGE = {'function': 1, 'void': 1, 'var': 1, 'eval': 1},
  SUPPORT = {Boolean: 1, Number: 1, String: 1, Date: 1, Array: 1, Object: 1, Function: 1, RegExp: 1, Math: 1, document: 1, window: 1, event: 1, screen: 1, navigator: 1, Image: 1, History: 1},
  SUPPORT_FUNCTION = {keyword: KEYWORD, constant: CONSTANT, storage: STORAGE, support: SUPPORT, support_function:{sort: 1, exec: 1, replace: 1, split: 1, join: 1, test: 1, apply: 1, call: 1, reverse: 1, slice: 1, splice: 1, pop: 1, shift: 1, push: 1, unshift: 1, indexOf: 1, appendChild: 1, removeChild: 1, createElement: 1,createTextNode: 1, getElementsByTagName: 1, setInterval: 1, clearInterval: 1, setTimeout: 1, clearTimeout: 1, warn: 1, info: 1, log: 1, error: 1, time: 1, timeEnd: 1, assert: 1}},
  SUPPORT_CONSTANT = {keyword: KEYWORD, constant: CONSTANT, storage: STORAGE, support: SUPPORT, support_constant:{disabled: 1, link: 1, title: 1, className: 1, callee: 1, src: 1, type: 1, parentNode: 1, nodeValue: 1, nodeName: 1, nodeType: 1, parent: 1, childNodes: 1, firstChild: 1, documentElement: 1, href: 1, next: 1, prototype: 1}},
  // OPERATOR_RE = '[+\\-&<>=%/*^|!]+'
  OPERATOR_RE = '(===|==|=|\\+=|\\+\\+|\\+|-=|--|-|\\*=|\\*|/=|/|&=|&&|&|%=|%|\\|=|\\||!=|!|<<=|<<|<=|<|>>=|>>|>=|>|\\^=|\\^)'
  PUNCTUATION_RE = '[:\\[,\\{?\\(;]',
  IDENT_RE = '[a-zA-Z_$][a-zA-Z0-9_$]*'

hljs.LANGUAGES.javascript = {
  defaultMode: {
    contains: ['string', 'comment', 'number', 'regexp_container', 'operator', 'function', 'method', 'property', 'entity'],
  },
  modes: [
    hljs.C_LINE_COMMENT_MODE,
    hljs.C_BLOCK_COMMENT_MODE,
    {
      className: 'number',
      begin: '\\d+(\\.\\d+)?[eE][+\\-]?\\d+', end: '^',
      relevance: 0
    },
    hljs.C_NUMBER_MODE,
    hljs.APOS_STRING_MODE,
    hljs.QUOTE_STRING_MODE,
    {
      className: 'escape',
      begin: '\\\\.', end: '^',
      relevance: 0
    },
    // +/rex/, - /rex/
    {
      className: 'regexp_container',
      begin: OPERATOR_RE + '\\s*/[^/]', end: '^', returnBegin: true, noMarkup: true,
      contains: ['regexp', 'operator'],
      relevance: 0
    },
    // /rex/
    {
      className: 'regexp_container',
      begin: '\\n\\s*/[^/]', end: '^', returnBegin: true, noMarkup: true,
      contains: ['regexp'],
      relevance: 0
    },
    // return /rex/
    {
      className: 'regexp_container',
      begin: '\\b(?:in|return|case|break|typeof|instanceof|with|delete)\\s*/[^/]', end: '^', returnBegin: true, noMarkup: true,
      contains: ['regexp', 'entity'],
      relevance: 0
    },
    // (/rex/), prop: /rex/, ;/rex/
    {
      className: 'regexp_container',
      begin: PUNCTUATION_RE + '\\s*/[^/]', end: '^', returnBegin: true, noMarkup: true,
      contains: ['regexp', 'punctuation'],
      relevance: 0
    },
    {
      className: 'regexp',
      // begin: '/.*?[^\\\\/]/[gim]*', end: '^',
      begin: '\\s*/', end: '/[gim]*', endsParent: true,
      contains: ['escape']
    },
    {
      className: 'punctuation', noMarkup: true,
      begin: PUNCTUATION_RE, end: '^',
      relevance: 0
    },
    {
      className: 'operator',
      begin: OPERATOR_RE, end: '^',
      relevance: 0
    },
    {
      className: 'function',
      begin: '\\bfunction(\\s+' + IDENT_RE + ')?\\s*\\([^)]*\\)\\s*{', end: '^', returnBegin: true,
      contains: ['entity', 'title', 'params']
    },
    {
      className: 'title',
      begin: '\\s+' + IDENT_RE, end: '^',
      relevance: 0
    },
    {
      className: 'params',
      begin: '\\s*\\(', end: '\\)', excludeBegin: true, excludeEnd: true,
      contains: ['comment'],
      relevance: 0
    },
    {
      className: 'method',
      begin: '\\.?\\b' + IDENT_RE + '\\s*\\(', end: '^', returnBegin: true, noMarkup: true,
      contains: ['dot', 'method-entity'],
      relevance: 0
    },
    {
      className: 'method-entity',
      begin: '\\b' + IDENT_RE + '\\b', end: '^', endsParent: true,
      lexems: [IDENT_RE],
      keywords: SUPPORT_FUNCTION,
      relevance: 0 // all in keywords
    },
    {
      className: 'property',
      begin: '\\.' + IDENT_RE + '\\b', end: '^', returnBegin: true, noMarkup: true,
      contains: ['dot', 'property-entity'],
      relevance: 0
    },
    {
      className: 'property-entity',
      begin: '\\b' + IDENT_RE + '\\b', end: '^', endsParent: true,
      lexems: [IDENT_RE],
      keywords: SUPPORT_CONSTANT,
      relevance: 0 // all in keywords
    },
    {
      className: 'dot',
      begin: '\\.', end: '^', noMarkup: true,
      relevance: 0
    },
    {
      className: 'entity',
      begin: IDENT_RE, end: '^',
      lexems: [IDENT_RE],
      keywords: {keyword: KEYWORD, constant: CONSTANT, storage: STORAGE, support: SUPPORT},
      relevance: 0
    }
  ]
};

})();