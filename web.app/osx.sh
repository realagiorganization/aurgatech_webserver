#!/bin/bash
BASEDIR=$(dirname "$0")
cd $BASEDIR
BASEDIR=`pwd`

sed -i '' "s/IS_APP.*/IS_APP : false,/" src/utils/config.ts
npm install
npx vite build

rm -rf $BASEDIR/..web.api/wwwroot
mkdir -p $BASEDIR/../web.api/wwwroot
cp -r $BASEDIR/dist/* $BASEDIR/../web.api/wwwroot