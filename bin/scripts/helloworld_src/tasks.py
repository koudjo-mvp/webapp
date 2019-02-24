#!/usr/bin/env python

__author__ = "P.K.V.M. @koudjo-mvp"
# Build v${BUILD-VERSION} #
__version__ = "${BUILD-VERSION}"

# Standard Imports
import os
import sys
import csv
import json
import uuid
import traceback
import pickle
import pprint
import urllib
import tarfile,zipfile
from time import time, strftime, localtime, sleep
from datetime import datetime
from string import zfill, split, strip, Template
import requests
import ConfigParser
from cassandra.cluster import Cluster, BatchStatement, ConsistencyLevel
from celery.utils.log import get_task_logger

# API Imports
if os.environ['WEBAPP_INSTALL_DIR'] is not None:
    extra_pythonpath = os.environ['WEBAPP_INSTALL_DIR']
else:
    raise Exception("WEBAPP_INSTALL_DIR not set")
sys.path.append(extra_pythonpath)
sys.path.append(extra_pythonpath+"/bin")
from api import tools
from scripts.celeryinstance import app

# logging
logger = get_task_logger(__name__)

@app.task(bind=True,rate_limit=10000)
def run(self,jobid,jsonfile):
    with open(jsonfile) as jsonfiled:
        parameters = json.load(jsonfiled)
    logger.info("params are: "+str(parameters));
    myjob = tools.AppJob(jobid=parameters["job_request"]["jobid"], jobdir=parameters["job_request"]["jobdir"], approoturl=parameters["job_request"]["url"], apikey=parameters["job_request"]["apikey"], token=parameters["job_request"]["sessionid"])
    myjob.job_update()
    sleep(25)
    myjob.job_update(status="starting subtasks")
    sleep(25)
    logger.info("starts subtasks of "+parameters["task"]["name"]+" for jobid "+parameters["job_request"]["jobid"])
    sleep(25)
    try:
        for i in range(6):
            myjob.job_update(status="starting subtasks "+str(i))
            sleep(25)
        logger.info("finished subtasks of "+parameters["task"]["name"]+" for jobid "+parameters["job_request"]["jobid"])
        myjob.job_completion()
        del myjob
        return 0
    except Exception as err:
        logger.error("an exception occured (-> "+str(err)+") while running sutasks for job id "+parameters["job_request"]["jobid"])
        myjob.job_completion(error="an exception occured (-> "+str(err)+") while running subtasks for job id "+parameters["job_request"]["jobid"])
        del myjob
        raise Exception(err)
