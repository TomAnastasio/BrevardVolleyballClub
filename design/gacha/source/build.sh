#!/bin/sh
# usage: build.sh OUT.html [data files...]   (defaults to all four slots)
here=$(dirname "$0"); out=$1; shift  # data files live in ./data
[ $# -eq 0 ] && set -- "$here/data/head.js" "$here/data/shirt.js" "$here/data/pants.js" "$here/data/shoes.js" "$here/data/shoes-slime.js"
{ cat "$here/top.html"; echo "<script>"; echo "(() => {"; cat "$here/engine.js"; for f in "$@"; do [ -f "$f" ] && cat "$f"; done; cat "$here/boot.js"; echo "})();"; echo "</script>"; } > "$out"
