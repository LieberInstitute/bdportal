#!/bin/bash
set -euo pipefail

snippet_src="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/bdportal-api-locations.conf"
nginx_snippet="/etc/nginx/snippets/app_dirs.conf"
backup="${nginx_snippet}.$(date +%Y%m%d-%H%M%S).bak"

if [[ ! -f "$snippet_src" ]]; then
  echo "Missing proxy snippet: $snippet_src" >&2
  exit 1
fi

if sudo grep -q "location \\^~ /bdportal/api/" "$nginx_snippet"; then
  echo "bdportal API proxy locations already installed in $nginx_snippet"
else
  sudo cp "$nginx_snippet" "$backup"
  tmpfile="$(mktemp)"
  awk -v insert_file="$snippet_src" '
    BEGIN {
      inserted = 0
      while ((getline line < insert_file) > 0) {
        insert = insert line "\n"
      }
      close(insert_file)
    }
    inserted == 0 && $0 ~ /## bdportal/ {
      printf "%s\n", insert
      inserted = 1
    }
    { print }
    END {
      if (inserted == 0) {
        exit 2
      }
    }
  ' "$nginx_snippet" > "$tmpfile" || {
    rm -f "$tmpfile"
    echo "Could not find bdportal insertion point in $nginx_snippet" >&2
    exit 1
  }
  sudo cp "$tmpfile" "$nginx_snippet"
  rm -f "$tmpfile"
  echo "Installed bdportal API proxy locations; backup: $backup"
fi

sudo nginx -t
sudo systemctl reload nginx
echo "nginx reloaded"
