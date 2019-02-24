#!/usr/bin/env python__author__ = "P.K.V.M. @koudjo-mvp"# Build v${BUILD-VERSION} #__version__ = "${BUILD-VERSION}"# Standard Importsimport osimport sysimport csvimport jsonimport uuidimport tracebackimport pickleimport pprintimport tarfile,zipfilefrom time import sleep, time, strftime, localtimefrom datetime import datetimefrom string import zfill, split, strip, Templatefrom requests import Request, Sessionimport ConfigParserfrom cassandra.cluster import Cluster, BatchStatement, ConsistencyLevelfrom email.parser import Parserimport loggingimport logging.config#  Importsif os.environ['WEBAPP_INSTALL_DIR'] is not None:    extra_pythonpath = os.environ['WEBAPP_INSTALL_DIR']else:    raise Exception("WEBAPP_INSTALL_DIR not set")sys.path.append(extra_pythonpath)sys.path.append(extra_pythonpath+"/bin")from api import read_cfg, get_cfg_datafrom api import ApiLoggerAdapter as RunLogger# logginglogger = logging.getLogger("api")CONFIG_PATH = os.environ.get("WEBAPP_INSTALL_DIR")INFOSCFG = read_cfg(CONFIG_PATH + os.sep + "api_infos.cfg")INFOS = get_cfg_data(INFOSCFG)class AppClient(object):    """    """    def __init__(self, approoturl, apikey="", token=""):        """        """        self.httpsession = Session()        if apikey=="" and token=="":            self.headers = dict()        elif apikey!="" and token=="":            self.headers = {"Authorization":apikey}        elif apikey!="" and token!="":            self.headers = {"Authorization":apikey,"x-access-token":token}        self.apikey = apikey        self.sessionid = token        self.bodydata = dict()        self.httpverb = ""        self.httprooturl = approoturl        self.req = None    def make_request(self, uri, verb, headers=None, bodydata=None):        """        """        if headers is not None:            for param in headers:                self.headers[param] = headers[param]        if bodydata is not None:            self.bodydata = dict(bodydata)        self.httpverb = verb        self.req = Request(self.httpverb, self.httprooturl+uri, data=self.bodydata, headers=self.headers)        prep_req = self.req.prepare()        response = self.httpsession.send(prep_req)        if len(response.content) > 0:            data = json.loads(response.content)            if response.status_code == 401 and data["developerErrorMessage"] == "TokenExpiredError: session jwt expired":                # updating session token and running the cmd again                self.sessionid = data["results"]["sessionid"]                return self.make_request(uri, verb, headers, bodydata)            else:                return data        else:            return dict()    def get(self, uri, headers=None):        """        """        return self.make_request(uri, "GET", headers)    def post(self, uri, headers=None, bodydata=None):        """        """        return self.make_request(uri, "POST", headers, bodydata)    def put(self, uri, headers=None, bodydata=None):        """        """        return self.make_request(uri, "PUT", headers, bodydata)    def delete(self, uri, headers=None, bodydata=None):        """        """        return self.make_request(uri, "DELETE", headers, bodydata)    def login(self, user, password):        """        """        response = self.make_request('/api/login', "POST", {"Authorization":self.apikey}, {"login":user,"password":password})        self.sessionid = response['results']['sessionid']        self.headers = {"Authorization":self.apikey,"x-access-token":self.sessionid}        return self.sessionidclass AppJob(AppClient):    """    """    def __init__(self, jobid, jobdir, approoturl, apikey="", token="", taskname=""):        """        """        super(self.__class__, self).__init__(approoturl, apikey, token)        self.jobid = jobid        try:            uuid.UUID(self.jobid)        except Exception as err:            self.jobid = self.create_job(self.jobid)        self.jobinfos = None        self.jobdir = jobdir        self.cachefilepath = os.sep.join([self.jobdir,"cache.json"])    def create_job(self, taskname):        """        """        data = self.post('/api/jobs', self.headers, {"taskname":taskname})        return data["results"]["jobid"]    def job_update(self, status="processing", headers=None, bodydata=None):        """        """        body = dict()        if bodydata is not None:            body = dict(bodydata)        body["status"] = status        return self.put('/api/jobs/'+self.jobid, headers, body)    def job_update_counts(self, status="sending communications to provider", headers=None, bodydata=None):        """        """        return self.job_update(status, headers, {'nb_sent':self.nb_sent})    def job_exception(self, reason="processing", headers=None, bodydata=None):        """        """        body = dict()        if bodydata is not None:            body = dict(bodydata)        body["reason"] = str(reason)        return self.put('/api/jobs/'+self.jobid, headers, body)    def job_completion(self,error=None, headers=None, bodydata=None):        """        """        if error is not None:            self.job_exception(error, headers, bodydata)        return self.job_update("ended", headers, bodydata)    def job_status(self, jobid, headers=None):        """        """        return self.get('/api/jobs/'+jobid, headers)if __name__ == "__main__":    import logging    import logging.handlers    import sys    os.sep = "/"    pid = str(os.getpid())    LOG_FILENAME = os.sep.join([os.environ.get("WEBAPP_INSTALL_DIR","./../.."),"logs","webapp_profilescripts.log"])    config_path = os.environ.get("WEBAPP_INSTALL_DIR","./../..")    conf_file = config_path + os.sep + "api_logging.cfg"    logging.config.fileConfig(conf_file, {'logfilename': LOG_FILENAME})    logger = RunLogger(logger, {'jobid': "ALL PRODUCER JOB IDS", 'pid': pid})    logger.debug("starting webapp pi tools test")    '''    # test    jsonfile = "/public/jobs/QA/cdaa243d-fef5-452d-9528-da826ac95b95/params.json"    with open(jsonfile) as jsonfiled:        parameters = json.load(jsonfiled)    logger.info("params are: "+str(parameters));    myjob = AppJob(jobid=parameters["webapp"]["jobid"], jobdir=parameters["webapp"]["jobdir"], webapprooturl=parameters["webapp"]["url"], apikey=parameters["webapp"]["apikey"], token=parameters["webapp"]["sessionid"])    myjob.job_update()    '''    