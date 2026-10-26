#!/usr/bin/env bash
# usage: run-daisy-bug.sh <bug-id> <base_sha> <fix_sha>
set -e
ID=$1; B=$2; F=$3; D=bench/bugs/$ID; W=bench/_work
bench/tools/build-daisy.sh "$B" $W/$ID-buggy.css
bench/tools/build-daisy.sh "$F" $W/$ID-fixed.css
echo "$ID buggy: $(node bench/lib/harness.mjs $D $W/$ID-buggy.css $D/out/buggy.png)"
echo "$ID fixed: $(node bench/lib/harness.mjs $D $W/$ID-fixed.css $D/out/fixed.png)"
