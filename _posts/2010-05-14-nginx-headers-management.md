---
title: "Notes on HTTP headers management in nginx"
description: "Trying to express complex things in English."
categories: [backend, nginx]
layout: post
time: 19:14:35
---

As a result of writing [request headers management](https://github.com/peter-leonov/ngx_http_js_module/tree/master/src/classes/Request) code got this short article written.

This post is also available on the nginx wiki at [HeadersManagement](https://www.nginx.com/resources/wiki/start/topics/examples/headers_management/).

## Intro

As far as the [Nginx.HeadersIn](https://github.com/peter-leonov/ngx_http_js_module/blob/master/src/classes/Request/HeadersIn.c) and [Nginx.HeadersOut](https://github.com/peter-leonov/ngx_http_js_module/blob/master/src/classes/Request/HeadersOut.c) classes of the [ngx_http_js_module](https://github.com/peter-leonov/ngx_http_js_module/) implemented almost fully now we can talk about this `headers_in` struct a little.

The HTTP headers in nginx are split in two parts: the input request headers ([`headers_in`](http://lxr.evanmiller.org/http/source/http/ngx_http_request.h#L162) structure) and the output request headers ([`headers_out`](http://lxr.evanmiller.org/http/source/http/ngx_http_request.h#L227) structure). There is no such an entity as a response, all data is stored in the same single request structure. The actual response data is constructed from the request data and the `headers_out` structure fields.

All the things in nginx are highly optimized. No memory overhead caused by strings copying, no memory leaks and alloc/free burden as far as memory is managed with pools, no wasted CPU cycles by comparing those strings again and again, everything is cached in a sane way, complicated things are pre-calculated at configure stage. So are the input (and output) headers and all this optimizations are the root of their complexity and beauty.

## A flexibility of the HTTP headers

Lets talk about HTTP headers a little. All of us have seen lots of headers. And we know that the HTTP header is a very flexible data format. Client may send only one simple header, or many headers with the same name each on its own line, or even one big header split into many lines. It's a kinda mess. And nginx in its turn tries to rule the mess.

nginx takes care of known frequently used headers ([list of known `headers_in`](http://lxr.evanmiller.org/http/source/http/ngx_http_request.c#L80)). It parses it and stores in the handy place (direct pointer in `headers_in`). If a known header may consist of more then one value (Cookies or Cache-Control for example.) nginx could handle it with an array. And for a header that known to have a numeric value (Content-Length, Expires) nginx will parse the text and store it directly in the `headers_in` struct. All the rest of headers are carefully stored in a simple list within the `headers_in` structure, so nothing is been lost.


## Get the header

That said, there are at least three ways to get the value. As we already know, every input header value may be obtained by a brute force lookup in the [`headers_in->headers`](http://lxr.evanmiller.org/http/source/http/ngx_http_request.h#L163) list (typeof [`ngx_list_t`](http://lxr.evanmiller.org/http/ident?i=ngx_list_t)). The known header value may be found with a help of a simple pointer in the `headers_in` structure (`NULL` if the header does not exists). And for the known numeric headers there is even easier way to get the value: by a special field in the `headers_in` ([`content_length_n`](http://lxr.evanmiller.org/http/source/http/ngx_http_request.h#L214) is a good example).

This is good if you know at compile time which header you are going to read. But how do we get the header by its name at run time where the name is just a string? For this kind of situation we have a smart hash of headers ???. If the header is known to nginx the header name is cached within this hash and we can find the header value relatively fast. If the header hasn't been hashed we'll have to run through the full headers list and compare all headers names with our one. This isn't very fast but also isn't slow. Unfortunately, there is no way to get the offset of the digital (already parsed) representation of the header by its name, we have to parse text value every time it's needed. And it's normal while we do not know the data type of the representation of a random header at run time.

So far, we can get a full list of input headers and run through it to enumerate, direct access a header with its personal field in `headers_in` structure; and we even may get the already parsed value if the header is of type number, time etc.


Some examples follow.

## Brute force search for one header with the specified name

    static ngx_table_elt_t *
    search_headers_in(ngx_http_request_t *r, u_char *name, size_t len) {
        ngx_list_part_t            *part;
        ngx_table_elt_t            *h;
        ngx_uint_t                  i;
        
        /*
        Get the first part of the list. There is usual only one part.
        */
        part = &r->headers_in.headers.part;
        h = part->elts;
        
        /*
        Headers list array may consist of more than one part,
        so loop through all of it
        */
        for (i = 0; /* void */ ; i++) {
            if (i >= part->nelts) {
                if (part->next == NULL) {
                    /* The last part, search is done. */
                    break;
                }
                
                part = part->next;
                h = part->elts;
                i = 0;
            }
            
            /*
            Just compare the lengths and then the names case insensitively.
            */
            if (len != h[i].key.len || ngx_strcasecmp(name, h[i].key.data) != 0) {
                /* This header doesn't match. */
                continue;
            }
            
            /*
            Ta-da, we got one!
            Note, we'v stop the search at the first matched header
            while more then one header may fit.
            */
            return &h[i];
        }
        
        /*
        No headers was found
        */
        return NULL;
    }

## Quick search with hash

    ngx_table_elt_t *
    search_hashed_headers_in(ngx_http_request_t *r, u_char *name, size_t len) {
        ngx_http_core_main_conf_t  *cmcf;
        ngx_http_header_t          *hh;
        u_char                     *lowcase_key;
        ngx_uint_t                  i, hash;

        /*
        Header names are case-insensitive, so have been hashed by lowercases key
        */
        lowcase_key = ngx_palloc(r->pool, len);
        if (lowcase_key == NULL) {
            return NULL;
        }
        
        /*
        Calculate a hash of lowercased header name
        */
        hash = 0;
        for (i = 0; i < len; i++) {
            lowcase_key[i] = ngx_tolower(name[i]);
            hash = ngx_hash(hash, lowcase_key[i]);
        }
        
        /*
        The layout of hashed headers is stored in ngx_http_core_module main config.
        All the hashes, its offsets and handlers are pre-calculated
        at the configuration time in ngx_http_init_headers_in_hash() at ngx_http.c:432
        with data from ngx_http_headers_in at ngx_http_request.c:80.
        */
        cmcf = ngx_http_get_module_main_conf(r, ngx_http_core_module);
        
        /*
        Find the current header description (ngx_http_header_t) by its hash
        */
        hh = ngx_hash_find(&cmcf->headers_in_hash, hash, lowcase_key, len);
        
        if (hh == NULL) {
            /*
            There header is unknown or is not hashed yet.
            */
            return NULL;
        }
        
        if (hh->offset == 0) {
            /*
            There header is hashed but not cached yet for some reason.
            */
            return NULL;
        }
        
        /*
        The header value was already cached in some field
        of the r->headers_in struct (hh->offset tells in which one).
        */
            
        return *((ngx_table_elt_t **) ((char *) &r->headers_in + hh->offset));
    }

## Blazing fast header access with a structure field

    ngx_table_elt_t *
    get_host_from_headers_in(ngx_http_request_t *r) {
        /*
        Returns NULL if there is no such a header.
        */
        return r->headers_in.host;
    }

## Blazing crazy fast header access with a pre-parsed value

    off_t
    get_content_length_n_from_headers_in(ngx_http_request_t *r) {
        /*
        Returns -1 if the Content-Length wasn't set.
        */
        return r->headers_in.content_length_n;
    }



The examples give a good illustration for how much faster the cached and optimized header access may be even compared to the search with a pre-hashed key.

## How does hashed search work?

At the configuration stage nginx creates a hash ([`ngx_hash_t`](http://lxr.evanmiller.org/http/ident?i=ngx_hash_t)) of known HTTP headers (as mentioned above). In each pair the key is a the header name and the value is a nginx header handler structure (pretty smart structure, you know). In this structure we can see the header name, its handler on a stage of headers parsing (for internal use) and, the most interesting, the offset of the header value in the headers_in struct. This offset is used to fill the appropriate field in the request struct when the request value is been adding. At the parsing stage nginx calculates a hash of the lowercased header name (HTTP headers names are case-insensitive) and searches the header handler by this hash (in main conf headers has). If the handler is found nginx invokes it, otherwise just adds the key/value pair to the plain list of headers (`headers_in.headers`). Pretty simple if you know how it' made ;)

## What about output headers?

If you've red the post you do know almost everything about `headers_out`. The only difference is the headers_out hasn't a hash to find the output header by its name at runtime.

## How can I set a header?

As far as nginx may store a header value in many places you have to be careful setting a header. Every known header needs a special way to be set. If it is a numeric header you could set it three times: a plain key/value pair in the list, the pointer in `headers_in` struct and the actual numeric value in the special field of `headers_in`. Every step reflects the way you get the header value.

For example set the Content-Length in `headers_out`

    ngx_int_t
    set_content_length_n_in_headers_out(ngx_http_request_t *r, ngx_str_t *length, off_t length_n) {
        ngx_table_elt_t   *h;
        
        h = r->headers_out.content_length;
        if (h == NULL) {
            /*
            The header is not present at all. We have to allocate it...
            */
            h = ngx_list_push(&r->headers_out.headers);
            if (h == NULL) {
                return NGX_ERROR;
            }
            
            /*
            ... setup the header key ...
            */
            h->key.data = (u_char *) "Content-Length";
            h->key.len = sizeof("Content-Length") - 1;
            
            /*
            ... and then set the headers_out field to tell others
            that the header is already set.
            */
            r->headers_out.content_length = h;
        }
        
        /*
        So far we have the header and are able to set its value.
        Do not forget to allocate the length.data memory in such
        place where the memory will survive till the request ends.
        The best place to store the data is the request pool (r->pool),
        of course.
        */
        h->value = *length;
        
        /*
        This trick tells ngx_http_header_module to reflect the header value
        in the actual response. Otherwise the header will be ignored and client
        will never see it. To date the value must be just non zero.
        */
        h->hash = 1;
        
        /*
        And do not forget to set up the numeric field.
        */
        r->headers_out.content_length_n = length_n;
        
        return NGX_OK;
    }

Unknown headers (custom ones) may be just pushed to the list (`headers_out.headers`).

    ngx_int_t
    set_custom_header_in_headers_out(ngx_http_request_t *r, ngx_str_t *key, ngx_str_t *value) {
        ngx_table_elt_t   *h;
        
        /*
        All we have to do is just to allocate the header...
        */
        h = ngx_list_push(&r->headers_out.headers);
        if (h == NULL) {
            return NGX_ERROR;
        }
        
        /*
        ... setup the header key ...
        */
        h->key = *key;
        
        /*
        ... and the value.
        */
        h->value = *value;
        
        /*
        Mark the header as not deleted.
        */
        h->hash = 1;
        
        return NGX_OK;
    }

## Coming soon

In the next post (whenever it posted) we will look at the real code of header management from the [ngx_http_js_module](https://github.com/peter-leonov/ngx_http_js_module/). It is much more fun to see some working stuff instead of cold examples.
