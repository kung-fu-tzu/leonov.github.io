---
title: "CSS Cleaner"
description: "A pure JS tool for CSS garbage collecting."
categories: [frontend, css, javascript]
layout: post
lang: en
---


TL;DR: it's about [CSS Cleaner](https://github.com/peter-leonov/css-cleaner), a small library for dynamic and accurate CSS garbage collecting based on MutationObserver.

What if we all have written only perfectly modular CSS from the very beginning? Then nobody would ever need to manually garbage collect all the global CSS rules many legacy projects have these days. But why do it manually, is not it 2017 with all the power of modern technology finally arrived to the Frontend world? Let's have a look.

### 1. Chrome Dev Tools to the rescue

When I faced the problem of an abandoned big CSS mess the first and the most adequate idea was that Chrome Dev Tools should already have something which magically fixes everything. Why not if we have all those React / Redux plugins with source maps and stuff. Nope, as of late 2016 it had only a reporting tool which tells how bad the code is. I KNOW IT IS BAD, you troll…

### 2. Just use querySelector() and you're golden

On second thought, if Dev Tools failed we should not. Let's just use `querySelector()` for all the 10.000 rules from `style.css` and remove not used ones. Ah, it's 2017 and web is not static anymore. Ah, we have more than one page. This means we need to go deeper…

### 4. Use querySelector() with many times

A simple script which checked all the CSS rules on each button click helped a bit for a simple part of the application and I had got some progress. But animations, I could not catch the moment when the temporary CSS class gets applied to, say, a pop-over window. Here I decided to use a heavy machinery of modern browsers…

### 5. querySelector() + MutationObserver

Yes! This really can catch all the UI changes which get rendered (see [microtasks](https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/)). But we need to be very careful to preserve the order of the CSS rules in files and order of CSS files either, so it's better to not collect the used rules but do opposite: remove never used. This is so obvious because manually we do it exactly like this, just removing garbage!

Finally, the code: [CSS Cleaner](https://github.com/peter-leonov/css-cleaner).

If your users could forgive you try running it in a split test on 1% of your audience and be sure for 99.999% that you break nothing. But better hire a true QA Automation Engineer which I miss very much all the time.
