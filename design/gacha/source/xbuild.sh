#!/bin/sh
# usage: xbuild.sh OUT.html [data files...]   (defaults to the four transformation files)
here=$(dirname "$0"); out=$1; shift
[ $# -eq 0 ] && set -- "$here/data/xe1.js" "$here/data/xe2.js" "$here/data/xl1.js" "$here/data/xl2.js"
{ cat "$here/xtop.html"; echo "<script>"; echo "(() => {"; cat "$here/engine.js" "$here/xcore.js"; for f in "$@"; do [ -f "$f" ] && cat "$f"; done; cat "$here/xpage.js"; echo "})();"; echo "</script>"; } > "$out"
