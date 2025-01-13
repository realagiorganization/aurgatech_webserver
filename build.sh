#!/bin/bash
BASEDIR=$(dirname "$0")
cd $BASEDIR
BASEDIR=`pwd`

# Check if the operating system is macOS (OSX)
if [[ "$OSTYPE" == "darwin"* ]]; then
  bash ./web.app/osx.sh
else
  bash ./web.app/linux.sh
fi

cd $BASEDIR
docker build -t aurga/web.app:latest -f Dockerfile .