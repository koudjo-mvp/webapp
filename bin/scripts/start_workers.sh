#!/usr/bin/env bash

celeryloglevel=$WEBAPP_LOGLEVEL
celerynbthreads=$WEBAPP_CELERYNBTHREADS

if [ "$1" = "dev" ]; then
    if [ -f "w1watcher.pid" ] || [ -f "w2watcher.pid" ] || [ -f "w3watcher.pid" ]; then
        ./stop_workers.sh
    fi
    echo "starting workers with auto-restart activated. Workers will restart automatically each time you create/update your provider interface script ./{providername}_src/tasks.py"
    nohup watchmedo auto-restart -R -d . -d ../api -p '*.py' -i '*.pyc' -- celery multi restart w1 -A celeryinstance -Q ondemand_channel --concurrency=$celerynbthreads -l $celeryloglevel --logfile=../../logs/%n%I.log &
    echo $! > w1watcher.pid
    sleep 2
    nohup watchmedo auto-restart -R -d . -d ../api -p '*.py' -i '*.pyc' -- celery multi restart w3 -A celeryinstance -Q cron_channel --concurrency=$celerynbthreads -l $celeryloglevel --logfile=../../logs/%n%I.log &
    echo $! > w3watcher.pid
else
    echo "starting workers for production"
    celery multi start w1 -A celeryinstance -Q ondemand_channel --concurrency=$celerynbthreads -l $celeryloglevel --pidfile=%n.pid --logfile=../../logs/%n%I.log
    celery multi start w2 -A celeryinstance -Q cron_channel --concurrency=$celerynbthreads -l $celeryloglevel --pidfile=%n.pid --logfile=../../logs/%n%I.log
fi
echo "starting the cron job scheduler process"
python app_scheduler.py &