/*jslint node: true */
'use strict';

var config          = require('./config');
var express         = require('express');
var api             = express.Router();
var multer          = require('multer');
var upload          = multer({ storage: multer.memoryStorage() });

var AWS             = require('aws-sdk');
AWS.config.update(config.AWS);



api.get('/buckets', function(req, res) {
    var s3 = new AWS.S3();
    s3.listBuckets(function(err, data) {
        if (err) console.log(err, err.stack);
        else     res.json({ success: true, buckets: data.Buckets });
    });
});



api.route('/objects')
    .post(upload.single('file'), function(req, res) {
        if (!req.file || !req.file.buffer) {
            console.error('File Missing!');
            return res.json({ success: false, message: 'Missing file' });
        }

        var s3 = new AWS.S3();
        var params = { Bucket: config.AWS.Bucket, Key: req.body.key, Body: req.file.buffer };

        s3.upload(params)
            .on('httpUploadProgress', function(progress) {
                console.log('httpUploadProgress', progress);
            })
            .on('success', function(response) {
                res.status(201);
                res.json({ success: true, response: response });
            })
            .send();
    })

    .get(function(req, res) {
        var s3 = new AWS.S3();
        var params = { Bucket: config.AWS.Bucket };

        s3.listObjects(params)
            .on('success', function(response) {
                res.json({ success: true, response: response.data });
            })
            .send();
    });

api.route('/objects/:id')
    .get(function(req, res) {
        var s3 = new AWS.S3();
        var params = { Bucket: config.AWS.Bucket, Key: req.params.id };

        s3.getObject(params).createReadStream().pipe(res);
    })

    .delete(function(req, res) {
        var s3 = new AWS.S3();
        var params = { Bucket: config.AWS.Bucket, Key: req.params.id };

        s3.deleteObject(params)
            .on('success', function(response) {
                res.json({ success: true });
            })
            .send();
    });


module.exports = api;
