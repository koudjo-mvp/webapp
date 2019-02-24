/**
 * Created by P.K.V.M. on 5/26/17.
 */
//var appRoot = require('app-root-path');
var path = require('path');
var winston = require('winston');
var winston_cass_transport = require('winston-cassandra').Cassandra;
var general_parameters;

general_parameters = {
    'secret': '9cx8rs2rg3y7fr8rd1rd2hg8c174dff9e8f85babe1e004',
    'users_creation_mode': 'b2c', // 'b2b'
    'pagination_limit':50,
    'database_type': 'mongo',
    'database': 'mongodb://localhost/webapp',
    'cassandradb_host': 'localhost',
    'cassandradb_keyspace': 'webapp',
    'cassandradb_datacenters': 'datacenter1',
    'domainname': process.env.WEBAPP_DOMAIN,
    'server_url':'http://'+process.env.WEBAPP_DOMAIN,
    'monitoring_servername': 'localhost',
    'monitoring_serverport':'5555',
    'login_timeout': 60*60*24*31,
    'indexurl':'localhost:9200',
    'indexlogl':'trace',
    'loadbalance_algo': 'round_robin',//round_robin, full
    'jobs_root_dir': '/apps/webapp_jobs',
    'jobs_reception_dir': '/apps/webapp_reception',
    'mailgun_api_key': 'apikey',
    'mailgun_domain': 'mail_domain',
    'mailgun_from_who': ' webapp Notification Service <no-reply@webapp.com>',
    'mailgun_EXPIRATION_TIME': 3,
    'mailgun_subject': 'webapp Notification',
    'mailgun_COMPANY': 'webapp Inc.',
    'default_avatarpicpath':'/uploads/default/avatars/',
    'default_streampicpath':'/uploads/default/streams/covers/',
    'facebook_auth' : {
        'clientID'      : '',
        'clientSecret'  : '',
        'callbackURL'   : 'https://yourdomain/api/auth/sso_auth/callback',
        'profileURL'    : 'https://graph.com/v2.12/me?fields=first_name,last_name,email',
        'profileFields' : ['id', 'email', 'name']
    },
    'twitter_auth' : {
        'consumerKey'       : '',
        'consumerSecret'    : '',
        'callbackURL'       : 'https://yourdomain/api/auth/ldap_auth/callback'
    }
};
var json_response;
json_response = {
    status: -1,
    developerErrorMessage: "",
    userErrorMessage: "",
    metadata: {},
    results: ""
};
function Response(status, developerErrorMessage, userErrorMessage, metadata, results) {
    this.status = status;
    this.developerErrorMessage = developerErrorMessage;
    this.userErrorMessage = userErrorMessage;
    this.metadata = metadata;
    this.results = results;
    if (status === undefined) {
        this.status = 0;
    }
    if (developerErrorMessage === undefined) {
        this.developerErrorMessage = "";
    }
    if (userErrorMessage === undefined) {
        this.userErrorMessage = "";
    }
    if (metadata === undefined) {
        this.metadata = {};
    }
    if (results === undefined) {
        this.results = {};
    }
}

winston.loggers.add('webapp_restapi', {
    levels: winston.config.npm.levels, //winston.config.syslog.levels,
    format: winston.format.combine(
        winston.format.label({ label: 'webapp main rest api' }),
        winston.format.timestamp(),
        winston.format.json()//prettyPrint()
    ),
    transports: [
        //new winston.transports.Console({ level: 'silly' }),
        //new winston.transports.Http({ host: 'localhost', port:8080 }),
        /*new winston_cass_transport({
            host: general_parameters.cassandradb_host,
            keyspace:general_parameters.cassandradb_keyspace,
            level: 'silly',
            table: 'logs',
            partitionBy: 'day'
        }),*/
        new winston.transports.File({
            level: process.env.WEBAPP_LOGLEVEL,
            silent: false,
            filename: path.join(__dirname, '/logs/webapp-restapi.log'),//'${appRoot}/logs/webapp-restapi.log',//'./logs/webapp-restapi.log',
            maxsize: 1000000000,
            maxFiles: 5,
            tailable: true,
            zippedArchive: true
        })
    ],
    exitOnError: false,
    exceptionHandlers: [
        new winston.transports.File({
            level: 'silly',
            silent: false,
            filename: path.join(__dirname, '/logs/webapp-restapi-exceptions.log'),
            maxsize: 1000000000,
            maxFiles: 5,
            tailable: true,
            zippedArchive: false
        })
    ]
});

module.exports = {
    general_parameters: general_parameters,
    json_response: new Response(),
    jsonResponse: Response
};
