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
      var flag = false;
      for (var k in data) {
        str = str + escape(k);
        str = str + "=";
        str = str + escape(data[k]);
        str = str + "&";
        flag = true;
      }
      if (flag) {
        str = str.substr(0, str.length-1);
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
        pairs.push(k + '=' + encode(v));
      }
      
      return pairs.join('&');
    }


## 2010: JavaWhat? jQuery!

    $.param()


## 2015: 

    // let
    const encodePairs = map(map(encodeURIComponent))
    const packPairs = map(join('='))
    const packFragments = join('&')
    // in
    export const stringify = compose(packFragments, packPairs, encodePairs, toPairs)


## 2020: Haskell on WebAssembly?

Tell us, future me!
