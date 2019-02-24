#!/usr/bin/env python

__author__ = "P.K.V.M. @koudjo-mvp"
# Build v${BUILD-VERSION} #
__version__ = "${BUILD-VERSION}"

# Standard Imports
import os
import sys
import json
import importlib
import signal
import csv
import traceback
import pickle
import pprint
import tarfile,zipfile
import time
import ConfigParser
from pymongo import MongoClient
import logging
import logging.config

#  Imports
if os.environ['WEBAPP_INSTALL_DIR'] is not None:
    extra_pythonpath = os.environ['WEBAPP_INSTALL_DIR']
else:
    raise Exception("WEBAPP_INSTALL_DIR not set")
sys.path.append(extra_pythonpath)
sys.path.append(extra_pythonpath+"/bin")
import api

# logging
logger = logging.getLogger("api")

STOPSCHEDULER = False

def signal_handler(signum, stack):
    logger.info("signal "+str(signum)+" received")
    global STOPSCHEDULER
    STOPSCHEDULER = True

signal.signal(signal.SIGUSR1, signal_handler)
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

def metrics_tag(action, argss, step="queuing", result=""):
    if step == "queuing":
        logger.debug("Queuing task "+action+" for webapp Params passed are: "+str(argss))
    elif step == "ended":
        logger.debug("Task "+action+" "+step+" with result: "+result+", for webapp Params passed are: "+str(argss))
    else:
        raise Exception("step argument must be 'queuing' or 'ended'")

def purge_folder(folder):
    if os.path.isdir(folder):
        out_dir_files = os.listdir(folder)
        for outdir_file in out_dir_files:
            out_dir_fpath = os.sep.join((folder, outdir_file))
            if os.path.isfile(out_dir_fpath):
                os.remove(out_dir_fpath)

def run_task(task,crontasks, table):
    res = None
    try:
        logger.debug(task["args"])
        parameters = json.loads(task["args"])
        purge_folder(parameters["job_request"]["jobdir"])
        jsonfile = parameters["job_request"]["jobdir"] + os.sep + "params.json"
        with open(jsonfile, 'w') as fp:
            json.dump(parameters, fp)
        metrics_tag(task["name"]+'_src.tasks.run',parameters)
        taskmodule = importlib.import_module('scripts.'+task["name"]+'_src.tasks')
        celerytask = getattr(taskmodule, "run")
        res = celerytask.apply_async(args=[parameters["job_request"]["jobid"], jsonfile], queue='cron_channel')
    except Exception as err:
        logger.error(err)
    finally:
        #update the crontask lastrun timestamp
        crontasks.update_one(
            {"name": task["name"]},
            {"$set": {"lastrun": str(time.time())}})
        if res is not None:
            metrics_tag(task["name"]+'_src.tasks.run',parameters,"ended",res.state)
        else:
            metrics_tag(task["name"]+'_src.tasks.run',task["args"],"ended")

def save_pid(pid):
    pidfile = file("scheduler.pid","w")
    try:
        pidfile.write(pid)
    finally:
        pidfile.close()

if __name__ == "__main__":
    import logging
    import logging.handlers
    import sys

    os.sep = "/"
    pid = str(os.getpid())
    save_pid(pid)
    LOG_FILENAME = os.sep.join([os.environ.get("WEBAPP_INSTALL_DIR","./../.."),"logs","webapp_taskscheduler.log"])
    config_path = os.environ.get("WEBAPP_INSTALL_DIR","./../..")
    conf_file = config_path + os.sep + "api_logging.cfg"
    logging.config.fileConfig(conf_file, {'logfilename': LOG_FILENAME})
    logger = api.ApiLoggerAdapter(logger, {'jobid': "JOB ID", 'pid': pid})
    print(__name__)
    logger.info("starting webapp Scheduler")
    infoscfg = api.read_cfg(config_path + os.sep + "api_infos.cfg")
    infos = api.get_cfg_data(infoscfg)

    # DB connection
    crontab = None
    session = MongoClient(infos["general"]["db_host"], int(infos["general"]["db_port"]))
    db = session['webapp']
    crontasks = db[infos["general"]["crontab_name"].lower()]

    while not STOPSCHEDULER:
        # event loop processing
        time.sleep(int(infos["general"]["scheduler_speed"]))
        # read cron tab to find jobs
        logger.debug("checking cron table for new tasks")
        # if there are cron tasks found, run them
        for task in crontasks.find():
            if task["lastrun"] == "":
                # first time running the task
                logger.debug("sending message -> "+task["name"]+".tasks.run with args "+task["args"])
                run_task(task,crontasks, infos["general"]["crontab_name"])
            else:
                current_time = time.time()
                time_lapsed = current_time - float(task["lastrun"])
                logger.debug("time lapsed is: current time "+str(current_time)+" - lastrun "+str(task["lastrun"])+" = "+str(time_lapsed))
                if time_lapsed >= float(task["period"]):
                    logger.debug("sending message -> "+task["name"]+".tasks.run with args "+task["args"])
                    run_task(task,crontasks, infos["general"]["crontab_name"])
    if crontasks is not None:
        del crontasks
    if db is not None:
            del db
    logger.info("stopping webapp Scheduler")

