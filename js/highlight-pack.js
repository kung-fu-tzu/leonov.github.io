/*
Syntax highlighting with language autodetection.
http://softwaremaniacs.org/soft/highlight/
*/

var hljs = new function() {
  var LANGUAGES = {}
  var selected_languages = {};

  function escape(value) {
    return value.replace(/&/gm, '&amp;').replace(/</gm, '&lt;').replace(/>/gm, '&gt;');
  }

  function contains(array, item) {
    if (!array)
      return false;
    for (var i = 0; i < array.length; i++)
      if (array[i] == item)
        return true;
    return false;
  }

  function highlight(language_name, value) {
    function compileSubModes(mode, language) {
      mode.sub_modes = [];
      for (var i = 0; i < mode.contains.length; i++) {
        for (var j = 0; j < language.modes.length; j++) {
          if (language.modes[j].className == mode.contains[i]) {
            mode.sub_modes[mode.sub_modes.length] = language.modes[j];
          }
        }
      }
    }

    function subMode(lexem, mode) {
      if (!mode.contains) {
        return null;
      }
      if (!mode.sub_modes) {
        compileSubModes(mode, language);
      }
      for (var i = 0; i < mode.sub_modes.length; i++) {
        if (mode.sub_modes[i].beginRe.test(lexem)) {
          return mode.sub_modes[i];
        }
      }
      return null;
    }

    function endOfMode(mode_index, lexem) {
      if (modes[mode_index].end && modes[mode_index].endRe.test(lexem))
        return modes[mode_index].endsParent ? 2 : 1;
      if (modes[mode_index].endsWithParent) {
        var level = endOfMode(mode_index - 1, lexem);
        return level ? level + 1 : 0;
      }
      return 0;
    }

    function isIllegal(lexem, mode) {
      return mode.illegalRe && mode.illegalRe.test(lexem);
    }

    function compileTerminators(mode, language) {
      var terminators = [];

      function addTerminator(re) {
        if (!contains(terminators, re)) {
          terminators[terminators.length] = re;
        }
      }

      if (mode.contains)
        for (var i = 0; i < language.modes.length; i++) {
          if (contains(mode.contains, language.modes[i].className)) {
            addTerminator(language.modes[i].begin);
          }
        }

      var index = modes.length - 1;
      do {
        if (modes[index].end) {
          addTerminator(modes[index].end);
        }
        index--;
      } while (modes[index + 1].endsWithParent);

      if (mode.illegal) {
        addTerminator(mode.illegal);
      }

      var terminator_re = '(' + terminators[0];
      for (var i = 0; i < terminators.length; i++)
        terminator_re += '|' + terminators[i];
      terminator_re += ')';
      return langRe(language, terminator_re);
    }

    function eatModeChunk(value, index) {
      var mode = modes[modes.length - 1];
      if (!mode.terminators) {
        mode.terminators = compileTerminators(mode, language);
      }
      value = value.substr(index);
      var match = mode.terminators.exec(value);
      if (!match)
        return [value, '', true];
      if (match.index == 0)
        return ['', match[0], false];
      else
        return [value.substr(0, match.index), match[0], false];
    }

    function keywordMatch(mode, match) {
      var match_str = language.case_insensitive ? match[0].toLowerCase() : match[0]
      for (var className in mode.keywordGroups) {
        if (!mode.keywordGroups.hasOwnProperty(className))
          continue;
        var value = mode.keywordGroups[className].hasOwnProperty(match_str);
        if (value)
          return [className, value];
      }
      return false;
    }

    function processKeywords(buffer, mode) {
      if (!mode.keywords || !mode.lexems)
        return escape(buffer);
      if (!mode.lexemsRe) {
        var lexems_re = '(' + mode.lexems[0];
        for (var i = 1; i < mode.lexems.length; i++)
          lexems_re += '|' + mode.lexems[i];
        lexems_re += ')';
        mode.lexemsRe = langRe(language, lexems_re, true);
      }
      var result = '';
      var last_index = 0;
      mode.lexemsRe.lastIndex = 0;
      var match = mode.lexemsRe.exec(buffer);
      while (match) {
        result += escape(buffer.substr(last_index, match.index - last_index));
        var keyword_match = keywordMatch(mode, match);
        if (keyword_match) {
          keyword_count += keyword_match[1];
          result += '<span class="'+ keyword_match[0] +'">' + escape(match[0]) + '</span>';
        } else {
          result += escape(match[0]);
        }
        last_index = mode.lexemsRe.lastIndex;
        match = mode.lexemsRe.exec(buffer);
      }
      result += escape(buffer.substr(last_index, buffer.length - last_index));
      return result;
    }

    function processBuffer(buffer, mode) {
      if (mode.subLanguage && selected_languages[mode.subLanguage]) {
        var result = highlight(mode.subLanguage, buffer);
        keyword_count += result.keyword_count;
        relevance += result.relevance;
        return result.value;
      } else {
        return processKeywords(buffer, mode);
      }
    }

    function startNewMode(mode, lexem) {
      var markup = mode.noMarkup?'':'<span class="' + mode.className + '">';
      if (mode.returnBegin) {
        result += markup;
        mode.buffer = '';
      } else if (mode.excludeBegin) {
        result += escape(lexem) + markup;
        mode.buffer = '';
      } else {
        result += markup;
        mode.buffer = lexem;
      }
      modes[modes.length] = mode;
    }

    function processModeInfo(buffer, lexem, end) {
      var current_mode = modes[modes.length - 1];
      if (end) {
        result += processBuffer(current_mode.buffer + buffer, current_mode);
        return false;
      }

      var new_mode = subMode(lexem, current_mode);
      if (new_mode) {
        result += processBuffer(current_mode.buffer + buffer, current_mode);
        startNewMode(new_mode, lexem);
        relevance += new_mode.relevance;
        return new_mode.returnBegin;
      }

      var end_level = endOfMode(modes.length - 1, lexem);
      if (end_level) {
        var markup = current_mode.noMarkup?'':'</span>';
        if (current_mode.returnEnd) {
          result += processBuffer(current_mode.buffer + buffer, current_mode) + markup;
        } else if (current_mode.excludeEnd) {
          result += processBuffer(current_mode.buffer + buffer, current_mode) + markup + escape(lexem);
        } else {
          result += processBuffer(current_mode.buffer + buffer + lexem, current_mode) + markup;
        }
        while (end_level > 1) {
          markup = modes[modes.length - 2].noMarkup?'':'</span>';
          result += markup;
          end_level--;
          modes.length--;
        }
        modes.length--;
        modes[modes.length - 1].buffer = '';
        if (current_mode.starts) {
          for (var i = 0; i < language.modes.length; i++) {
            if (language.modes[i].className == current_mode.starts) {
              startNewMode(language.modes[i], '');
              break;
            }
          }
        }
        return current_mode.returnEnd;
      }

      if (isIllegal(lexem, current_mode))
        throw 'Illegal';
    }

    var language = LANGUAGES[language_name];
    var modes = [language.defaultMode];
    var relevance = 0;
    var keyword_count = 0;
    var result = '';
    try {
      var index = 0;
      language.defaultMode.buffer = '';
      do {
        var mode_info = eatModeChunk(value, index);
        var return_lexem = processModeInfo(mode_info[0], mode_info[1], mode_info[2]);
        index += mode_info[0].length;
        if (!return_lexem) {
          index += mode_info[1].length;
        }
      } while (!mode_info[2]);
      if(modes.length > 1)
        throw 'Illegal';
      return {
        relevance: relevance,
        keyword_count: keyword_count,
        value: result
      }
    } catch (e) {
      if (e == 'Illegal') {
        return {
          relevance: 0,
          keyword_count: 0,
          value: escape(value)
        }
      } else {
        throw e;
      }
    }
  }

  function blockText(block) {
    var result = '';
    for (var i = 0; i < block.childNodes.length; i++)
      if (block.childNodes[i].nodeType == 3)
        result += block.childNodes[i].nodeValue;
      else if (block.childNodes[i].nodeName == 'BR')
        result += '\n';
      else
        result += blockText(block.childNodes[i]);
    return result;
  }

  function blockLanguage(block) {
    var classes = block.className.split(/\s+/)
    classes = classes.concat(block.parentNode.className.split(/\s+/));
    for (var i = 0; i < classes.length; i++) {
      var class_ = classes[i].replace(/^language-/, '');
      if (class_ == 'no-highlight') {
        throw 'No highlight'
      }
      if (LANGUAGES[class_]) {
        return class_;
      }
    }
  }

  function nodeStream(node) {
    var result = [];
    (function (node, offset) {
      for (var i = 0; i < node.childNodes.length; i++) {
        if (node.childNodes[i].nodeType == 3)
          offset += node.childNodes[i].nodeValue.length;
        else if (node.childNodes[i].nodeName == 'BR')
          offset += 1
        else {
          result.push({
            event: 'start',
            offset: offset,
            node: node.childNodes[i]
          });
          offset = arguments.callee(node.childNodes[i], offset)
          result.push({
            event: 'stop',
            offset: offset,
            node: node.childNodes[i]
          });
        }
      }
      return offset;
    })(node, 0);
    return result;
  }

  function mergeStreams(stream1, stream2, value) {
    var processed = 0;
    var result = '';
    var nodeStack = [];

    function selectStream() {
      if (stream1.length && stream2.length) {
        if (stream1[0].offset != stream2[0].offset)
          return (stream1[0].offset < stream2[0].offset) ? stream1 : stream2;
        else
          return (stream1[0].event == 'start' && stream2[0].event == 'stop') ? stream2 : stream1;
      } else {
        return stream1.length ? stream1 : stream2;
      }
    }

    function open(node) {
      var result = '<' + node.nodeName.toLowerCase();
      for (var i = 0; i < node.attributes.length; i++) {
        result += ' ' + node.attributes[i].nodeName.toLowerCase()  + '="' + escape(node.attributes[i].nodeValue) + '"';
      }
      return result + '>';
    }

    function close(node) {
      return '</' + node.nodeName.toLowerCase() + '>';
    }

    while (stream1.length || stream2.length) {
      var current = selectStream().splice(0, 1)[0];
      result += escape(value.substr(processed, current.offset - processed));
      processed = current.offset;
      if ( current.event == 'start') {
        result += open(current.node);
        nodeStack.push(current.node);
      } else if (current.event == 'stop') {
        var i = nodeStack.length;
        do {
          i--;
          var node = nodeStack[i];
          result += close(node);
        } while (node != current.node);
        nodeStack.splice(i, 1);
        while (i < nodeStack.length) {
          result += open(nodeStack[i]);
          i++;
        }
      }
    }
    result += value.substr(processed);
    return result;
  }

  function highlightBlock(block, tabReplace) {
    try {
      var text = blockText(block);
      var language = blockLanguage(block);
    } catch (e) {
      if (e == 'No highlight')
        return;
    }

    if (language) {
      var result = highlight(language, text).value;
    } else {
      var max_relevance = 0;
      for (var key in selected_languages) {
        if (!selected_languages.hasOwnProperty(key))
          continue;
        var lang_result = highlight(key, text);
        var relevance = lang_result.keyword_count + lang_result.relevance;
        if (relevance > max_relevance) {
          max_relevance = relevance;
          var result = lang_result.value;
          language = key;
        }
      }
    }

    if (result) {
      if (tabReplace) {
        result = result.replace(/^(\t+)/gm, function(match, p1, offset, s) {
          return p1.replace(/\t/g, tabReplace);
        })
      }
      var class_name = block.className;
      if (!class_name.match(language)) {
        class_name += ' ' + language;
      }
      var original = nodeStream(block);
      if (original.length) {
        var pre = document.createElement('pre');
        pre.innerHTML = result;
        result = mergeStreams(original, nodeStream(pre), text);
      }
      // See these 4 lines? This is IE's notion of "block.innerHTML = result". Love this browser :-/
      var container = document.createElement('div');
      container.innerHTML = '<pre><code class="' + class_name + '">' + result + '</code></pre>';
      var environment = block.parentNode.parentNode;
      environment.replaceChild(container.firstChild, block.parentNode);
    }
  }

  function langRe(language, value, global) {
    var mode =  'm' + (language.case_insensitive ? 'i' : '') + (global ? 'g' : '');
    return new RegExp(value, mode);
  }

  function compileModes() {
    for (var i in LANGUAGES) {
      if (!LANGUAGES.hasOwnProperty(i))
        continue;
      var language = LANGUAGES[i];
      for (var j = 0; j < language.modes.length; j++) {
        if (language.modes[j].begin)
          language.modes[j].beginRe = langRe(language, '^' + language.modes[j].begin);
        if (language.modes[j].end)
          language.modes[j].endRe = langRe(language, '^' + language.modes[j].end);
        if (language.modes[j].illegal)
          language.modes[j].illegalRe = langRe(language, '^(?:' + language.modes[j].illegal + ')');
        language.defaultMode.illegalRe = langRe(language, '^(?:' + language.defaultMode.illegal + ')');
        if (language.modes[j].relevance == undefined) {
          language.modes[j].relevance = 1;
        }
      }
    }
  }

  function compileKeywords() {

    function compileModeKeywords(mode) {
      if (!mode.keywordGroups) {
        for (var key in mode.keywords) {
          if (!mode.keywords.hasOwnProperty(key))
            continue;
          if (mode.keywords[key] instanceof Object)
            mode.keywordGroups = mode.keywords;
          else
            mode.keywordGroups = {'keyword': mode.keywords};
          break;
        }
      }
    }

    for (var i in LANGUAGES) {
      if (!LANGUAGES.hasOwnProperty(i))
        continue;
      var language = LANGUAGES[i];
      compileModeKeywords(language.defaultMode);
      for (var j = 0; j < language.modes.length; j++) {
        compileModeKeywords(language.modes[j]);
      }
    }
  }

  function findCode(pre) {
    for (var i = 0; i < pre.childNodes.length; i++) {
      node = pre.childNodes[i];
      if (node.nodeName == 'CODE')
        return node;
      if (!(node.nodeType == 3 && node.nodeValue.match(/\s+/)))
        return null;
    }
  }

  function initHighlighting() {
    if (initHighlighting.called)
      return;
    initHighlighting.called = true;
    compileModes();
    compileKeywords();
    if (arguments.length) {
      for (var i = 0; i < arguments.length; i++) {
        if (LANGUAGES[arguments[i]]) {
          selected_languages[arguments[i]] = LANGUAGES[arguments[i]];
        }
      }
    } else
      selected_languages = LANGUAGES;
    var pres = document.getElementsByTagName('pre');
    for (var i = 0; i < pres.length; i++) {
      var code = findCode(pres[i]);
      if (code)
        highlightBlock(code, hljs.tabReplace);
    }
  }

  function initHighlightingOnLoad() {
    var original_arguments = arguments;
    var handler = function(){initHighlighting.apply(null, original_arguments)};
    if (window.addEventListener) {
      window.addEventListener('DOMContentLoaded', handler, false);
      window.addEventListener('load', handler, false);
    } else if (window.attachEvent)
      window.attachEvent('onload', handler);
    else
      window.onload = handler;
  }

  this.LANGUAGES = LANGUAGES;
  this.initHighlightingOnLoad = initHighlightingOnLoad;
  this.highlightBlock = highlightBlock;
  this.initHighlighting = initHighlighting;

  // Common regexps
  this.IDENT_RE = '[a-zA-Z][a-zA-Z0-9_]*';
  this.UNDERSCORE_IDENT_RE = '[a-zA-Z_][a-zA-Z0-9_]*';
  this.NUMBER_RE = '\\b\\d+(\\.\\d+)?';
  this.C_NUMBER_RE = '\\b(0x[A-Za-z0-9]+|\\d+(\\.\\d+)?)';
  this.RE_STARTERS_RE = '!|!=|!==|%|%=|&|&&|&=|\\*|\\*=|\\+|\\+=|,|\\.|-|-=|/|/=|:|;|<|<<|<<=|<=|=|==|===|>|>=|>>|>>=|>>>|>>>=|\\?|\\[|\\{|\\(|\\^|\\^=|\\||\\|=|\\|\\||~';

  // Common modes
  this.APOS_STRING_MODE = {
    className: 'string',
    begin: '\'', end: '\'',
    illegal: '\\n',
    contains: ['escape'],
    relevance: 0
  };
  this.QUOTE_STRING_MODE = {
    className: 'string',
    begin: '"', end: '"',
    illegal: '\\n',
    contains: ['escape'],
    relevance: 0
  };
  this.BACKSLASH_ESCAPE = {
    className: 'escape',
    begin: '\\\\.', end: '^', noMarkup: true,
    relevance: 0
  };
  this.C_LINE_COMMENT_MODE = {
    className: 'comment',
    begin: '//', end: '$',
    relevance: 0
  };
  this.C_BLOCK_COMMENT_MODE = {
    className: 'comment',
    begin: '/\\*', end: '\\*/'
  };
  this.HASH_COMMENT_MODE = {
    className: 'comment',
    begin: '#', end: '$'
  };
  this.C_NUMBER_MODE = {
    className: 'number',
    begin: this.C_NUMBER_RE, end: '^',
    relevance: 0
  };
}();

var initHighlightingOnLoad = hljs.initHighlightingOnLoad;


/*
Language: Bash
Author: vah <vahtenberg@gmail.com>
*/

hljs.LANGUAGES.bash = function(){
  var BASH_LITERAL = {'true' : 1, 'false' : 1}
  return {
    defaultMode: {
      lexems: [hljs.IDENT_RE],
      contains: ['string', 'shebang', 'comment', 'number', 'test_condition', 'string', 'variable'],
      keywords: {
        'keyword': {'if' : 1, 'then' : 1, 'else' : 1, 'fi' : 1, 'for' : 1, 'break' : 1, 'continue' : 1, 'while' : 1, 'in' : 1, 'do' : 1, 'done' : 1, 'echo' : 1, 'exit' : 1, 'return' : 1, 'set' : 1, 'declare' : 1},
        'literal': BASH_LITERAL
      }
    },
    case_insensitive: false,
    modes: [
      {
        className: 'shebang',
        begin: '(#!\\/bin\\/bash)|(#!\\/bin\\/sh)',
        end: '^',
        relevance: 10
      },
      hljs.HASH_COMMENT_MODE,
      {
        className: 'test_condition',
        begin: '\\[ ',
        end: ' \\]',
        contains: ['string', 'variable', 'number'],
        lexems: [hljs.IDENT_RE],
        keywords: {
          'literal': BASH_LITERAL
        },
        relevance: 0
      },
      {
        className: 'test_condition',
        begin: '\\[\\[ ',
        end: ' \\]\\]',
        contains: ['string', 'variable', 'number'],
        lexems: [hljs.IDENT_RE],
        keywords: {
          'literal': BASH_LITERAL
        }
      },
      {
        className: 'variable',
        begin: '\\$([a-zA-Z0-9_]+)\\b',
        end: '^'
      },
      {
        className: 'variable',
        begin: '\\$\\{(([^}])|(\\\\}))+\\}',
        end: '^',
        contains: ['number']
      },
      {
        className: 'string',
        begin: '"', end: '"',
        illegal: '\\n',
        contains: ['escape', 'variable'],
        relevance: 0
      },
      {
        className: 'string',
        begin: '"', end: '"',
        illegal: '\\n',
        contains: ['escape', 'variable'],
        relevance: 0
      },
      hljs.BACKSLASH_ESCAPE,
      hljs.C_NUMBER_MODE,
      {
        className: 'comment',
        begin: '\\/\\/', end: '$',
        illegal: '.'
      }
    ]
  };
}();


/*
Language: C++
*/

hljs.LANGUAGES.cpp = function(){
  var CPP_KEYWORDS = {
    'keyword': {'false': 1, 'int': 1, 'float': 1, 'while': 1, 'private': 1, 'char': 1, 'catch': 1, 'export': 1, 'virtual': 1, 'operator': 2, 'sizeof': 2, 'dynamic_cast': 2, 'typedef': 2, 'const_cast': 2, 'const': 1, 'struct': 1, 'for': 1, 'static_cast': 2, 'union': 1, 'namespace': 1, 'unsigned': 1, 'long': 1, 'throw': 1, 'volatile': 2, 'static': 1, 'protected': 1, 'bool': 1, 'template': 1, 'mutable': 1, 'if': 1, 'public': 1, 'friend': 2, 'do': 1, 'return': 1, 'goto': 1, 'auto': 1, 'void': 2, 'enum': 1, 'else': 1, 'break': 1, 'new': 1, 'extern': 1, 'using': 1, 'true': 1, 'class': 1, 'asm': 1, 'case': 1, 'typeid': 1, 'short': 1, 'reinterpret_cast': 2, 'default': 1, 'double': 1, 'register': 1, 'explicit': 1, 'signed': 1, 'typename': 1, 'try': 1, 'this': 1, 'switch': 1, 'continue': 1, 'wchar_t': 1, 'inline': 1, 'delete': 1},
    'built_in': {'std': 1, 'string': 1, 'cin': 1, 'cout': 1, 'cerr': 1, 'clog': 1, 'stringstream': 1, 'istringstream': 1, 'ostringstream': 1, 'auto_ptr': 1, 'deque': 1, 'list': 1, 'queue': 1, 'stack': 1, 'vector': 1, 'map': 1, 'set': 1, 'bitset': 1, 'multiset': 1, 'multimap': 1}
  };
  return {
    defaultMode: {
      lexems: [hljs.UNDERSCORE_IDENT_RE],
      illegal: '</',
      contains: ['comment', 'string', 'number', 'preprocessor', 'stl_container'],
      keywords: CPP_KEYWORDS
    },
    modes: [
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.C_NUMBER_MODE,
      hljs.QUOTE_STRING_MODE,
      hljs.BACKSLASH_ESCAPE,
      {
        className: 'string',
        begin: '\'', end: '[^\\\\]\'',
        illegal: '[^\\\\][^\']'
      },
      {
        className: 'preprocessor',
        begin: '#', end: '$'
      },
      {
        className: 'stl_container',
        begin: '\\b(deque|list|queue|stack|vector|map|set|bitset|multiset|multimap)\\s*<', end: '>',
        contains: ['stl_container'],
        lexems: [hljs.UNDERSCORE_IDENT_RE],
        keywords: CPP_KEYWORDS,
        relevance: 10
      }
    ]
  };
}();


/*
Language: CSS
Requires:  html-xml.js
*/

hljs.LANGUAGES.css = {
  defaultMode: {
    contains: ['at_rule', 'id', 'class', 'attr_selector', 'pseudo', 'rules', 'comment'],
    keywords: hljs.HTML_TAGS,
    lexems: [hljs.IDENT_RE],
    illegal: '='
  },
  case_insensitive: true,
  modes: [
    {
      className: 'at_rule',
      begin: '@', end: '[{;]',
      excludeEnd: true,
      lexems: [hljs.IDENT_RE],
      keywords: {'import': 1, 'page': 1, 'media': 1, 'charset': 1, 'font-face': 1},
      contains: ['function', 'string', 'number', 'pseudo']
    },
    {
      className: 'id',
      begin: '\\#[A-Za-z0-9_-]+', end: '^'
    },
    {
      className: 'class',
      begin: '\\.[A-Za-z0-9_-]+', end: '^',
      relevance: 0
    },
    {
      className: 'attr_selector',
      begin: '\\[', end: '\\]',
      illegal: '$'
    },
    {
      className: 'pseudo',
      begin: ':(:)?[a-zA-Z0-9\\_\\-\\+\\(\\)\\"\\\']+', end: '^'
    },
    {
      className: 'rules',
      begin: '{', end: '}',
      contains: ['rule', 'comment'],
      illegal: '[^\\s]'
    },
    {
      className: 'rule',
      begin: '[A-Z\\_\\.\\-]+\\s*:', end: ';', endsWithParent: true,
      lexems: ['[A-Za-z-]+'],
      keywords: {'play-during': 1, 'counter-reset': 1, 'counter-increment': 1, 'min-height': 1, 'quotes': 1, 'border-top': 1, 'pitch': 1, 'font': 1, 'pause': 1, 'list-style-image': 1, 'border-width': 1, 'cue': 1, 'outline-width': 1, 'border-left': 1, 'elevation': 1, 'richness': 1, 'speech-rate': 1, 'border-bottom': 1, 'border-spacing': 1, 'background': 1, 'list-style-type': 1, 'text-align': 1, 'page-break-inside': 1, 'orphans': 1, 'page-break-before': 1, 'text-transform': 1, 'line-height': 1, 'padding-left': 1, 'font-size': 1, 'right': 1, 'word-spacing': 1, 'padding-top': 1, 'outline-style': 1, 'bottom': 1, 'content': 1, 'border-right-style': 1, 'padding-right': 1, 'border-left-style': 1, 'voice-family': 1, 'background-color': 1, 'border-bottom-color': 1, 'outline-color': 1, 'unicode-bidi': 1, 'max-width': 1, 'font-family': 1, 'caption-side': 1, 'border-right-width': 1, 'pause-before': 1, 'border-top-style': 1, 'color': 1, 'border-collapse': 1, 'border-bottom-width': 1, 'float': 1, 'height': 1, 'max-height': 1, 'margin-right': 1, 'border-top-width': 1, 'speak': 1, 'speak-header': 1, 'top': 1, 'cue-before': 1, 'min-width': 1, 'width': 1, 'font-variant': 1, 'border-top-color': 1, 'background-position': 1, 'empty-cells': 1, 'direction': 1, 'border-right': 1, 'visibility': 1, 'padding': 1, 'border-style': 1, 'background-attachment': 1, 'overflow': 1, 'border-bottom-style': 1, 'cursor': 1, 'margin': 1, 'display': 1, 'border-left-width': 1, 'letter-spacing': 1, 'vertical-align': 1, 'clip': 1, 'border-color': 1, 'list-style': 1, 'padding-bottom': 1, 'pause-after': 1, 'speak-numeral': 1, 'margin-left': 1, 'widows': 1, 'border': 1, 'font-style': 1, 'border-left-color': 1, 'pitch-range': 1, 'background-repeat': 1, 'table-layout': 1, 'margin-bottom': 1, 'speak-punctuation': 1, 'font-weight': 1, 'border-right-color': 1, 'page-break-after': 1, 'position': 1, 'white-space': 1, 'text-indent': 1, 'background-image': 1, 'volume': 1, 'stress': 1, 'outline': 1, 'clear': 1, 'z-index': 1, 'text-decoration': 1, 'margin-top': 1, 'azimuth': 1, 'cue-after': 1, 'left': 1, 'list-style-position': 1},
      contains: ['value']
    },
    hljs.C_BLOCK_COMMENT_MODE,
    {
      className: 'value',
      begin: '^', endsWithParent: true, excludeEnd: true,
      contains: ['function', 'number', 'hexcolor', 'string']
    },
    {
      className: 'number',
      begin: hljs.NUMBER_RE, end: '^'
    },
    {
      className: 'hexcolor',
      begin: '\\#[0-9A-F]+', end: '^'
    },
    {
      className: 'function',
      begin: hljs.IDENT_RE + '\\(', end: '\\)',
      contains: ['params']
    },
    {
      className: 'params',
      begin: '^', endsWithParent: true, excludeEnd: true,
      contains: ['number', 'string']
    },
    hljs.APOS_STRING_MODE,
    hljs.QUOTE_STRING_MODE
  ]
};


/*
Language: diff
Description: Unified and context diff
Author: Vasily Polovnyov <vast@whiteants.net>
*/

hljs.LANGUAGES.diff = {
  case_insensitive: true,
  defaultMode: {
    contains: ['chunk', 'header', 'addition', 'deletion', 'change']
  },
  modes: [
    {
      className: 'chunk',
      begin: '^\\@\\@ +\\-\\d+,\\d+ +\\+\\d+,\\d+ +\\@\\@$', end:'^',
      relevance: 10
    },
    {
      className: 'chunk',
      begin: '^\\*\\*\\* +\\d+,\\d+ +\\*\\*\\*\\*$', end: '^',
      relevance: 10
    },
    {
      className: 'chunk',
      begin: '^\\-\\-\\- +\\d+,\\d+ +\\-\\-\\-\\-$', end: '^',
      relevance: 10
    },
    {
      className: 'header',
      begin: 'Index: ', end: '$'
    },
    {
      className: 'header',
      begin: '=====', end: '=====$'
    },
    {
      className: 'header',
      begin: '^\\-\\-\\-', end: '$'
    },
    {
      className: 'header',
      begin: '^\\*{3} ', end: '$'
    },
    {
      className: 'header',
      begin: '^\\+\\+\\+', end: '$'
    },
    {
      className: 'header',
      begin: '\\*{5}', end: '\\*{5}$'
    },
    {
      className: 'addition',
      begin: '^\\+', end: '$'
    },
    {
      className: 'deletion',
      begin: '^\\-', end: '$'
    },
    {
      className: 'change',
      begin: '^\\!', end: '$'
    }
  ]
};


/*
Language: HTML, XML
*/

hljs.XML_COMMENT = {
  className: 'comment',
  begin: '<!--', end: '-->'
};
hljs.XML_ATTR = {
  className: 'attribute',
  begin: '\\s[a-zA-Z\\:_-]+=', end: '^',
  contains: ['value']
};
hljs.XML_VALUE_QUOT = {
  className: 'value',
  begin: '"', end: '"'
};
hljs.XML_VALUE_APOS = {
  className: 'value',
  begin: '\'', end: '\''
};


hljs.LANGUAGES.xml = {
  defaultMode: {
    contains: ['pi', 'comment', 'cdata', 'tag']
  },
  case_insensitive: true,
  modes: [
    {
      className: 'pi',
      begin: '<\\?', end: '\\?>',
      relevance: 10
    },
    hljs.XML_COMMENT,
    {
      className: 'cdata',
      begin: '<\\!\\[CDATA\\[', end: '\\]\\]>'
    },
    {
      className: 'tag',
      begin: '</?', end: '>',
      contains: ['title', 'tag_internal'],
      relevance: 1.5
    },
    {
      className: 'title',
      begin: '[A-Za-z:_][A-Za-z0-9\\._:-]+', end: '^',
      relevance: 0
    },
    {
      className: 'tag_internal',
      begin: '^', endsWithParent: true, noMarkup: true,
      contains: ['attribute'],
      relevance: 0,
      illegal: '[\\+\\.]'
    },
    hljs.XML_ATTR,
    hljs.XML_VALUE_QUOT,
    hljs.XML_VALUE_APOS
  ]
};

hljs.HTML_TAGS = {'code': 1, 'kbd': 1, 'font': 1, 'noscript': 1, 'style': 1, 'img': 1, 'title': 1, 'menu': 1, 'tt': 1, 'tr': 1, 'param': 1, 'li': 1, 'tfoot': 1, 'th': 1, 'input': 1, 'td': 1, 'dl': 1, 'blockquote': 1, 'fieldset': 1, 'big': 1, 'dd': 1, 'abbr': 1, 'optgroup': 1, 'dt': 1, 'button': 1, 'isindex': 1, 'p': 1, 'small': 1, 'div': 1, 'dir': 1, 'em': 1, 'frame': 1, 'meta': 1, 'sub': 1, 'bdo': 1, 'label': 1, 'acronym': 1, 'sup': 1, 'body': 1, 'xml': 1, 'basefont': 1, 'base': 1, 'br': 1, 'address': 1, 'strong': 1, 'legend': 1, 'ol': 1, 'script': 1, 'caption': 1, 's': 1, 'col': 1, 'h2': 1, 'h3': 1, 'h1': 1, 'h6': 1, 'h4': 1, 'h5': 1, 'table': 1, 'select': 1, 'noframes': 1, 'span': 1, 'area': 1, 'dfn': 1, 'strike': 1, 'cite': 1, 'thead': 1, 'head': 1, 'option': 1, 'form': 1, 'hr': 1, 'var': 1, 'link': 1, 'b': 1, 'colgroup': 1, 'ul': 1, 'applet': 1, 'del': 1, 'iframe': 1, 'pre': 1, 'frameset': 1, 'ins': 1, 'tbody': 1, 'html': 1, 'samp': 1, 'map': 1, 'object': 1, 'a': 1, 'xmlns': 1, 'center': 1, 'textarea': 1, 'i': 1, 'q': 1, 'u': 1};
hljs.HTML_DOCTYPE = {
  className: 'doctype',
  begin: '<!DOCTYPE', end: '>',
  relevance: 10
};
hljs.HTML_ATTR = {
  className: 'attribute',
  begin: '\\s[a-zA-Z\\:_-]+=', end: '^',
  contains: ['value']
};
hljs.HTML_SHORT_ATTR = {
  className: 'attribute',
  begin: ' [a-zA-Z]+', end: '^'
};
hljs.HTML_VALUE = {
  className: 'value',
  begin: '[a-zA-Z0-9]+', end: '^'
};

hljs.LANGUAGES.html = {
  defaultMode: {
    contains: ['tag', 'comment', 'doctype', 'vbscript']
  },
  case_insensitive: true,
  modes: [
    hljs.XML_COMMENT,
    hljs.HTML_DOCTYPE,
    {
      className: 'tag',
      lexems: [hljs.IDENT_RE],
      keywords: hljs.HTML_TAGS,
      begin: '<style', end: '>',
      contains: ['attribute'],
      illegal: '[\\+\\.]',
      starts: 'css'
    },
    {
      className: 'tag',
      lexems: [hljs.IDENT_RE],
      keywords: hljs.HTML_TAGS,
      begin: '<script', end: '>',
      contains: ['attribute'],
      illegal: '[\\+\\.]',
      starts: 'javascript'
    },
    {
      className: 'tag',
      lexems: [hljs.IDENT_RE],
      keywords: hljs.HTML_TAGS,
      begin: '<[A-Za-z/]', end: '>',
      contains: ['attribute'],
      illegal: '[\\+\\.]'
    },
    {
      className: 'css',
      end: '</style>', returnEnd: true,
      subLanguage: 'css'
    },
    {
      className: 'javascript',
      end: '</script>', returnEnd: true,
      subLanguage: 'javascript'
    },
    hljs.HTML_ATTR,
    hljs.HTML_SHORT_ATTR,
    hljs.XML_VALUE_QUOT,
    hljs.XML_VALUE_APOS,
    hljs.HTML_VALUE,
    {
      className: 'vbscript',
      begin: '<%', end: '%>',
      subLanguage: 'vbscript'
    }
  ]
};

/*
Language: Ini
*/

hljs.LANGUAGES.ini =
{
  case_insensitive: true,
  defaultMode: {
    contains: ['comment', 'title', 'setting'],
    illegal: '[^\\s]'
  },
  modes: [
    {
      className: 'comment',
      begin: ';', end: '$'
    },
    {
      className: 'title',
      begin: '\\[', end: '\\]'
    },
    {
      className: 'setting',
      begin: '^[a-z0-9_\\[\\]]+[ \\t]*=[ \\t]*', end: '$',
      contains: ['value']
    },
    {
      className: 'value',
      begin: '^', endsWithParent: true,
      contains: ['string', 'number'],
      lexems: [hljs.IDENT_RE],
      keywords: {'on': 1, 'off': 1, 'true': 1, 'false': 1, 'yes': 1, 'no': 1}
    },
    hljs.QUOTE_STRING_MODE,
    hljs.BACKSLASH_ESCAPE,
    {
      className: 'number',
      begin: '\\d+', end: '^'
    }
  ]
};

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
/*
Language: nginx
Author: Peter Leonov <gojpeg@yandex.ru>
*/

hljs.LANGUAGES.nginx = {
  defaultMode: {
    contains: ['comment', 'directive'],
  },
  modes: [
    hljs.HASH_COMMENT_MODE,
    {
      className: 'directive',
      begin: hljs.UNDERSCORE_IDENT_RE, end: ';|{', returnEnd: true, noMarkup: true,
      contains: ['comment', 'parameters'],
      lexems: [hljs.UNDERSCORE_IDENT_RE],
      keywords: {accept_mutex: 1, accept_mutex_delay: 1, access_log: 1, add_after_body: 1, add_before_body: 1, add_header: 1, addition_types: 1, alias: 1, allow: 1, ancient_browser: 1, ancient_browser: 1, ancient_browser_value: 1, ancient_browser_value: 1, auth_basic: 1, auth_basic_user_file: 1, autoindex: 1, autoindex_exact_size: 1, autoindex_localtime: 1, 'break': 1, charset: 1, charset: 1, charset_map: 1, charset_map: 1, charset_types: 1, charset_types: 1, client_body_buffer_size: 1, client_body_in_file_only: 1, client_body_in_single_buffer: 1, client_body_temp_path: 1, client_body_timeout: 1, client_header_buffer_size: 1, client_header_timeout: 1, client_max_body_size: 1, connection_pool_size: 1, connections: 1, create_full_put_path: 1, daemon: 1, dav_access: 1, dav_methods: 1, debug_connection: 1, debug_points: 1, default_type: 1, deny: 1, directio: 1, directio_alignment: 1, echo: 1, echo_after_body: 1, echo_before_body: 1, echo_blocking_sleep: 1, echo_duplicate: 1, echo_end: 1, echo_exec: 1, echo_flush: 1, echo_foreach_split: 1, echo_location: 1, echo_location_async: 1, echo_read_request_body: 1, echo_request_body: 1, echo_reset_timer: 1, echo_sleep: 1, echo_subrequest: 1, echo_subrequest_async: 1, empty_gif: 1, empty_gif: 1, env: 1, error_log: 1, error_log: 1, error_page: 1, events: 1, expires: 1, fastcgi_bind: 1, fastcgi_buffer_size: 1, fastcgi_buffers: 1, fastcgi_busy_buffers_size: 1, fastcgi_cache: 1, fastcgi_cache_key: 1, fastcgi_cache_methods: 1, fastcgi_cache_min_uses: 1, fastcgi_cache_path: 1, fastcgi_cache_use_stale: 1, fastcgi_cache_valid: 1, fastcgi_catch_stderr: 1, fastcgi_connect_timeout: 1, fastcgi_hide_header: 1, fastcgi_ignore_client_abort: 1, fastcgi_ignore_headers: 1, fastcgi_index: 1, fastcgi_intercept_errors: 1, fastcgi_max_temp_file_size: 1, fastcgi_next_upstream: 1, fastcgi_param: 1, fastcgi_pass: 1, fastcgi_pass_header: 1, fastcgi_pass_request_body: 1, fastcgi_pass_request_headers: 1, fastcgi_read_timeout: 1, fastcgi_send_lowat: 1, fastcgi_send_timeout: 1, fastcgi_split_path_info: 1, fastcgi_store: 1, fastcgi_store_access: 1, fastcgi_temp_file_write_size: 1, fastcgi_temp_path: 1, fastcgi_upstream_fail_timeout: 1, fastcgi_upstream_max_fails: 1, flv: 1, geo: 1, geo: 1, geoip_city: 1, geoip_country: 1, gzip: 1, gzip_buffers: 1, gzip_comp_level: 1, gzip_disable: 1, gzip_hash: 1, gzip_http_version: 1, gzip_min_length: 1, gzip_no_buffer: 1, gzip_proxied: 1, gzip_static: 1, gzip_types: 1, gzip_vary: 1, gzip_window: 1, http: 1, 'if': 1, if_modified_since: 1, ignore_invalid_headers: 1, image_filter: 1, image_filter_buffer: 1, image_filter_jpeg_quality: 1, image_filter_transparency: 1, include: 1, index: 1, internal: 1, ip_hash: 1, js: 1, js_load: 1, js_require: 1, js_utf8: 1, keepalive_requests: 1, keepalive_timeout: 1, kqueue_changes: 1, kqueue_events: 1, large_client_header_buffers: 1, limit_conn: 1, limit_conn_log_level: 1, limit_except: 1, limit_rate: 1, limit_rate_after: 1, limit_req: 1, limit_req_log_level: 1, limit_req_zone: 1, limit_zone: 1, lingering_time: 1, lingering_timeout: 1, listen: 1, location: 1, lock_file: 1, log_format: 1, log_not_found: 1, log_subrequest: 1, map: 1, map_hash_bucket_size: 1, map_hash_max_size: 1, master_process: 1, memcached_bind: 1, memcached_buffer_size: 1, memcached_connect_timeout: 1, memcached_next_upstream: 1, memcached_pass: 1, memcached_read_timeout: 1, memcached_send_timeout: 1, memcached_upstream_fail_timeout: 1, memcached_upstream_max_fails: 1, merge_slashes: 1, min_delete_depth: 1, modern_browser: 1, modern_browser: 1, modern_browser_value: 1, modern_browser_value: 1, more_clear_headers: 1, more_clear_input_headers: 1, more_set_headers: 1, more_set_input_headers: 1, msie_padding: 1, msie_refresh: 1, multi_accept: 1, open_file_cache: 1, open_file_cache_errors: 1, open_file_cache_events: 1, open_file_cache_min_uses: 1, open_file_cache_retest: 1, open_file_cache_valid: 1, open_log_file_cache: 1, optimize_server_names: 1, output_buffers: 1, override_charset: 1, override_charset: 1, perl: 1, perl_modules: 1, perl_require: 1, perl_set: 1, pid: 1, port_in_redirect: 1, post_action: 1, postpone_gzipping: 1, postpone_output: 1, proxy_bind: 1, proxy_buffer_size: 1, proxy_buffering: 1, proxy_buffers: 1, proxy_busy_buffers_size: 1, proxy_cache: 1, proxy_cache_key: 1, proxy_cache_methods: 1, proxy_cache_min_uses: 1, proxy_cache_path: 1, proxy_cache_use_stale: 1, proxy_cache_valid: 1, proxy_connect_timeout: 1, proxy_headers_hash_bucket_size: 1, proxy_headers_hash_max_size: 1, proxy_hide_header: 1, proxy_ignore_client_abort: 1, proxy_ignore_headers: 1, proxy_intercept_errors: 1, proxy_max_temp_file_size: 1, proxy_method: 1, proxy_next_upstream: 1, proxy_pass: 1, proxy_pass_header: 1, proxy_pass_request_body: 1, proxy_pass_request_headers: 1, proxy_read_timeout: 1, proxy_redirect: 1, proxy_send_lowat: 1, proxy_send_timeout: 1, proxy_set_body: 1, proxy_set_header: 1, proxy_store: 1, proxy_store_access: 1, proxy_temp_file_write_size: 1, proxy_temp_path: 1, proxy_upstream_fail_timeout: 1, proxy_upstream_max_fails: 1, push_authorized_channels_only: 1, push_channel_group: 1, push_max_channel_id_length: 1, push_max_channel_subscribers: 1, push_max_message_buffer_length: 1, push_max_reserved_memory: 1, push_message_buffer_length: 1, push_message_timeout: 1, push_min_message_buffer_length: 1, push_min_message_recipients: 1, push_publisher: 1, push_store_messages: 1, push_subscriber: 1, push_subscriber_concurrency: 1, random_index: 1, read_ahead: 1, real_ip_header: 1, recursive_error_pages: 1, request_pool_size: 1, reset_timedout_connection: 1, resolver: 1, resolver_timeout: 1, 'return': 1, rewrite: 1, rewrite_log: 1, root: 1, satisfy: 1, satisfy_any: 1, send_lowat: 1, send_timeout: 1, sendfile: 1, sendfile_max_chunk: 1, server: 1, server: 1, server_name: 1, server_name_in_redirect: 1, server_names_hash_bucket_size: 1, server_names_hash_max_size: 1, server_tokens: 1, 'set': 1, set_real_ip_from: 1, source_charset: 1, source_charset: 1, ssi: 1, ssi_ignore_recycled_buffers: 1, ssi_min_file_chunk: 1, ssi_silent_errors: 1, ssi_types: 1, ssi_value_length: 1, ssl: 1, ssl_certificate: 1, ssl_certificate_key: 1, ssl_ciphers: 1, ssl_client_certificate: 1, ssl_crl: 1, ssl_dhparam: 1, ssl_prefer_server_ciphers: 1, ssl_protocols: 1, ssl_session_cache: 1, ssl_session_timeout: 1, ssl_verify_client: 1, ssl_verify_depth: 1, sub_filter: 1, sub_filter_once: 1, sub_filter_types: 1, tcp_nodelay: 1, tcp_nopush: 1, timer_resolution: 1, try_files: 1, types: 1, types_hash_bucket_size: 1, types_hash_max_size: 1, underscores_in_headers: 1, uninitialized_variable_warn: 1, upstream: 1, use: 1, user: 1, userid: 1, userid: 1, userid_domain: 1, userid_domain: 1, userid_expires: 1, userid_expires: 1, userid_mark: 1, userid_name: 1, userid_name: 1, userid_p3p: 1, userid_p3p: 1, userid_path: 1, userid_path: 1, userid_service: 1, userid_service: 1, valid_referers: 1, variables_hash_bucket_size: 1, variables_hash_max_size: 1, worker_connections: 1, worker_cpu_affinity: 1, worker_priority: 1, worker_processes: 1, worker_rlimit_core: 1, worker_rlimit_nofile: 1, worker_rlimit_sigpending: 1, working_directory: 1, xml_entities: 1, xslt_stylesheet: 1, xslt_types: 1}
    },
    {
      className: 'parameters',
      begin: '\\s', end: '[;{]', returnBegin: true, returnEnd: true, noMarkup: true,
      contains: ['comment', 'string', 'regexp', 'number', 'variable', 'built_in']
    },
    // variables (like in perl)
    {
      className: 'variable',
      begin: '\\$\\d+', end: '^'
    },
    {
      className: 'variable',
      begin: '\\${', end: '}'
    },
    {
      className: 'variable',
      begin: '[\\$\\@]' + hljs.UNDERSCORE_IDENT_RE, end: '^',
      relevance: 0
    },
    {
      className: 'built_in',
      begin: '\\b(on|off|yes|no|true|false|none|blocked|debug|info|notice|warn|error|crit|select|permanent|redirect)\\b', end: '^'
    },
    {
      className: 'built_in',
      begin: '\\b(kqueue|rtsig|epoll|poll)\\b|/dev/poll', end: '^'
    },
    // IP
    {
      className: 'number',
      begin: '\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\b', end: '^'
    },
    // units
    {
      className: 'number',
      begin: '\\s\\d+[kKmMgGdshdwy]*\\b', end: '^',
      relevance: 0
    },
    {
      className: 'string',
      begin: '"', end: '"',
      contains: ['escape', 'variable'],
      relevance: 0
    },
    {
      className: 'string',
      begin: "'", end: "'",
      contains: ['escape', 'variable'],
      relevance: 0
    },
    {
      className: 'string',
      begin: '([a-z]+):/', end: '[;\\s]', returnEnd: true
    },
    {
      className: 'regexp',
      begin: "\\s\\^", end: "\\s|{|;", returnEnd: true,
      contains: ['escape', 'variable']
    },
    // regexp locations (~, ~*)
    {
      className: 'regexp',
      begin: "~\\*?\\s+", end: "\\s|{|;", returnEnd: true,
      contains: ['escape', 'variable']
    },
    // *.example.com
    {
      className: 'regexp',
      begin: "\\*(\\.[a-z\\-]+)+", end: "^",
      contains: ['escape', 'variable']
    },
    // sub.example.*
    {
      className: 'regexp',
      begin: "([a-z\\-]+\\.)+\\*", end: "^",
      contains: ['escape', 'variable']
    },
    hljs.BACKSLASH_ESCAPE
  ]
};

/*
Language: Perl
Author: Peter Leonov <gojpeg@yandex.ru>
*/

hljs.LANGUAGES.perl = function(){
  var PERL_DEFAULT_CONTAINS = ['comment', 'string', 'number', 'regexp', 'sub', 'variable', 'operator', 'pod'];
  var PERL_KEYWORDS = {'getpwent': 1, 'getservent': 1, 'quotemeta': 1, 'msgrcv': 1, 'scalar': 1, 'kill': 1, 'dbmclose': 1, 'undef': 1, 'lc': 1, 'ma': 1, 'syswrite': 1, 'tr': 1, 'send': 1, 'umask': 1, 'sysopen': 1, 'shmwrite': 1, 'vec': 1, 'qx': 1, 'utime': 1, 'local': 1, 'oct': 1, 'semctl': 1, 'localtime': 1, 'readpipe': 1, 'do': 1, 'return': 1, 'format': 1, 'read': 1, 'sprintf': 1, 'dbmopen': 1, 'pop': 1, 'getpgrp': 1, 'not': 1, 'getpwnam': 1, 'rewinddir': 1, 'qq': 1, 'fileno': 1, 'qw': 1, 'endprotoent': 1, 'wait': 1, 'sethostent': 1, 'bless': 1, 's': 1, 'opendir': 1, 'continue': 1, 'each': 1, 'sleep': 1, 'endgrent': 1, 'shutdown': 1, 'dump': 1, 'chomp': 1, 'connect': 1, 'getsockname': 1, 'die': 1, 'socketpair': 1, 'close': 1, 'flock': 1, 'exists': 1, 'index': 1, 'shmget': 1, 'sub': 1, 'for': 1, 'endpwent': 1, 'redo': 1, 'lstat': 1, 'msgctl': 1, 'setpgrp': 1, 'abs': 1, 'exit': 1, 'select': 1, 'print': 1, 'ref': 1, 'gethostbyaddr': 1, 'unshift': 1, 'fcntl': 1, 'syscall': 1, 'goto': 1, 'getnetbyaddr': 1, 'join': 1, 'gmtime': 1, 'symlink': 1, 'semget': 1, 'splice': 1, 'x': 1, 'getpeername': 1, 'recv': 1, 'log': 1, 'setsockopt': 1, 'cos': 1, 'last': 1, 'reverse': 1, 'gethostbyname': 1, 'getgrnam': 1, 'study': 1, 'formline': 1, 'endhostent': 1, 'times': 1, 'chop': 1, 'length': 1, 'gethostent': 1, 'getnetent': 1, 'pack': 1, 'getprotoent': 1, 'getservbyname': 1, 'rand': 1, 'mkdir': 1, 'pos': 1, 'chmod': 1, 'y': 1, 'substr': 1, 'endnetent': 1, 'printf': 1, 'next': 1, 'open': 1, 'msgsnd': 1, 'readdir': 1, 'use': 1, 'unlink': 1, 'getsockopt': 1, 'getpriority': 1, 'rindex': 1, 'wantarray': 1, 'hex': 1, 'system': 1, 'getservbyport': 1, 'endservent': 1, 'int': 1, 'chr': 1, 'untie': 1, 'rmdir': 1, 'prototype': 1, 'tell': 1, 'listen': 1, 'fork': 1, 'shmread': 1, 'ucfirst': 1, 'setprotoent': 1, 'else': 1, 'sysseek': 1, 'link': 1, 'getgrgid': 1, 'shmctl': 1, 'waitpid': 1, 'unpack': 1, 'getnetbyname': 1, 'reset': 1, 'chdir': 1, 'grep': 1, 'split': 1, 'require': 1, 'caller': 1, 'lcfirst': 1, 'until': 1, 'warn': 1, 'while': 1, 'values': 1, 'shift': 1, 'telldir': 1, 'getpwuid': 1, 'my': 1, 'getprotobynumber': 1, 'delete': 1, 'and': 1, 'sort': 1, 'uc': 1, 'defined': 1, 'srand': 1, 'accept': 1, 'package': 1, 'seekdir': 1, 'getprotobyname': 1, 'semop': 1, 'our': 1, 'rename': 1, 'seek': 1, 'if': 1, 'q': 1, 'chroot': 1, 'sysread': 1, 'setpwent': 1, 'no': 1, 'crypt': 1, 'getc': 1, 'chown': 1, 'sqrt': 1, 'write': 1, 'setnetent': 1, 'setpriority': 1, 'foreach': 1, 'tie': 1, 'sin': 1, 'msgget': 1, 'map': 1, 'stat': 1, 'getlogin': 1, 'unless': 1, 'elsif': 1, 'truncate': 1, 'exec': 1, 'keys': 1, 'glob': 1, 'tied': 1, 'closedir': 1, 'ioctl': 1, 'socket': 1, 'readlink': 1, 'eval': 1, 'xor': 1, 'readline': 1, 'binmode': 1, 'setservent': 1, 'eof': 1, 'ord': 1, 'bind': 1, 'alarm': 1, 'pipe': 1, 'atan2': 1, 'getgrent': 1, 'exp': 1, 'time': 1, 'push': 1, 'setgrent': 1, 'gt': 1, 'lt': 1, 'or': 1, 'ne': 1, 'm': 1};
  return {
    defaultMode: {
      lexems: [hljs.IDENT_RE],
      contains: PERL_DEFAULT_CONTAINS,
      keywords: PERL_KEYWORDS
    },
    modes: [

      // variables
      {
        className: 'variable',
        begin: '\\$\\d', end: '^'
      },
      {
        className: 'variable',
        begin: '[\\$\\%\\@\\*](\\^\\w\\b|#\\w+(\\:\\:\\w+)*|[^\\s\\w{]|{\\w+}|\\w+(\\:\\:\\w*)*)', end: '^'
      },

      // numbers and strings
      {
        className: 'subst',
        begin: '[$@]\\{', end: '\}',
        lexems: [hljs.IDENT_RE],
        keywords: PERL_KEYWORDS,
        contains: PERL_DEFAULT_CONTAINS,
        relevance: 10
      },
      {
        className: 'number',
        begin: '(\\b0[0-7_]+)|(\\b0x[0-9a-fA-F_]+)|(\\b[1-9][0-9_]*(\\.[0-9_]+)?)|[0_]\\b', end: '^',
        relevance: 0
      },
      {
        className: 'string',
        begin: 'q[qwxr]?\\s*\\(', end: '\\)',
        contains: ['escape', 'subst', 'variable'],
        relevance: 5
      },
      {
        className: 'string',
        begin: 'q[qwxr]?\\s*\\[', end: '\\]',
        contains: ['escape', 'subst', 'variable'],
        relevance: 5
      },
      {
        className: 'string',
        begin: 'q[qwxr]?\\s*\\{', end: '\\}',
        contains: ['escape', 'subst', 'variable'],
        relevance: 5
      },
      {
        className: 'string',
        begin: 'q[qwxr]?\\s*\\|', end: '\\|',
        contains: ['escape', 'subst', 'variable'],
        relevance: 5
      },
      {
        className: 'string',
        begin: 'q[qwxr]?\\s*\\<', end: '\\>',
        contains: ['escape', 'subst', 'variable'],
        relevance: 5
      },
      {
        className: 'string',
        begin: 'qw\\s+q', end: 'q',
        contains: ['escape', 'subst', 'variable'],
        relevance: 5
      },
      {
        className: 'string',
        begin: '\'', end: '\'',
        contains: ['escape'],
        relevance: 0
      },
      {
        className: 'string',
        begin: '"', end: '"',
        contains: ['escape','subst','variable'],
        relevance: 0
      },
      hljs.BACKSLASH_ESCAPE,
      {
        className: 'string',
        begin: '`', end: '`',
        contains: ['escape']
      },

      // regexps
      {
        className: 'regexp',
        begin: '(s|tr|y)/(\\\\.|[^/])*/(\\\\.|[^/])*/[a-z]*', end: '^',
        relevance: 10
      },
      {
        className: 'regexp',
        begin: '(m|qr)?/', end: '/[a-z]*',
        contains: ['escape'],
        relevance: 0 // allows empty "//" which is a common comment delimiter in other languages
      },

      // bareword context
      {
        className: 'string',
        begin: '{\\w+}', end: '^',
        relevance: 0
      },
      {
        className: 'string',
        begin: '\-?\\w+\\s*\\=\\>', end: '^',
        relevance: 0
      },

      // subroutines
      {
        className: 'sub',
        begin: '\\bsub\\b', end: '(\\s*\\(.*?\\))?[;{]',
        lexems: [hljs.IDENT_RE],
        keywords: {'sub':1},
        relevance: 5
      },

      // operators
      {
        className: 'operator',
        begin: '-\\w\\b', end: '^',
        relevance: 0
      },

      // comments
      hljs.HASH_COMMENT_MODE,
      {
        className: 'comment',
        begin: '^(__END__|__DATA__)', end: '\\n$',
        relevance: 5
      },
      // pod
      {
        className: 'pod',
        begin: '\\=\\w', end: '\\=cut'
      }

    ]
  };
}();

/*
Language: Ruby
Author: Anton Kovalyov <anton@kovalyov.net>
Contributors: Peter Leonov <gojpeg@yandex.ru>, Vasily Polovnyov <vast@whiteants.net>
*/

hljs.LANGUAGES.ruby = function(){
  var RUBY_IDENT_RE = '[a-zA-Z_][a-zA-Z0-9_]*(\\!|\\?)?';
  var RUBY_DEFAULT_CONTAINS = ['comment', 'string', 'char', 'class', 'function', 'module_name', 'symbol', 'number', 'variable', 'regexp_container']
  var RUBY_KEYWORDS = {
    'keyword': {'and': 1, 'false': 1, 'then': 1, 'defined': 1, 'module': 1, 'in': 1, 'return': 1, 'redo': 1, 'if': 1, 'BEGIN': 1, 'retry': 1, 'end': 1, 'for': 1, 'true': 1, 'self': 1, 'when': 1, 'next': 1, 'until': 1, 'do': 1, 'begin': 1, 'unless': 1, 'END': 1, 'rescue': 1, 'nil': 1, 'else': 1, 'break': 1, 'undef': 1, 'not': 1, 'super': 1, 'class': 1, 'case': 1, 'require': 1, 'yield': 1, 'alias': 1, 'while': 1, 'ensure': 1, 'elsif': 1, 'or': 1, 'def': 1},
    'keymethods': {'__id__': 1, '__send__': 1, 'abort': 1, 'abs': 1, 'all?': 1, 'allocate': 1, 'ancestors': 1, 'any?': 1, 'arity': 1, 'assoc': 1, 'at': 1, 'at_exit': 1, 'autoload': 1, 'autoload?': 1, 'between?': 1, 'binding': 1, 'binmode': 1, 'block_given?': 1, 'call': 1, 'callcc': 1, 'caller': 1, 'capitalize': 1, 'capitalize!': 1, 'casecmp': 1, 'catch': 1, 'ceil': 1, 'center': 1, 'chomp': 1, 'chomp!': 1, 'chop': 1, 'chop!': 1, 'chr': 1, 'class': 1, 'class_eval': 1, 'class_variable_defined?': 1, 'class_variables': 1, 'clear': 1, 'clone': 1, 'close': 1, 'close_read': 1, 'close_write': 1, 'closed?': 1, 'coerce': 1, 'collect': 1, 'collect!': 1, 'compact': 1, 'compact!': 1, 'concat': 1, 'const_defined?': 1, 'const_get': 1, 'const_missing': 1, 'const_set': 1, 'constants': 1, 'count': 1, 'crypt': 1, 'default': 1, 'default_proc': 1, 'delete': 1, 'delete!': 1, 'delete_at': 1, 'delete_if': 1, 'detect': 1, 'display': 1, 'div': 1, 'divmod': 1, 'downcase': 1, 'downcase!': 1, 'downto': 1, 'dump': 1, 'dup': 1, 'each': 1, 'each_byte': 1, 'each_index': 1, 'each_key': 1, 'each_line': 1, 'each_pair': 1, 'each_value': 1, 'each_with_index': 1, 'empty?': 1, 'entries': 1, 'eof': 1, 'eof?': 1, 'eql?': 1, 'equal?': 1, 'eval': 1, 'exec': 1, 'exit': 1, 'exit!': 1, 'extend': 1, 'fail': 1, 'fcntl': 1, 'fetch': 1, 'fileno': 1, 'fill': 1, 'find': 1, 'find_all': 1, 'first': 1, 'flatten': 1, 'flatten!': 1, 'floor': 1, 'flush': 1, 'for_fd': 1, 'foreach': 1, 'fork': 1, 'format': 1, 'freeze': 1, 'frozen?': 1, 'fsync': 1, 'getc': 1, 'gets': 1, 'global_variables': 1, 'grep': 1, 'gsub': 1, 'gsub!': 1, 'has_key?': 1, 'has_value?': 1, 'hash': 1, 'hex': 1, 'id': 1, 'include?': 1, 'included_modules': 1, 'index': 1, 'indexes': 1, 'indices': 1, 'induced_from': 1, 'inject': 1, 'insert': 1, 'inspect': 1, 'instance_eval': 1, 'instance_method': 1, 'instance_methods': 1, 'instance_of?': 1, 'instance_variable_defined?': 1, 'instance_variable_get': 1, 'instance_variable_set': 1, 'instance_variables': 1, 'integer?': 1, 'intern': 1, 'invert': 1, 'ioctl': 1, 'is_a?': 1, 'isatty': 1, 'iterator?': 1, 'join': 1, 'key?': 1, 'keys': 1, 'kind_of?': 1, 'lambda': 1, 'last': 1, 'length': 1, 'lineno': 1, 'ljust': 1, 'load': 1, 'local_variables': 1, 'loop': 1, 'lstrip': 1, 'lstrip!': 1, 'map': 1, 'map!': 1, 'match': 1, 'max': 1, 'member?': 1, 'merge': 1, 'merge!': 1, 'method': 1, 'method_defined?': 1, 'method_missing': 1, 'methods': 1, 'min': 1, 'module_eval': 1, 'modulo': 1, 'name': 1, 'nesting': 1, 'new': 1, 'next': 1, 'next!': 1, 'nil?': 1, 'nitems': 1, 'nonzero?': 1, 'object_id': 1, 'oct': 1, 'open': 1, 'pack': 1, 'partition': 1, 'pid': 1, 'pipe': 1, 'pop': 1, 'popen': 1, 'pos': 1, 'prec': 1, 'prec_f': 1, 'prec_i': 1, 'print': 1, 'printf': 1, 'private_class_method': 1, 'private_instance_methods': 1, 'private_method_defined?': 1, 'private_methods': 1, 'proc': 1, 'protected_instance_methods': 1, 'protected_method_defined?': 1, 'protected_methods': 1, 'public_class_method': 1, 'public_instance_methods': 1, 'public_method_defined?': 1, 'public_methods': 1, 'push': 1, 'putc': 1, 'puts': 1, 'quo': 1, 'raise': 1, 'rand': 1, 'rassoc': 1, 'read': 1, 'read_nonblock': 1, 'readchar': 1, 'readline': 1, 'readlines': 1, 'readpartial': 1, 'rehash': 1, 'reject': 1, 'reject!': 1, 'remainder': 1, 'reopen': 1, 'replace': 1, 'require': 1, 'respond_to?': 1, 'reverse': 1, 'reverse!': 1, 'reverse_each': 1, 'rewind': 1, 'rindex': 1, 'rjust': 1, 'round': 1, 'rstrip': 1, 'rstrip!': 1, 'scan': 1, 'seek': 1, 'select': 1, 'send': 1, 'set_trace_func': 1, 'shift': 1, 'singleton_method_added': 1, 'singleton_methods': 1, 'size': 1, 'sleep': 1, 'slice': 1, 'slice!': 1, 'sort': 1, 'sort!': 1, 'sort_by': 1, 'split': 1, 'sprintf': 1, 'squeeze': 1, 'squeeze!': 1, 'srand': 1, 'stat': 1, 'step': 1, 'store': 1, 'strip': 1, 'strip!': 1, 'sub': 1, 'sub!': 1, 'succ': 1, 'succ!': 1, 'sum': 1, 'superclass': 1, 'swapcase': 1, 'swapcase!': 1, 'sync': 1, 'syscall': 1, 'sysopen': 1, 'sysread': 1, 'sysseek': 1, 'system': 1, 'syswrite': 1, 'taint': 1, 'tainted?': 1, 'tell': 1, 'test': 1, 'throw': 1, 'times': 1, 'to_a': 1, 'to_ary': 1, 'to_f': 1, 'to_hash': 1, 'to_i': 1, 'to_int': 1, 'to_io': 1, 'to_proc': 1, 'to_s': 1, 'to_str': 1, 'to_sym': 1, 'tr': 1, 'tr!': 1, 'tr_s': 1, 'tr_s!': 1, 'trace_var': 1, 'transpose': 1, 'trap': 1, 'truncate': 1, 'tty?': 1, 'type': 1, 'ungetc': 1, 'uniq': 1, 'uniq!': 1, 'unpack': 1, 'unshift': 1, 'untaint': 1, 'untrace_var': 1, 'upcase': 1, 'upcase!': 1, 'update': 1, 'upto': 1, 'value?': 1, 'values': 1, 'values_at': 1, 'warn': 1, 'write': 1, 'write_nonblock': 1, 'zero?': 1, 'zip': 1}
  }
  return {
    defaultMode: {
      lexems: [RUBY_IDENT_RE],
      contains: RUBY_DEFAULT_CONTAINS,
      keywords: RUBY_KEYWORDS
    },
    modes: [
      hljs.HASH_COMMENT_MODE,
      {
        className: 'comment',
        begin: '^\\=begin', end: '^\\=end',
        relevance: 10
      },
      {
        className: 'comment',
        begin: '^__END__', end: '\\n$'
      },
      {
        className: 'params',
        begin: '\\(', end: '\\)',
        lexems: [RUBY_IDENT_RE],
        keywords: RUBY_KEYWORDS,
        contains: RUBY_DEFAULT_CONTAINS
      },
      {
        className: 'function',
        begin: '\\bdef\\b', end: '$|;',
        lexems: [RUBY_IDENT_RE],
        keywords: RUBY_KEYWORDS,
        contains: ['title', 'params', 'comment']
      },
      {
        className: 'class',
        begin: '\\b(class|module)\\b', end: '$',
        lexems: [hljs.UNDERSCORE_IDENT_RE],
        keywords: RUBY_KEYWORDS,
        contains: ['title', 'inheritance', 'comment'],
        keywords: {'class': 1, 'module': 1}
      },
      {
        className: 'title',
        begin: '[A-Za-z_]\\w*(::\\w+)*(\\?|\\!)?', end: '^',
        relevance: 0
      },
      {
        className: 'inheritance',
        begin: '<\\s*', end: '^',
        contains: ['parent']
      },
      {
        className: 'parent',
        begin: '(' + hljs.IDENT_RE + '::)?' + hljs.IDENT_RE, end: '^'
      },
      {
        className: 'number',
        begin: '(\\b0[0-7_]+)|(\\b0x[0-9a-fA-F_]+)|(\\b[1-9][0-9_]*(\\.[0-9_]+)?)|[0_]\\b', end: '^',
        relevance: 0
      },
      {
        className: 'number',
        begin: '\\?\\w', end: '^'
      },
      {
        className: 'string',
        begin: '\'', end: '\'',
        contains: ['escape', 'subst'],
        relevance: 0
      },
      {
        className: 'string',
        begin: '"', end: '"',
        contains: ['escape', 'subst'],
        relevance: 0
      },
      {
        className: 'string',
        begin: '%[qw]?\\(', end: '\\)',
        contains: ['escape', 'subst'],
        relevance: 10
      },
      {
        className: 'string',
        begin: '%[qw]?\\[', end: '\\]',
        contains: ['escape', 'subst'],
        relevance: 10
      },
      {
        className: 'string',
        begin: '%[qw]?{', end: '}',
        contains: ['escape', 'subst'],
        relevance: 10
      },
      {
        className: 'string',
        begin: '%[qw]?<', end: '>',
        contains: ['escape', 'subst'],
        relevance: 10
      },
      {
        className: 'string',
        begin: '%[qw]?/', end: '/',
        contains: ['escape', 'subst'],
        relevance: 10
      },
      {
        className: 'string',
        begin: '%[qw]?%', end: '%',
        contains: ['escape', 'subst'],
        relevance: 10
      },
      {
        className: 'string',
        begin: '%[qw]?-', end: '-',
        contains: ['escape', 'subst'],
        relevance: 10
      },
      {
        className: 'string',
        begin: '%[qw]?\\|', end: '\\|',
        contains: ['escape', 'subst'],
        relevance: 10
      },
      {
        className: 'module_name',
        begin: ':{2}' + RUBY_IDENT_RE, end: '^',
        noMarkup: true
      },
      {
        className: 'symbol',
        begin: ':' + RUBY_IDENT_RE, end: '^'
      },
      {
        className: 'symbol',
        begin: ':', end: '^',
        contains: ['string']
      },
      hljs.BACKSLASH_ESCAPE,
      {
        className: 'subst',
        begin: '#\\{', end: '}',
        lexems: [RUBY_IDENT_RE],
        keywords: RUBY_KEYWORDS,
        contains: RUBY_DEFAULT_CONTAINS
      },
      {
        className: 'regexp_container',
        begin: '(' + hljs.RE_STARTERS_RE + ')\\s*', end: '^', noMarkup: true,
        contains: ['comment', 'regexp'],
        relevance: 0
      },
      {
        className: 'regexp',
        begin: '/', end: '/[a-z]*',
        illegal: '\\n',
        contains: ['escape']
      },
      {
        className: 'variable',
        begin: '(\\$\\W)|((\\$|\\@\\@?)(\\w+))', end: '^'
      }
    ]
  };
}();


hljs.tabReplace = '    '
hljs.initHighlightingOnLoad()
