#!/usr/bin/env bash
# usage: build-pico.sh <git-sha> <out.css>  : compile picocss/pico scss at a commit with the repo-level sass (cached clone in bench/_work/pico-src)
set -e
SHA=$1; OUT=$2; SRC=bench/_work/pico-src
if [ ! -d "$SRC/.git" ]; then mkdir -p "$SRC"; (cd "$SRC" && git init -q && git remote add origin https://github.com/picocss/pico.git); fi
(cd "$SRC" && git fetch -q --depth 1 origin "$SHA" && git checkout -q -f FETCH_HEAD)
node node_modules/sass/sass.js --no-source-map --load-path="$SRC/scss" "$SRC/scss/pico.scss" "$OUT"
