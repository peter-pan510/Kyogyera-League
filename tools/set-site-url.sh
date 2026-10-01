#!/usr/bin/env sh
# Moves the site to a new address: QR codes, link previews, Google tags, sitemap and robots.txt.
# Usage (from the project folder):  sh tools/set-site-url.sh https://your-new-address/
set -e
url="$1"
case "$url" in
  http*://*) ;;
  *) echo "Usage: sh tools/set-site-url.sh https://your-new-address/"; exit 1 ;;
esac
case "$url" in */) ;; *) url="$url/" ;; esac
cd "$(dirname "$0")/.."
old=$(sed -n "s/^ *SITE_URL: '\([^']*\)'.*/\1/p" config.js)
[ -n "$old" ] || { echo "Could not find SITE_URL in config.js"; exit 1; }
for f in *.html robots.txt sitemap.xml config.js; do
  sed -i.bak "s#${old}#${url}#g" "$f" && rm -f "$f.bak"
done
echo "Site address changed from ${old} to ${url}"
