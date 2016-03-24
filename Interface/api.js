/*jslint node: true */
'use strict';

var config          = require('./config')
var express         = require('express');
var api             = express.Router();
var _               = require('underscore');
var jwt             = require('jsonwebtoken');
var request         = require('request');
var multer          = require('multer');
var upload          = multer({ dest: 'uploads/' });
var fs              = require('fs');

var mongoose     = require('mongoose');
mongoose.connect('mongodb://localhost/DS');

var File            = require('./models/file');
var User            = require('./models/user');

var ShareManager    = require('./ShareManager');


api.all('/*', function(req, res, next) {
    res.header('Access-Control-Allow-Origin',  '*');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});


var auth = function(req, res, next) {

    // check header or url parameters or post parameters for token
    var token = req.body.token || req.query.token || req.headers['x-access-token'];

    // decode token
    if (token) {

        // verifies secret and checks exp
        jwt.verify(token, config.secret, function(err, user) {
            if (err) return res.json({ success: false, message: 'Failed to authenticate token.' });

            req.user = user;
            next();
        });

    } else {
        return res.status(403).send({
            success: false,
            message: 'No token provided.'
        });
    }
};



api.post('/authenticate', function(req, res) {
    User.findOne({ username: req.body.username }, function(err, user) {
        if (err) throw err;

        if (!user || !user.validPassword(req.body.password)) {
            res.json({ success: false, message: 'Authentication failed.' });
        } else {
            res.json({ success: true, token: user.generateJWT() })
        }
    });
});


api.route('/users/')
    .post(function(req, res) {
        var user = new User(req.body);
        user.setPassword(req.body.password);

        user.save(function(err, user) {
            if (err) throw err;
            res.status(201).json({ token: user.generateJWT() });
        });
    })

    .get(function(req, res) {
        User.find({}, function(err, users) {
            if (err) throw err;

            res.json(users);
        });
    });

api.route('/users/:id')
    .get(auth, function(req, res) {
        if (req.user.id != req.params.id)
            return res.status(403).json({ success: false, message: 'You can only get the user currently logged in' });

        User.findById(req.params.id, '_id name username fileT fileN created storageSize', function(err, user) {
            if (err) throw err;
            res.json(user);
        });
    })

    .put(auth, function(req, res) {
        if (req.user.id != req.params.id)
            return res.status(403).json({ success: false, message: 'You can only update the user currently logged in' });

        User.findById(req.params.id, '_id name username fileT fileN created', function(err, user) {
            if (err) throw err;

            if (req.body.name)     user.name = req.body.name;
            if (req.body.username) user.username = req.body.username;
            if (req.body.fileT)    user.fileT = req.body.fileT;
            if (req.body.fileN)    user.fileN = req.body.fileN;
            if (req.body.password) user.setPassword(req.body.password);
            user.save( function(err) {
                if (err) throw err;
                res.json({ 'status':'updated', 'user': user, token: user.generateJWT() });
            });
        });
    })

    .delete(auth, function(req, res) {
        if (req.user.id != req.params.id)
            return res.status(403).json({ success: false, message: 'You can only delete the user currently logged in' });

        User.findByIdAndRemove(req.params.id, function(err) {
            if (err) {
                console.error(err.message);
                throw err;
            }
            console.log('Removed', req.params.id);

            res.json({'status':'removed'});
        });
    });


api.route('/files')
    .post([auth, upload.single('file')], function(req, res) {
        if (!req.file) return res.json({ success: false });

        var sm = new ShareManager();
        var file = sm.createFile({
            T: req.user.fileT,
            N: req.user.fileN,
            name  : req.file.originalname,
            size  : req.file.size,
            mimetype : req.file.mimetype,
            _owner: req.user.id
        });

        sm.splitFile({
            id:    file._id.toString(),
            fileT: req.user.fileT,
            fileN: req.user.fileN,
            file:  fs.createReadStream(req.file.path)
        });

        User.findByIdAndUpdate(req.user.id, {
            $inc: { storageSize: req.file.size}
        }, function(err, user) {

        });


        fs.unlink(req.file.path);

        res.status(202); // Accepted for processing
        res.json({ success: true, message: 'processing', file: file });
    })

    .get(auth, function(req, res) {
        File.find({_owner: req.user.id}, function(err, files) {
            if (err) throw err;

            if (files) res.json({'files': files});
            else res.json({'files': []});
        });
    });

api.route('/files/:id')
    .get(auth, function(req, res) {
        File.findOne({ _owner: req.user.id, _id: req.params.id }, function(err, file) {
            if (err) throw err;

            var data = {
                id:    req.params.id,
                fileT: req.user.fileT,
                fileN: req.user.fileN,
                shares:  []
            };

            _.each(file.shares, function(share) {
                data.shares.push(
                    request.get( config.services[share.provider]+'/api/objects/'+share._id )
                );
            });

            request
                .post({ url: config.services.engine+'/join', formData: data })
                .on('response', function(response) {
                    delete response.headers.server;
                    response.headers['content-type'] = file.mimetype+';charset=UTF-8';
                    response.headers['Content-Disposition'] = 'attachment; filename="'+file.name+'"';
                    res.writeHead(response.statusCode, response.headers);
                }).pipe(res);
        });
    })

    .put([auth, upload.single('file')], function(req, res) {
        File.findOne({ _owner: req.user.id, _id: req.params.id }, function(err, file) {
            if (err) throw err;
            if (file.name !== req.file.originalname || file.mimetype !== req.file.mimetype) {
                res.status(400); // Bad Request
                return res.json({ success: false, message: 'File Name or Mimetype changed!' });
            }

            // Delete the current shares
            _.each(file.shares, function(share) {
                request.del(config.services[share.provider]+'/api/objects/'+share._id,
                    function(err, httpResponse, body) {

                    body = JSON.parse(body);
                    if (httpResponse.statusCode == 200 && body.success == true) {
                        console.log('share deleted:', share._id);
                        share.remove();
                    }
                });
            });

            var size = req.file.size - file.size;

            User.findByIdAndUpdate(req.user.id, {
                $inc: { storageSize: size}
            }, function(err, user) {

            });

            // Update file attributes
            file.T    = req.user.fileT;
            file.N    = req.user.fileN;
            file.size = req.file.size;
            file.save();

            // Create the new shares
            var sm = new ShareManager();
            sm.setFile(file);

            sm.splitFile({
                id:    file._id.toString(),
                fileT: req.user.fileT,
                fileN: req.user.fileN,
                file:  fs.createReadStream(req.file.path)
            });

            fs.unlink(req.file.path);

            res.status(202); // Accepted for processing
            res.json({ success: true, message: 'processing', file: file });
        });
    })

    .delete(auth, function(req, res) {
        File.findOne({ _owner: req.user.id, _id: req.params.id }, function(err, file) {
            if (err) throw err;

            _.each(file.shares, function(share) {
                request.del(config.services[share.provider]+'/api/objects/'+share._id,
                    function(err, httpResponse, body) {

                    body = JSON.parse(body);
                    if (httpResponse.statusCode == 200 && body.success == true) {
                        share.remove();
                    }
                });
            });

            // Should really do this stuff in a Q
            file.remove();

            User.findByIdAndUpdate(req.user.id, {
                $inc: { storageSize: -file.size}
            }, function(err, user) {

            });

            res.json({
                status: 'removed',
                file: file
            });
        });
    });



module.exports = api;
