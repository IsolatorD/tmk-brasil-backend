var winston = require('winston');

// define the custom settings for each transport (file, console)

const levels = {
  level_0: 'error',
  level_1: 'warn',
  level_2: 'info',
  level_3: 'verbose',
  level_4: 'debug',
  level_5: 'silly',
};

var options = {
  file: {
    level: levels.level_5,
    filename: `./tmk_errors.log`,
    handleExceptions: true,
    json: false,
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    colorize: true,
  },
  console: {
    level: 'debug',
    handleExceptions: true,
    json: false,
    colorize: true,
  },
};

// instantiate a new Winston Logger with the settings defined above
var logger = new winston.Logger({
  transports: [
    new winston.transports.File(options.file),
    new winston.transports.Console(options.console)
  ],
  exitOnError: false, // do not exit on handled exceptions
});

//logger.log('error', 'Hola luis como estas?');

module.exports = logger;