#!/bin/sh
# Bump the ?v= cache-buster on every js/*.js tag in index.html (GitHub Pages caches files for 10 minutes).
# Run before committing a release:  sh tools/stamp.sh
cd "$(dirname "$0")/.." || exit 1
v=$(date +%Y%m%d%H%M)
sed -i.bak -E "s#(js/[a-z]+\.js)\?v=[0-9a-z]+#\1?v=$v#g" index.html && rm -f index.html.bak
echo "scripts stamped v=$v"
