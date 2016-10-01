---
title: "I wisper XHTML…"
description: "How to parse HTML on an XHTML page."
categories: [frontend, javascript, xhtml]
layout: post
time: 09:08:16
lang: en
---

This morning I switched back to rendering RSS feed on our [Programica blog](http://www.programica.ru/). And what I saw was that `innerHTML` does not work anymore. What? Spoiler: solution exists but first of all let's define the problem.

### XHTML

Recently we decided to switch all our projects to XHTML. Nothing new you say, nowdays any sane professinal implement each bit of standards and automatically validates each step of work. However, as we know from Ivan Sagalaev's post «[XHTML, you say?](http://softwaremaniacs.org/blog/2005/12/19/xhtml-you-say/)» (in Russian), it's not as simple as it looks at first and many of us does not even know that they use not XHTML but the good old HTML. The reason is the `Content-type` HTTP header, and the whole XHTML pandemonium begins if only if you instead of `text/html` give the browser to sniff `application/xhtml+xml`. Or `text/xml` in worst case. The broser would instantly realise that you've made it perfect and started using the most formated format ever – XML and co. However, your page would not remain the same. It's just about closing slashes in `<br>` and `<img>` you think. Nope. When you start to code having the markup fixed, XML namespace defined and encoding fixed, bonus troubles come with the most advanced markup standard. This is where the story begins.

The classical example of the difference between HTML and XHTML engines was the lack of `innerHTML` property on XHTML elements. That means you can't anymore load some amorphous markup and output it to `<div>`. Of course the propertly is writable as far JavaScript allows setting random properties, but with no effect. There appeared some hacks with interfaces `DOMParser` and `DOMSerializer` used for emulating the lovely property with various success. Later brosers learned the trick and started to support `innerHTML` natively in XHTML mode (higly possibly using the same interfaces), and now it's possible to write something like `$('content').innerHTML = '<h1>Tired <i>of</i> repeating createElement() and appendChild()</h1>'`. Although the property name is `innerHTML` in fact it does not accept real HTML, the proper name should be `innerXHTML`. That means this would not going to work: `mailDiv.innerHTML = '<p>forget closing "p", add non-breakable space &amp;nbsp;, and paste and image <img alt="the old way">'`. And what happens? In normal mode the browser should get smart and somehow parse the HTML code guessing what you've ment. But in the new world of XML the smart guy should be you, not the browser. And as the standard postulates for such a filthy markup the browser raises an exception:

The list of possible exceptions (for googlers):

* Firefox 2: An invalid or illegal string was specified
* Firefox 3: Component returned failure code: 0x80004003 (NS_ERROR_INVALID_POINTER) [nsIDOMNSHTMLElement.innerHTML]
* Safari 3: NO_MODIFICATION_ALLOWED_ERR: DOM Exception 7

Opera 9 can parse HTML itself and deserves a great thank you.

### The great Browser

The first obvious and wrong solution which come to mind is to quickly fix the markup with a regular expression.

    rex = /<(img|br|hr|link|input)(.+?)\/?>/g
    markup = markup.replace(rex, '<$1$2/>').replace(/(&amp;nbsp;)/g, '&nbsp;')

And it fixed part of the code. Then I took a look at a list of HTML entities. And then discovered unclosed and overlapping tags. Parser writing enthusiasm has gone. After a tiresome session of thinking I decided to parse HTML on the server side and then send it back serialized as XHTML. At first I liked the idea: originally I'm a backend developer and always thought of a browser as a plain HTML rendering device. Good that I took a closer look.

Closer look helped this time too. Why – I asked myself – to parse HTML on server side with some hacky library when I've got the best HTML parser ever… browser actually. As this question had no sane answer I decided to parse HTML on client side. But wait, where is the skittish HTML parser hiding from the tyrannical XML regime?

Little excursus here. Why — may you ask — is my HTML so badly formatted? It's simple, we want to have the raw RSS stream rendered as livejournal.com serves it.

Back to the subject. Where is the HTML parser hiding with all this XHTML around? It's impossible to get HTML parser in Firefox straight away. Nothing found by googling for "new HTMLDocument()" in WebKit or Opera, but I did not insist on result as my favourite Firefox had failed. `XMLParser`, as red from the name, can parse XML only (however, this could be XUL, MathML, SVG, etc). One can create a new document using `document.implementation.createDocument(…)`, but it going to be XHTML document. This construction `(new DOMParser()).parseFromString("...", "text/html")` will fail too, as far as `DOMParser` does not inplement `text/html` telling it openly with exception: "not implemented".

After got tired playing with cool technology I decided to try the simplest one — hidden iframe with ordinary HTML file. As expected the `window.onload` event is triggered when the page is fully loaded including the iframe. Also, the iframe could be added dynamically (it's DHTML, baby), but in this case the `onload` even may raise to early when the iframe is not yet loaded. And, finally, the treasure is mine: an HTML `document` which can actually parse HTML. Hooray!

How does it look in code? The same as usual:


    var html = $('htmliframe').contentDocument.firstChild
    html.innerHTML = '<div>' + markup + '</div>'

Native dear front… The rest is simple: extract the resulting DOM tree and append to a destination point.

    // clean up the destination node
    while (destination.firstChild)
      destination.removeChild(destination.firstChild)
    // clone the DOM tree (in this case div with children nodes)
    clone = html.firstChild.cloneNode(true)
    // finally, append
    content.appendChild(clone)

In future versions, perhaps, browsers would require node adaptation (across documents) like this `clone = document.adoptNode(clone)`, but for now they swear at `adoptNode()`.

### Summary

HTML is parable and renderable in Firefox 2, 3 and Safari 3. Opera 9 is itself capable. IE and Safari 2 cannot into XHTML completely, but can into client side XSL using xml-stylesheet. So, I put the bridge from HTML to XML as been built.
