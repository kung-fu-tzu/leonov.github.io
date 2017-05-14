---
title: "A truely dockerized app"
description: "What it is and how to verify mine?"
categories: [backend, docker, git]
layout: post
lang: en
---


Docker. We all think we know what it does, but it always does it differently than we expect. If one says they use Docker in their development or production process this might mean anything. 

## Docker use cases

Which are not truly dockerized.

1. Docker as app launcher

Here one bundles a tool like [Screen Diff](https://github.com/peter-leonov/screen-diff) or an application like [Chrome](https://github.com/c0b/chrome-in-docker) in a truly Docker-way. But to do anything meaningful such an app needs volumes get passed from a host machine (do not mess with normal encapsulated Docker volumes) into a container with `-v` option. This makes the container impure and not ready to run in, say, Docker Swarm.

2. Docker as tests runner

In my experience this means that the whole project gets run in a single docker container which downloads source code itself having all the needed credentials, builds the project installing any software needed and then runs the test suit reporting to some external to the docker ecosystem tool.

3. Docker as dev server environment

Simple. To develop inside a container one would need to pass a source code from a developer machine (on Mac OS first it needs to get passed to a [HyperKit based VM](https://docs.docker.com/docker-for-mac/docker-toolbox/#the-docker-for-mac-environment) then in linux inside it and only then to the actual container) using again that `-v` option.

4. Docker in production but just as a chroot

Some use docker as a replacement for `apt-get` and `chroot`. They `ssh` into the production server, `cd` into the application folder and run `docker-compose up -d` with all possible `-v`, `-p` etc. encapsulation violations possible. With this they get predictability of a dockerized app, but…

## Truly dockerized app

…but all of these examples are valid and awesome usages of docker which I'm really happy about, but they should not be called truly dockerized.

So, what the truly dockerized app is? As with monads there is a mantra with two laws of a truly dockerized app:

1. Containers are pure functions of Dockerfiles;
2. They should be runnable using any Docker Daemon socket.

As with monads if you do not know what it is the laws do not help much with understanding, but if you are going to tell someone that your App is truly dockerized, just check with these two rules and you're ready to be proud of winning any holy war.

The rule of thumb is: your app is fully dockerized if all you need to run it is just a [docker daemon socket](https://docs.docker.com/engine/reference/commandline/dockerd/#daemon-socket-option) be it your host Linux, a single docker machine in DigitalOcean or a huge Docker Swarm on AWS.

P.S. The whole state of the whole your App should be stored in [Volumes](https://docs.docker.com/engine/tutorials/dockervolumes/) or in an external database service, but never in host machine dependent infrastructure. Save kittens!
