# Appjet.jar

All the software you need to host AppJet apps.

This repository hosts sources of the original Appjet.jar web application framework and our additions to it. You will find everything needed to run 
Appjet apps locally or to host them on your own server. This is the same version of the framework that is running 
on <http://apps.jgate.de> where you can also host your appjet applications. 

## Download

[appjet-1.0.4.jar](http://static.jgate.de/jar/appjet-1.0.4.jar)  --  Dec 12 2010 20:47:10 GMT+0100

## Requirements

Java 1.6 or higher
Mac OS X: You will need to [update to the latest Java](http://www.apple.com/support/downloads/javaformacosx105update1.html) (requires OS X 10.5) 
and then configure Java Preferences according to [these instructions](http://www.metaphoriclabs.com/articles/installing-java-6-on-mac-os-x/).
Windows or Linux: You can get Java 1.6 from Sun.

## Installation instructions

Just put the jar file somewhere accessible from the command prompt.

## Running an application

	$ java -jar appjet-1.0.4.jar myapp.js
	
That's it! _myapp.js_ should contain the same JavaScript code that you would use for an app hosted on apps.jgate.de.

For [full instructions](http://github.com/dvbportal/appjet/wiki/Running-An-Appjet-App) have a look at the wiki.

## Contributing to Appjet.jar

You can find an introduction to the source code [here](http://github.com/dvbportal/appjet/wiki/An-Introduction-to-the-Appjet-Source).
Bugs and pending features are on our [issue tracker](https://github.com/dvbportal/appjet/issues). 
A step-by-step guide to development using git can be found [here](http://github.com/dvbportal/appjet/wiki/Git-Workflow).

Please make your changes in a branch to ensure that new commits to your master are 
not included in the pull request, and to make it easier for us to merge your commits.

Please do not rebase our tree into yours.
See [here](http://www.mail-archive.com/dri-devel@lists.sourceforge.net/msg39091.html)
for when to rebase.

## Resources

Here is our [bug tracker](https://github.com/dvbportal/appjet/issues) and our
[roadmap](https://github.com/dvbportal/appjet/wiki/Appjet-Roadmap-and-Wishlist).


More general info and updates about the project can be found on
[our blog](http://blog.jgate.de).

