const winston = require('winston');

const { createLogger, format, transports, addColors } = winston;

const customColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

addColors(customColors);

const logger = createLogger({
  levels: winston.config.npm.levels,
  level: 'info',
  format: format.combine(
    format.colorize({ all: true }),
    format.printf(({ level, message }) => {
      return `${level}: ${message}`;
    }),
  ),
  transports: [new transports.Console()],
});

module.exports = logger;
