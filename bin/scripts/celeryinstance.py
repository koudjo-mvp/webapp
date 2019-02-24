#!/usr/bin/env python

__author__ = "P.K.V.M. @koudjo-mvp"
# Build v${BUILD-VERSION} #
__version__ = "${BUILD-VERSION}"

# Standard Imports
import sys, os, json, time, zipfile, uuid, datetime
from celery import Celery
from requests import Request, Session
from celery.utils.log import get_task_logger

#  Imports
if os.environ['WEBAPP_INSTALL_DIR'] is not None:
    extra_pythonpath = os.environ['WEBAPP_INSTALL_DIR']
else:
    raise Exception("WEBAPP_INSTALL_DIR not set")
sys.path.append(extra_pythonpath)
sys.path.append(os.sep.join([extra_pythonpath,'bin']))

# logging
logger = get_task_logger(__name__)

def get_packages(path):
    list_packages = list()
    if not os.path.isdir(path): return list_packages
    for p in os.listdir(path) :
        if os.path.isdir(os.sep.join([path,p])) and p not in ['.','..','__pycache__','celerybeat-schedule']:
            list_packages.append('scripts.'+p)
    logger.info("celery instance initialization - profile scripts found: "+str(list_packages))
    return list_packages

app = Celery('celeryinstance')
app.autodiscover_tasks(packages=get_packages(os.sep.join([os.environ['WEBAPP_INSTALL_DIR'],'bin','scripts'])),related_name="tasks",force=True)
app.config_from_object('celeryconfig')
