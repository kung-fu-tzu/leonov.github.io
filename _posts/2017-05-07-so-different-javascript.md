---
title: "So different JavaScript"
description: "JavaScript welcomes everybody with any background."
categories: [frontend, javascript]
layout: post
lang: en
---

15 years together and still married… and still fighting 😂

## 2000: Good old C-like style

    function url_encode (data) {
      var str = "";
      var first = true;
      for (var k in data) {
        if (!first) {
          str = str + "&";
        }
        str = str + escape(k);
        str = str + "=";
        str = str + escape(data[k]);
        first = false;
      }
      return str;
    }

## 2005: prototype.js and Ext.js are hot

    UrlEncode.stringify = function (data) {
      var
        encode = window.encodeURIComponent,
        pairs = [],
        v, k;

      for (k in data) {
        v = data[k];
        k = encode(k);
        v = encode(v);
        pairs.push(k + '=' + v);
      }

      return pairs.join('&');
    }

## 2010: JavaWhat? jQuery!

    $.param()

## 2015: Babel Reacts to Elm Flow

    // let
    const encodePairs = map(map(encodeURIComponent))
    const packPairs = map(join('='))
    const packFragments = join('&')
    // in
    export const stringify = compose(packFragments, packPairs, encodePairs, toPairs)

## 2020: Elm? WebAssembly?

Tell us, future me!

**UPDATE 2024**: [finally](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams/URLSearchParams)

    new URLSearchParams(params).toString()
