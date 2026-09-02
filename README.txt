VELORA — running this site
===========================

Just open index.html
---------------------
Double-click index.html and it works — in Chrome, in Firefox, with
no internet connection and no local server required.

Why that's true now
--------------------
The chocolate reveal used to be built with three.js, loaded from a
CDN via <script type="module">. That's a real WebGL 3D engine, but
it depends on two things a visitor doesn't control: their network
reaching the CDN, and Chrome's policy of refusing to load module
scripts from a page opened directly as a file (a security
restriction on file:// pages, not a bug in the site).

The product visuals are now built entirely with native CSS 3D
transforms (perspective, preserve-3d, rotateX/Y, translateZ) in
main.js — no three.js, no CDN, no build step, no <script
type="module">. It's plain, synchronous JavaScript and CSS, so it
renders the instant the page loads, everywhere, every time.

What's on the page
-------------------
- site.js   — intro sequence, navigation, contact form, scroll reveals
- main.js   — the 3D chocolate bar + foil wrapper (hero, the scroll
              story, and the 3 collection cards)
- cart.js   — cart drawer, quantity controls, checkout, order confirmation
- index.html / the <style> block — layout, theme, and the CSS 3D rules

A local server (e.g. `python3 -m http.server 5501`, or the included
Live Server config) still works exactly the same if you prefer one —
it's just no longer required for anything to show up.
