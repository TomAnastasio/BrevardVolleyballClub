#!/bin/sh
# usage: lbuild.sh OUT.html   (the locker mockup: wardrobe + transformation data, then locker.js)
here=$(dirname "$0"); out=$1
{ cat "$here/ltop.html"; echo "<script>"; echo "(() => {"; cat "$here/engine.js" "$here/xcore.js"; for f in head shirt pants shoes shoes-slime xe1 xe2 xl1 xl2; do cat "$here/data/$f.js"; done; cat "$here/locker.js"; echo "})();"; echo "</script>"; } > "$out"
