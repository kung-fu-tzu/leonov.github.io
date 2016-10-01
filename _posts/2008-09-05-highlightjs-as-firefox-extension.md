---
title: "highlight.js as a Firefox extension"
description: "Wrapping Highlighter with Firefox."
categories: [frontend, firefox, javascript]
layout: post
time: 04:16:42
---

A year ago set my eyes on a code highlighting library called [highlight.js](http://softwaremaniacs.org/soft/highlight/) written by [Ivan Sagalaev](http://softwaremaniacs.org/about/). And so interesting this library was that I wanted to have it on all the Internet pages I visit with a Firefox extension. Let it light up all the dark code on outdated pages said I. One year later Firefox 3.0 has seen the world, and it is all a bit different. Many extensions are broken in the new release including mine one.

The main difference between extension versions for Firefox 2.0 and 3.0 is how the styles and library is injected to pages. It's not anymore possible to embed files using `chrome://` protocol, instead the new `resources://` protocol should be used. This should increase security, stability and everything. Also, embedding highlight.js became handier because Ivan made a real separated module out the script. Take a closer look at sources if interested.
