---
title: "JavaScript memory management in nginx"
description: "Interlacing native nginx structures and their representatives in JS."
categories: [backend, C, embedding javascript, nginx, serverside javascript, spidermonkey]
layout: post
time: 05:22:07
---

## Пишем сценарий

**UPD 2010-06-08**: Warning! The module has evolved a lot since the date of writing and now has more native→script→native transitions, including overlapping ones. In current version each request wrapper gets rooted and connected to the native request just in time of wrapping.

**UPD 2011-04-08**: And now the internal architecture of SpiderMonkey has changed completely making it difficult to understand what's where and how it works actually ;)

At first, embedding JavaScript engine into nginx looked as a pretty easy task. It should be enough to just wrap a native nginx request in a JS object and pass the wrapper to JS engine. The rest of the wrapper life is not our trouble cause JS has an automated GC. As usual it turned out to be the opposite. There are at least three different scenarios of request processing and each of them needs thorough analysis.

The first one is the simplest. A request comes, gets wrapped, then passed to a configured JS handler (plain old JS function), and the handler returns a response.
That's all. After that has been done we do not need neither the native request structure in nginx memory nor the JS wrapper in SpiderMonkey memory. The only additional action is just passing the resulting data to nginx internals and we're free to go to bed.

The second scenario is more complex. It starts as the first one: request → wrapper → handler. And here comes the difference, JS code may want to save the wrapper somewhere in global variable to access it later protecting the wrapper from been collected. This means that when the module gets the execution control back to native code it can't anymore just forget about the wrapper. This is because nginx has no idea of memory management in JS and will at some point in future reclaim the request memory and use it for another request of a buffer. Therefore an instant after been saved in global variable the request wrapper starts to point to garbage. Of course, nginx process will fall with a segfault shortly (or even worse, later) after some code in JS accesses the wrapper. For example, some coder will decide to collect all the requests in an array for after benchmark statistics calculation. Easy to predict, this after calculation will fail miserably as non of the saved request is still present in memory. Yeap, that kind of complexity we all love ;)

The third type of scenario is even more interesting. After the same beginning: request → wrapper → handler, comes the most beloved dynamic language feature – a closure. Here some code in handler decides to make a sub-request or add a timer providing a closure as a callback. In this case in addition to issues from the second scenario we get a trouble with a callback which is saved nowhere and will be garbage collected. Some time later, when a sub-request finishes or a timer gets fired nginx will call the callback which was GCed along with the request wrapper. Core dump. So for the third scenario to succeed we need a double linked approach: from nginx to JS wrapper and from JS wrapper to nginx.

## A note on performance

The third scenario is the most full one and includes solutions for all other scenarios of a scripting engine embedding into a mother ship application. If so, why to bother ourselves with other routes? Performance.

Nginx is known for it's performance and efficient resources management. One follows the other. And as far as it's so perfect it's better not make it to much worse with the slow SpiderMonkey (in comparison to Google v8 and SquirrelFish Extreme, yes, how many SEO experts does it take…). So, if for each request we select the third scenario, then for all the requests, even for the lightest ones, we would have to make the full memory protection procedure. But if it's possible to guess which way the process goes we can save a lot. One more thing. Second variant (where JS stores requests in memory) is completely undetectable for SpiderMonkey (and especially v8) without making full garbage collecting cycle which is insanely slow. This way we get rid of one of the variants which leaves us with just two: 1) simple, when we can almost forget about memory management; and 2) complex where we need to play safe and do full GC protection.

The first type of request will be the most popular. For example requests to cache, to status of a process, or requests of type "postpone this for future". This is why we should learn how to distinguish them quickly. In nginx starting from version 0.8 they implemented request [reference counting](http://en.wikipedia.org/wiki/Reference_counting). Yes, like in Perl. IMHO, simple, clear and bullet proof. For us nginx scripters (and I'm far not along trying to push some scripting into nginx), reference counting is a must have feature for this and other tasks. So, we are going to use this counter to guess which scenario the requests follows. If `r->main->count` is greater than one, then the request is going to live longer than our callback executes. If it equals one then we can forget about almost all the memory management tasks. If it's less than one it means we made a mistake somewhere and segfault is coming.

## Solving problems

In the first scenario there are none. The newly created wrapper object gets directly passed to a function as a parameter (or invocant) which protects it from been garbage collected while the function is on call stack. It gets out of stack exactly when we do not need the wrapper anymore. The only thing we need to do is to set the native request pointer to `NULL`. Here we can have little trouble with race condition in threaded environment if SpiderMonkey starts GC in-between we create a wrapper and we pass it to a function. To avoid the race condition there is a special function for entering and exiting the "incollectable" area `[JS_EnterLocalRootScope()](https://developer.mozilla.org/en/SpiderMonkey/JSAPI_Reference/JS_EnterLocalRootScope)` and ` [JS_LeaveLocalRootScope()](https://developer.mozilla.org/en/SpiderMonkey/JSAPI_Reference/JS_LeaveLocalRootScope)`.

Finally, the solution for the second variant (the third of the initial list). Here are the requirements in short:

1. We must not refer to dead nginx request.
2. We need to protect wrapper object from been collected ahead of time.
3. We need to protect all JS callback functions we need.
4. Do not forget to allow garbage collecting the wrapper object once we done.

Now step by step.

## 1. Pointer invalidation

We cannot get rid of a pointer to a nginx request (a huge nested structure) in the wrapper object. As long as the wrapper object is floating somewhere in JS memory heap one can simply execute something like `r.sendHeaders(200, "Content-type: plain: encoding=utf-8")`. It's important to somehow understand that we cannot anymore do this and tell the script about it. Here is a simple solution: tell the wrapper object that it now points to `NULL`, and for each call to a method or a property of the wrapper object we need to check if the pointer to the native request structure is `NULL`. If it is `NULL` then we throw an exception to form a beautiful 500 error. It is definitely way better than failing the whole process to core dump.

How to properly set the pointer to `NULL`? Thanks to Igor Sysoev it's dump easy, we just need to subscribe to the request termination event. Simple, fast, bullet proof as nginx is.

## 2. Termination protection: roots

It is easy to protect a JS object from been collected. One way is to assign it to a global variable or a property of another protected object (`global.requests.push(r)`). Also it's possible to write it to a slot of a protected object (`[JS_SetReservedSlot()](https://developer.mozilla.org/en/SpiderMonkey/JSAPI_Reference/JS_GetReservedSlot)`). Finally, it's possible to mark an object as a GC root (`[JS_AddRoot()](https://developer.mozilla.org/en/SpiderMonkey/JSAPI_Reference/JS_AddRoot)`). The garbage collector (theoretically) starts marking non-garbage object from these roots. The JS global object (like `window` or `self`) is an exact example of such a root. In our case we create a special pointer (`jsval`) in nginx request structure where we will put the wrapper object and mark it as GC root. Ok, we are safe now. Then we remove the GC root right in the same nginx request termination callback where we set the wrapper object pointer to `NULL`.

## 3. Garbage collection protection: slots in roots

It is possible to protect callbacks the same ways we protect the wrapper object. A year ago I did exactly like this: created a separated root for each object and then deleted the root afterwards. In the newer version timers and sub-requests got added. Adding GC roots for all those dynamic stuff is tend to be not a good idea from SpiderMonkey perspective. We are already loaded creating thousands of roots for each of the incoming requests as SpiderMonkey uses just a single hash table for all roots as [we read in sources](http://mxr.mozilla.org/mozilla-central/source/js/src/jsgc.cpp#1163). Better not push everything in one hash. By the way this whole blog post grows out of this performance problem (ain't you tired reading).

So, better use slots instead of separated roots. They are not very fast either (in SpiderMonkey nothing is very fast), but slots should help us scale normally. Also, slots are good in that we do not need to erase them manually because all the referred objects will get collected once the slot holding object gets collected. For v8 it's just a gift because it has a generational GC. This whole approach helps to detach JS garbage collecting from nginx core logic in space and time.

## 4. Freeing the memory

Properly detach the wrapper object is not so hard. Let's do it in the same place we set the native request pointer to `NULL`. You would not imagine how happy I was when had found this callback in nginx sources (remember, nginx's docs are written in C). It is enough to call `[JS_RemoveRoot()](https://developer.mozilla.org/en/SpiderMonkey/JSAPI_Reference/JS_RemoveRoot)` and we are golden.

After understanding of all the memory management penalties it's now clear why we had to analyze so much things here.

## Aferword

Why v8 is in the text? This is because as an experienced frontender I know that it's better not stick to IE6 for too long. Today the SpiderMonkey engine is hot, tomorrow it is v8. Then, maybe, the whole JS go down, but the garbage stays forever.

Looking for sources? Check out [Github](http://github.com/kung-fu-tzu/ngx_http_js_module).

*Wow! I just wanted to write few paragraphs*
