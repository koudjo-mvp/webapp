module.exports = {
    apps : [{
        name: 'webapp_restapi',
        script: 'www',
        cwd: './bin/',
        instances: 1,
        autorestart: true,
        "watch": ["../controllers/", "../routes/", "../models/","../apps.js","../config.js"],
        "ignore_watch" : ["*.py", "*.pyc", "*.pid"],
        "watch_options": {
            "followSymlinks": false
        },
        max_memory_restart: '1G',
        output: '../logs/server_stdout.log',
        error: '../logs/server_stderr.log'
    },{
        name: 'webapp_scheduler',
        script: "app_scheduler.py",
        cwd: './bin/scripts/',
        interpreter: "${WEBAPP_PYTHONEXEDIR}/python",
        instances: 1,
        autorestart: true,
        "watch": false,
        max_memory_restart: '1G',
        output: '../../logs/app_scheduler_stdout.log',
        error: '../../logs/app_scheduler_stderr.log'
    },{
        name: 'webapp_workerm',
        script: "celery",
        cwd: './bin/scripts/',
        interpreter: "${WEBAPP_PYTHONEXEDIR}/python",
        args: 'flower --broker=amqp://titus:pinotnoir@localhost:5672//',
        instances: 1,
        autorestart: true,
        "watch": false,
        max_memory_restart: '1G',
        output: '../../logs/flower_stdout.log',
        error: '../../logs/flower_stderr.log'
    },{
        name: 'webapp_worker1',
        script: "celery",
        cwd: './bin/scripts/',
        interpreter: "${WEBAPP_PYTHONEXEDIR}/python",
        args: 'multi restart w1 -A celeryinstance -Q ondemand_channel --concurrency=4 -l debug --logfile=../../logs/%n%I.log',
        instances: 1,
        autorestart: false,
        "watch": ["../api", "."],
        "ignore_watch" : ["*.js", "*.pid"],
        "watch_options": {
            "followSymlinks": false
        },
        max_memory_restart: '1G',
        output: '../../logs/w1_stdout.log',
        error: '../../logs/w1_stderr.log'
    },{
        name: 'webapp_worker2',
        script: "celery",
        cwd: './bin/scripts/',
        interpreter: "${WEBAPP_PYTHONEXEDIR}/python",
        args: 'multi restart w2 -A celeryinstance -Q cron_channel --concurrency=4 -l debug --logfile=../../logs/%n%I.log',
        instances: 1,
        autorestart: false,
        "watch": ["../api", "."],
        "ignore_watch" : ["*.js", "*.pid"],
        "watch_options": {
            "followSymlinks": false
        },
        max_memory_restart: '1G',
        output: '../../logs/w3_stdout.log',
        error: '../../logs/w3_stderr.log'
    }]
};
