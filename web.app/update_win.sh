#!/bin/bash
BASEDIR=$(dirname "$0")
cd $BASEDIR
BASEDIR=`pwd`

sed -i "s/IS_APP.*/IS_APP : false,/" src/utils/config.ts