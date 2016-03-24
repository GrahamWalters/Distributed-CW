var config          = require('./config')
var _               = require('underscore');
var request         = require('request');

var File            = require('./models/file');
var User            = require('./models/user');

var ShareManager = function() {
    var self = this;
    this.file;

    this.createFile = function(file) {
        this.file = new File(file);
        this.file.save();

        return this.file;
    };

    this.setFile = function(file) {
        this.file = file;
        return this.file;
    };

    this.createShare = function() {
        var share = this.file.shares.create({ provider: 's3' });
        this.file.shares.push(share);
        share.save();

        return share;
    };

    this.saveDB = function() {
        this.file.save(function(err) {
            if (err) throw err;
        });
    };

    this.splitFile = function(data) {
        request.post({
            url: config.services.engine+'/split',
            formData: data
        }, function(err, httpResponse, body) {
            if (err) {
                return console.error('post to api/shares failed:', err);
            } else {
                self.processShares(body);
            }
        });
    };

    this.processShares = function(body) {
        body = JSON.parse(body);

        _.each(body, function(shareData) {
            var share = self.createShare();
            var buff = new Buffer(shareData, 'base64');

            var r = request.post(config.services[share.provider]+'/api/objects',
                function(err, httpResponse, body) {

                if (err) {
                    return console.error('post to api/shares failed:', err);
                } else if (httpResponse.statusCode === 201) {
                    share.saved = true;
                    self.saveDB();
                }
            });

            // Add form data to rquest!
            var form = r.form();
            form.append('key', share._id.toString());
            form.append('file', buff, {
                filename: share._id.toString(),
                contentType: 'application/octet-stream',
                knownLength: buff.length
            });
        });
        self.saveDB();
    };
};

module.exports = ShareManager;
