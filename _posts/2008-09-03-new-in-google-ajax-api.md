---
title: "New in Google AJAX API"
description: "Deferred API loading and geolocation."
categories: [frontend, geo, google, javascript, maps]
layout: post
time: 01:09:51
---

It is now possible to load any API at any state of page loading: [Dynamic Loading](http://code.google.com/apis/ajax/documentation/#Dynamic). Before that it was only possible to put `<script>` in the page `<head>` before a full load (w/o using hacks, of course). Dynamic Loading allows to postpone the loaders loading even.

Also, they added (**UPD 2011-01-10**: and deleted) the possibility to guess [users geo location](http://code.google.com/apis/ajax/documentation/#ClientLocation). Approximated but on the other hand quick and free.