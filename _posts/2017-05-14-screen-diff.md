---
title: "Screen Diff"
description: "Diff tool for different height screenshots."
categories: [backend, ruby, imagemagick, diff]
layout: post
lang: en
---


About a year ago I jumped into a very old pre-CSS-Modules, pre-BEM, pre-Symantic-CSS era project with no UI tests of any kind. As you could have already guessed changing any CSS line would break any page in this project starting from admin interface (it shared CSS with frontpage) ending with mobile version for Window CE.

So, with an experienced QA engineer (but still not God-like to click trough 24/7 this monster) we decided to use an automated screenshot based testing added to the main integration testing suit. But at that time there was literally no screenshot comparing tool which could tolerate screenshots of different heights. All of them just failed with error message if the newer screenshot version is even one pixel bigger.

To fix this small problem I decided to use text based diff tool which could treat images as lines of pixels and produce a human understandable diff even for an image. And it worked!

The only thing is that I still have no time to rewrite it in C as the original Ruby version is "a bit" slow. Here it is, if you're intrigued: [Screen Diff](https://github.com/peter-leonov/screen-diff).
