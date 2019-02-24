#!/usr/bin/env bash

celeryloglevel=$WEBAPP_LOGLEVEL

if [ -f "scheduler.pid" ]; then
    bpid=$(cat scheduler.pid)
    echo "stopping the cron job scheduler process $bpid."
    kill -USR1 $bpid
    rm scheduler.pid
fi

echo "stopping celery nodes."

if [ -f "w1watcher.pid" ]; then
    wid=$(cat w1watcher.pid)
    kill -9 $wid
    rm  w1watcher.pid
fi
if [ -f "w2watcher.pid" ]; then
    wid=$(cat w2watcher.pid)
    kill -9 $wid
    rm w2watcher.pid
fi

celery multi stopwait w1 -A celeryinstance -Q:ondemand_channel -l $celeryloglevel
celery multi stopwait w2 -A celeryinstance -Q:cron_channel -l $celeryloglevel
