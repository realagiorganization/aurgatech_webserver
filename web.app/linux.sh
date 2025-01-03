#!/bin/bash
#set -e

BASEDIR=$(dirname "$0")
cd $BASEDIR
BASEDIR=`pwd`
NVM=`command -v nvm`
NPM=`command -v npm`

# check if nvm exists
if [ "$NPM" = "" ]; then
    if [ "$NVM" = "" ]; then
        echo "nvm is not installed"
        rm -Rf nvm
        git clone --branch v0.40.0 --depth 1 https://github.com/nvm-sh/nvm.git
        cd nvm
        bash install.sh

        source ~/.bashrc
        cd ..
        rm -Rf nvm
    fi

    echo "installing nodejs..."
    nvm install 16
    npm config set registry https://registry.npmmirror.com
fi

set -e

sed -i "s/IS_APP.*/IS_APP : false,/" src/utils/config.ts
npm install
npx vite build

rm -rf $BASEDIR/..web.api/wwwroot
mkdir -p $BASEDIR/../web.api/wwwroot
cp -r $BASEDIR/dist/* $BASEDIR/../web.api/wwwroot