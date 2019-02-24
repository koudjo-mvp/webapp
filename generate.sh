#!/usr/bin/env bash
usage() {
        echo "usage: generate <new_app_name> <init-releaseversion> <init-buildversion>"
}

if [ $# -ne 3 ]; then
        usage
        exit 1
fi

cd ..
if [ -d "$1" ]; then
    cd $1
    pm2 stop webapp_restapi
    pm2 stop webapp_scheduler
    webapp_workerm
    webapp_worker1
    webapp_worker2
    cd bin/scripts
    ./stop_workers.sh
    cd ../../..
    rm -rf "$1"
fi

mv webapp $1
cd $1
rm -rf .git
chmod -R 755 *.sh refactor build ./bin/*.sh ./bin/scripts/*.sh
./refactor $1 $2 $3
npm install
python install -r requirements.txt
pm2 start ./ecosystem.config.js

