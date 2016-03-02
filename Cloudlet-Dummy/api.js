/*jslint node: true */
'use strict';

var config          = require('./config')
var express         = require('express');
var api             = express.Router();
var multer          = require('multer');
var upload          = multer({ dest: 'uploads/' });
var fs              = require('fs');



api.route('/objects')
    .post(upload.single('file'), function(req, res) {
        if (!req.file) {
            return res.json({ success: false, message: 'Missing file' });
        } else {
            fs.rename(req.file.path, 'uploads/'+req.body.key, function(err) {
                if ( err ) console.error('Rename failed:', err);
                res.json({ success: true });
            });
        }
    });

api.route('/objects/:id')
    .get(function(req, res) {
        res.sendFile(__dirname+'/uploads/'+req.params.id);
    })

    .put(upload.single('file'), function(req, res) {
        if (!req.file) {
            return res.json({ success: false, message: 'Missing file' });
        } else {
            fs.rename(req.file.path, 'uploads/'+req.params.id, function(err) {
                if ( err ) console.error('Rename failed:', err);
                res.json({ success: true });
            });
        }
    })

    .delete(function(req, res) {
        fs.unlink(__dirname+'/uploads/'+req.params.id, function() {
            res.json({ success: true, response: 'response' });
        });
    });


module.exports = api;
