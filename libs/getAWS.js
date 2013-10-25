var AWS = require('aws-sdk');

AWS.config.update({
    accessKeyId     : process.env.AWS_ACCESS_KEY,
    secretAccessKey : process.env.AWS_SECRET_KEY
});

module.exports = function(region) {
    if (region) {
        AWS.config.update({region: region});
    }
    return AWS;
}
