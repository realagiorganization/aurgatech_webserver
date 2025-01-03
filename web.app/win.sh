#!/bin/bash
BASEDIR=$(dirname "$0")
cd $BASEDIR
BASEDIR=`pwd`

rm -rf $BASEDIR/..web.api/wwwroot
mkdir -p $BASEDIR/../web.api/wwwroot
cp -r $BASEDIR/dist/* $BASEDIR/../web.api/wwwroot
