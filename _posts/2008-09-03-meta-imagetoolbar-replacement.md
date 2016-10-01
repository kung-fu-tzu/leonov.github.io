---
title: "meta imagetoolbar replacement"
description: "To those who tired of adding this tag to each and every page."
categories: [frontend, css, expressions, IE]
layout: post
time: 01:09:43
---

Do not want to add `meta http-equiv="imagetoolbar" content="no"` to all your pages? Setting [set_header](http://nginx.org/en/docs/http/ngx_http_headers_module.html#add_header) didn't help? Expression to the rescue!

	img
	{
	  scrollbar-highlight-color: expression
	  (
	  	// makes sure the expression runs only once
	    (runtimeStyle.scrollbarHighlightColor = "transparent"),
	    // disable image toolbar
	    (this.galleryImg='no')
	  )
	}

The key part is `this.galleryImg='no'`. The comments and newlines are there for readability only. Warning, MSIE does not support them in expressions, so, please, make the expression a single line before use.

Reade more on MSDN about [galleryImg property](https://msdn.microsoft.com/en-us/library/ms533774.aspx).
