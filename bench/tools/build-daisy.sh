#!/usr/bin/env bash
# usage: build-daisy.sh <git-sha> <out.css>   (clone cached in bench/_work/daisyui-src)
# Toolchain shim: older daisyUI commits call fs.rmdir(path,{recursive:true}), which Node 24/Bun 1.4 removed.
# We replace it with fs.rm(...) in the build helper only; this does not touch any CSS source.
set -e
SHA=$1; OUT=$2; SRC=bench/_work/daisyui-src
if [ ! -d "$SRC/.git" ]; then mkdir -p "$SRC"; (cd "$SRC" && git init -q && git remote add origin https://github.com/saadeghi/daisyui.git); fi
(cd "$SRC" && git fetch -q --depth 1 origin "$SHA" && git checkout -q -f FETCH_HEAD)
sed -i 's/fs\.rmdir(itemPath, { recursive: true })/fs.rm(itemPath, { recursive: true, force: true })/' "$SRC/packages/daisyui/functions/removeFiles.js"
(cd "$SRC" && bun install --frozen-lockfile >/dev/null 2>&1)
(cd "$SRC/packages/daisyui" && bun run build >bench-build.log 2>&1) || { tail -5 "$SRC/packages/daisyui/bench-build.log" >&2; exit 1; }
cp "$SRC/packages/daisyui/daisyui.css" "$OUT"
