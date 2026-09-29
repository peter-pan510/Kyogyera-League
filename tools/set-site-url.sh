#!/usr/bin/env sh
# Puts your real site address into the link-preview tags of every page.
# Usage (from the project folder):  sh tools/set-site-url.sh https://yourname.github.io/kyogyera-league/
set -e
url="$1"
case "$url" in
  http*://*) ;;
  *) echo "Usage: sh tools/set-site-url.sh https://yourname.github.io/kyogyera-league/"; exit 1 ;;
esac
case "$url" in */) ;; *) url="$url/" ;; esac
cd "$(dirname "$0")/.."
for f in *.html; do
  sed -i.bak -E "s#(content=\")https?://[^\"]*/(${f}|assets/og-image\.jpg)\"#\1${url}\2\"#g" "$f" && rm -f "$f.bak"
done
echo "Link previews now point to ${url}"
