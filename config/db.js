var config = require('./config.js');
var pgp = require("pg-promise")(); // postgres://username:password@host:port/database

pgp.pg.types.setTypeParser(1114, (stringValue) => {
    return stringValue;
});

var db = pgp(`postgres://${config.db.user}:${config.db.pass}@${config.db.host}:${config.db.port}/${config.db.name}`);

exports.db = db;