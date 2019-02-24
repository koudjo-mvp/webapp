#!/usr/bin/env bash

pid=$(cat server.pid)
echo "stopping the nodejs process $pid."
kill -9 $pid
rm server.pid