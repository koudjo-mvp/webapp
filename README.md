# webapp 
**WebApp** is a Node.js configurable web application template that handles the client onboarding aspects of your app.

**Use-case:** If you're starting a new project (mobile app, website), focus on your core business' features implementation 
and save some precious time by using our **WebApp** backend for the middleware/users management (and more!).

## Features
This backend app template provides RESTful endpoints to do the following:
* **Clients onboarding** (B2C scenario)
    * **signup process** with email verification
    * **password renewal**
* **CRUD users management** (B2B scenario)
    * **search** users
    * **create/delete** users
    * **update** users infos
* users **session management**
* **security policies** to control who can view what at the meta-data level
* **OWASP password check**
* **nginx configuration** template for ssl settings
* **tracability** all endpoints access events logged following this format: 
`{"level":"loglevel","pid":nodejs pid,"ip":"incoming request IP","who":"user","roles":[user's roles],
"resourcerequested":"REST api endpoint requested","result":"call result","message":"log message","label":"rest api",
"timestamp":"2019-02-24T17:21:45.014Z"}
`
* **task scheduling** (ondemand or recurrent)

## Prerequisites
* NodeJS v11.8.0+, npm v6.7.0+
* MongoDB v3.0.7+
* pm2 v3.3.1+
* a mailgun account www.mailgun.com (the app will use it to send a verification email to your customers)
* RabbitMQ v3.5.6+ (used by the task scheduler features)
* Celery v4.1.0+ (used by the task scheduler features)
* Python 2.7.10+ (used by the task scheduler features)
* OS: tested on CentOS 7+ and MacOS 10.13.6

## Usage
### Preinstallation Configuration
* install all the prerequisites components listed above
* dowload the **webapp** template repository

    `git clone https://github.com/koudjo-mvp/webapp.git`

    `cd webapp`

* configure your signup email mailgun account by updating the file `./config.js`

    `mailgun_api_key: "the api key mailgun provided to you"`

    `mailgun_domain: "the email domain associated to your mailgun api key"`

* if you want your new app will be used in a b2b context (the app is set for 'b2c' by default), update the file `./config.js`

    `users_creation_mode: "b2b"`

* set your environment specific variables by adding the following lines in your bash_profile 

    `vi ~/.bash_profile`

    `export <YOUR_NEWAPP_NAME>_PYTHONEXEDIR={the path of the folder where your python executable is} (example: MYAPP_PYTHONEXEDIR=/usr/local/bin)`

    `export <YOUR_NEWAPP_NAME>_INSTALL_DIR={absolute path to target app folder} (example: MYAPP_INSTALL_DIR=/webapps/myapp)`

    `export <YOUR_NEWAPP_NAME>_LOGLEVEL={log level} (example: MYAPP_LOGLEVEL=/myapps/myapp)`

    `export <YOUR_NEWAPP_NAME>_CELERYNBTHREADS={celery worker's nb threads} (example: MYAPP_CELERYNBTHREADS=/webapps/myapp)`

    `export <YOUR_NEWAPP_NAME>_DOMAIN={app's domain name} (example: MYAPP_DOMAIN=localhost:3000, or MYAPP_DOMAIN=myapp.com)`

    `source ~/.bash_profile`

### Installation
* Run the command
**`./generate.sh <your_newapp_name> <your_newapp_version> <your_newapp_versionbuild>`**
 where:
    * <your_newapp_name> is the name of your app, characters accepted: [az09] (no space)
    * <your_newapp_version> is the initial version (ex: 1.0.0) you want it to start with
    * <your_newapp_versionbuild> is the initial build version for your new project

* Run the commands

    `cd ..` 

    `ls -al`

You should see `./generate.sh` created the folder <your_newapp_name> for your new application.
It also started it by running **pm2** process manager.

The installation is successfully completed if you get the following command `pm2 ls` results show that the webapp 
component are online:
* **<your_newapp_name>_restapi**
    * *this is your new app nodejs process*
* **<your_newapp_name>_scheduler**
    * *this is your new app task scheduler (app_scheduler.py)*
* **<your_newapp_name>_workerm**
    * *this is your new app celery monitor (flower)*

* To stop any of this components, run the command:

    `pm2 stop <your_newapp_name_component>`

### EndPoints access
Usage
* "POST /api/signup": to signup a new user,
* "POST /api/login": to login a user,
* "POST /api/logout": to logout a user,
* "POST /lostpass": to request a new password,
* "GET /api/users": to search users details,
* "POST /api/users": to create a user,
* "PUT /api/users": to update the infos of a user,
* "DELETE /api/users": to delete a user,
* "GET /api/tasks": to search any task type detail,
* "POST /api/tasks": to create a new task type,
* "PUT /api/tasks": to update a task type,
* "DELETE /api/tasks": to delete a task type,
* "GET /api/jobs": to check the statuses of the jobs executions,
* "POST /api/jobs": to submit a job
    * you MUST pass the `taskname` parameter in your POST request. 
    * if your job expect a file, pass `filename` parameter in your POST request and make sure the file is in the reception folder () before you call this endpoint
    * pass any other arguments and the webapp will automatically pass them to your task's python script
* "PUT /api/jobs": to update the job's status

A POSTMAN test file is provided under the ./tests folder of the app

### Extension
* to customize a task
    * edit `$WEBAPP_INSTALL_DIR/bin/scripts/{taskname}_src/tasks.py`
* to modify the user schema
    * edit `$WEBAPP_INSTALL_DIR/models/users.js` and `$WEBAPP_INSTALL_DIR/controllers/security_policies.js`
* to add/modify roles
    * edit `$WEBAPP_INSTALL_DIR/controllers/security_policies.js`
* to add new endpoints
    * edit the public routes in `$WEBAPP_INSTALL_DIR/controllers/view_access.js` or the protected routes in `$WEBAPP_INSTALL_DIR/controllers/api_access.js` and update accordingly their implementation in `$WEBAPP_INSTALL_DIR/controllers/*.js`
* to add new request parameters for an endpoint
    * update accordingly the routes implementations in `$WEBAPP_INSTALL_DIR/controllers/*.js`
