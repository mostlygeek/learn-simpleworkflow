var debug = require("debug");

module.exports = {
    debug    : debug
    , error  : debug("error")
    , info   : debug('info')
    , status : debug("status")
};
