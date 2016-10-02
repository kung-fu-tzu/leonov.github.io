---
title: "Highlighting hardcode JavaScript"
description: "Like TextMate, but better."
categories: [frontend, javascript, highlight]
layout: post
time: 15:48:34
---

Finally, finished the full JavaScript syntax highlighter. There already was a simple [JavaScript support](http://softwaremaniacs.org/blog/2007/01/20/highlight-js-javascript/) in [highlighter.js](http://softwaremaniacs.org/soft/highlight/). But I desired a full TextMate level support with the exact same coloring. And now, based on sunburst color theme here it is:

![example](/i/2010-01-28-highlight-javascript-kinda-textmate/example.png)

To be able to correctly parse regular expressions [distinguishing them](http://softwaremaniacs.org/blog/2008/11/24/highlightjs-50-beta/) (in Russian) from comments and dividing operators the Highlighter [got patched](/i/2010-01-28-highlight-javascript-kinda-textmate/highlight-javascript-like-textmate.patch).

If you as me desire this coloring too then quickly grab the syntaxmodule [javascript-tm.js](/i/2010-01-28-highlight-javascript-kinda-textmate/javascript-tm.js) and patched [highlight.js](/i/2010-01-28-highlight-javascript-kinda-textmate/highlight.js).
