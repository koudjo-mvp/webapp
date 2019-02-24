#!/usr/bin/env bash

pid=$(cat flower.pid)
echo "stopping flower monitoring process $pid."
kill -9 $pid
rm flower.pid