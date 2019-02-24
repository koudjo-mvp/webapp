#!/usr/bin/env python__author__ = "P.K.V.M. @koudjo-mvp"# Build v${BUILD-VERSION} ## Standard Importsimport osimport sysimport csvimport tracebackimport pickleimport pprintimport tarfile,zipfileimport ConfigParserfrom time import time, strftime, localtimefrom string import zfill, split, strip, Templateimport logging#  Imports# logginglogger = logging.getLogger("api")class ApiLoggerAdapter(logging.LoggerAdapter):    """    This custom logging adapter expects the passed in dict-like object to have a    'jobid' and 'pid' keys, whose value in brackets are prepended to the log message.    """    def process(self, msg, kwargs):        return '[%s] [%s] %s' % (self.extra['pid'], self.extra['jobid'], msg), kwargsdef read_cfg(path):    """    Reads STD config files    :param path: Path to the standard configuration file    :return: ConfigParser object containing the configuration files data    """    config = ConfigParser.SafeConfigParser()    fd_ = open(path,'r')    try:        config.readfp(fd_)    except Exception, err:        raise(err)    finally :        fd_.close()    return configdef get_cfg_data(config):    """    Generates the dictionnary containing all the data in the cfg file    :config: ConfigParser object    :return: error_messages dictionary self.errors, job properties tables infos self.proptables    """    data = dict()    for params_set in config.sections():        data[params_set] = dict()        for param in config.options(params_set):            data[params_set][param] = config.get(params_set, param)            if logger.isEnabledFor(logging.DEBUG):                logger.debug('params loaded are:\n' + str(param))    return datadef getcmdline_params(inputarguments):    """    Return a dictionary of all the command line parameters    Parameters:        inputarguments  -> your commandline arguments    """    paramkey = None    for param in inputarguments:        if (paramkey is None) and (param[0]=="-") :            paramkey = param        else :            if not paramkey is None:                self.__parametersDict[paramkey[1:]] = param                paramkey = None    if not paramkey is None:        self.__parametersDict[paramkey[1:]] = ''        paramkey = None    return self.__parametersDictdef untar_it(fname, tarpath=None):    """    Untar file    :param fname: file name to tar file to be untarred    :param tarpath: folder path containing the files to be untarred    :return:    """    if (fname.endswith(".tar.gz")):        tar = tarfile.open(fname)        try:        # with tarfile.open(fname) as tar:            if tarpath:                tar.extractall(tarpath)            else:                tar.extractall()        except Exception, err:            raise Exception(str(err))        finally:            tar.close()    else:        raise Exception("Not a tar.gz file: '%s '" % fname)def unzip_it(fname, zippath=None):    """    UnZip file    :param fname: file name to zip file to be unzipped    :param tarpath: folder path containing the files to be unzipped    :return:    """    if (fname.endswith(".zip")):        myzip = zipfile.ZipFile(fname, 'r')        try:        # with zipfile.ZipFile(fname, 'r') as myzip:            if zippath:                myzip.extractall(zippath)            else:                myzip.extractall()        except Exception, err:            raise Exception(str(err))        finally:            myzip.close()    else:        raise Exception("Not a zip file: '%s '" % fname)def targz_it(fname, tarpath):    """    Targzzz files    :param fname: file name of the targz file to create    :param tarpath: folder path containing the files to be targzzz    :return:    """    os.chdir(tarpath)    tar = tarfile.open(fname, "w")    try:    # with tarfile.open(fname, "w") as tar:        for name in [ff for ff in os.listdir(tarpath) if os.path.isfile(os.sep.join([tarpath, ff]))]:            tar.add(name)    except Exception, err:        raise Exception(str(err))    finally:        tar.close()def zip_it(fname, tarpath):    """    Zip files    :param fname: file name of the zip file to create    :param tarpath: folder path containing the files to be zipped    :return:    """    os.chdir(tarpath)    myzip = zipfile.ZipFile(fname, 'w')    try:    # with zipfile.ZipFile(fname, 'w') as myzip:        for name in [ff for ff in os.listdir(tarpath) if os.path.isfile(os.sep.join([tarpath, ff]))]:            myzip.write(name)    except Exception, err:        raise Exception(str(err))    finally:        myzip.close()