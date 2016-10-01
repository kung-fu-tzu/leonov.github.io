---
title: "Gray tips in text inputs"
description: "Like in the iPhone."
categories: [frontend, input tip, keypress]
layout: post
time: 19:02:18
lang: en
---

Put an input into a label. Put `<small>` with a tip text into the label. Make label `position: relative`. Lay the small above the input. Colour the small with light gray or make it semi-transparent.

In result, once user clicks on the tip, the input gets focus. So, all we need to do is hiding the tip if input gets a text.

To make it eye candy we have to hide the tip instantly after the text appears. It is not so easy to achieve as it looks. Subscribing to `keydown` we can't get the text value of the input. If we use `keypress` or `keyup` then our code will get called after a small but noticeable delay.

The trickery with catching the backspace and delete buttons is no good as user can select the text with mouse or even drag some text in the input. Duplicating the browser functionality in JS leads to a dead end. It is not the way we choose.

One hack does work. Bind to `keypress` event, postpone the callback with `setTimeout()` and do all the work in the shortly delayed callback right at the time input has figured out its value.
