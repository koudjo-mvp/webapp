#!/usr/bin/env python

__author__ = "<% author %>"
# Build v${BUILD-VERSION} #
__version__ = "${BUILD-VERSION}"

# Standard Imports
import os
import sys
import csv
import traceback
import pickle
import pprint
import tarfile,zipfile
from time import time, strftime, localtime
from celery.utils.log import get_task_logger

# API Imports
if os.environ['WEBAPP_INSTALL_DIR'] is not None:
    extra_pythonpath = os.environ['WEBAPP_INSTALL_DIR']
else:
    raise Exception("WEBAPP_INSTALL_DIR not set")
sys.path.append(extra_pythonpath)
sys.path.append(extra_pythonpath+"/bin")
from scripts.<% taskname %>_src.tasks import <% method %> as workunit

# logging
logger = get_task_logger(__name__)

def metrics_tag(argss, step="queuing", result=""):
    if step == "queuing":
        if len(argss[1])>=2:
            logger.info("Queuing task <% method %> for webapp job id "+argss[1]+". Params passed are: "+str(argss[1:]))
        else:
            logger.info("Queuing task <% method %> for webapp Params passed are: "+str(argss[1:]))
    elif step == "ended":
        if len(argss[1])>=2:
            logger.info("Queuing task <% method %> "+step+" with result: "+result+", for webapp job id "+argss[1]+". Params passed are: "+str(argss[1:]))
        else:
            logger.info("Queuing task <% method %> "+step+" with result: "+result+", for webapp Params passed are: "+str(argss[1:]))
    else:
        raise Exception("step argument must be 'queuing' or 'ended'")

if __name__ == "__main__":
    metrics_tag(sys.argv)
    res = workunit.apply_async(args=sys.argv[1:], queue='<% channel %>')
    metrics_tag(sys.argv,"ended")
    sys.exit(0)
