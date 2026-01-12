#!/bin/sh
if [ -z "$HUSKY" ]; then
  export HUSKY=0
fi

command_exists () {
  command -v "$1" >/dev/null 2>&1
}

if ! command_exists node; then
  echo "husky - node not found in PATH" >&2
  exit 1
fi

if [ "$HUSKY" = "0" ]; then
  exit 0
fi
