---
title: "Linux Containers (lxc) in Linode (xen)"
description: "Virtualization squared."
categories: [backend, linux, vps, linode]
layout: post
lang: en
---

Starting with Ubuntu 12.04 it is quite simple to create Linux Containers (aka LXC). As an OpenVZ fan and virtualization lover in general I've been watching for LXC to come to life for a couple of years. Finally, the Containers become ready to use out of the box.

*BTW, Solaris and FreeBSD had this for ever.*

Prodrome
--------

For years virtualization has been an ordinary thing. Everyone is able to buy a dedicated hardware server, install a beloved flavor of linux, set up a VM of some sort (VMWare Player, then XEN, then OpenVZ, then KVM) and then get a para-semi-virtualized box. The deal was to get a modern CPU and/or a custom kernel with para/virtualization support. All with an administration burden, old untrusted hardware, home brew backups and so on.

With simplicity in mind all this hardcore administration stuff looks like an overkill. Until now.


Linode
------

First of all, creating a linode server is simple. And fast. And ping is low. And all.

And they have a cheap and automated backup. And cloning. And debugging. And console. And all.

And you can install vanilla (with xen support) kernel in a linode. So…


LXC
---

On an ordinary ubuntu box the LXC are `apt-get` away, and just two `apt-get`s away on a linode box. The extra work is just an installation of the [virtual kernel](http://packages.ubuntu.com/precise/linux-virtual). Lets go install and boot it.


Virtual kernel
--------------

First of all:

	sudo apt-get update && sudo apt-get upgrade

Then install lxc userland tools:

	sudo apt-get install lxc
	# >>> lots of dependencies here

Here we able to check the kernel for lxc support:

	sudo lxc-checkconfig
	# >>> some green, some yellow, and a few red words

For lxc to smoothly work everything must be green, but linode's kernel isn't. So install the stock kernel. Linode runs XEN so we need a virtual environments ready kernel:

	sudo apt-get install linux-virtual
	# >>> few dependencies such as headers and docs

We have an up to date ubuntu kernel installed so far.

By default linode boots its own XEN-ready kernel from outer space. That means, to get the new LXC-enabled kernel a simple reboot is not enough. The way to tell linode to boot our own kernel is a [PV-GRUB](http://www.linode.com/wiki/index.php/PV-GRUB). It's just a kernel loader based on grub configs, AFAIK, standard to XEN.

Install grub scripts (without grub itself):

	sudo apt-get install grub-legacy-ec2
	# in the menu I select xvda

Then patch `/boot/grub/menu.lst` by hand:

	- # defoptions=console=hvc0
	+ # defoptions=console=hvc0 rootflags=nobarrier

And then:

	sudo update-grub-legacy-ec2

OK, system is ready to be booted with a new kernel. Finish by asking linode to use PV-GRUB:

> Enter Linode Configuration Profile in your Linode Manager. Change Kernel to pv-grub-x86_32 or pv-grub-x86_64, depending on installed kernel and userspace.

Bitness can be checked with `uname` :

	uname -m

Now save the configuration and reboot the linode.


LXC
---


Having new kernel we can pass the check:

	sudo lxc-checkconfig
	# >>> all green!!!

Take a look at the bridge network for containers:

	ifconfig | grep lxc
	# >>> lxcbr0 ...

All the containers will share this network and go to the internet via its bridge capabilities.

Finally, create a container (ubuntu of course):

	sudo lxc-create -t ubuntu -n demo1
	# >>> lots of packages

Here we got a template downloaded and built:

	sudo du -sh /var/cache/lxc/
	# >>> 363M   /var/cache/lxc/

and the `demo1` container:

	sudo du -sh /var/lib/lxc/demo1/
	# >>> 364M	/var/lib/lxc/demo1/

Start the container:

	sudo lxc-start -n demo1
	# >>> ubuntu/ubuntu

	ping 8.8.8.8
	ping ubuntu.com

Try to exit with Ctrl+A then Q, or close the terminal window.

Re-enter the container with:

	sudo lxc-console -n demo1
	# Ctrl+A then Q to exit
	
	sudo apt-get update && sudo apt-get upgrade

Hooray! We've got a fresh ubuntu container in a linode's XEN virtual machine :)

The last step is to start the container while a linode box starting:

	sudo ln -s /var/lib/lxc/demo1/config /etc/lxc/auto/demo1.conf

Now you may reboot and enter the container:

	sudo lxc-console -n demo1

That's all for now. To fine tune container please read through the [LXC manual](https://help.ubuntu.com/12.04/serverguide/lxc.html).

Have fun!

