#!/usr/bin/env bash

celery flower --broker='amqp://titus:pinotnoir@localhost:5672//' > ../../logs/flower_stdout.log 2>../../logs/flower_stderr.log &
echo $! > flower.pid