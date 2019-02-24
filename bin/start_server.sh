#!/usr/bin/env bash

nohup node www > ../logs/server_stdout.log 2>../logs/server_stderr.log &
echo $! > server.pid