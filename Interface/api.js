/*jslint node: true */
'use strict';

var config          = require('./config');
var express         = require('express');
var api             = express.Router();
var _               = require('underscore');
var jwt             = require('jsonwebtoken');
var request         = require('request');
var multer          = require('multer');
var upload          = multer({ dest: 'uploads/' });
var fs              = require('fs');
var speakeasy       = require('speakeasy');
var qr              = require('qr-image');

console.log(config.services);

var mongoose     = require('mongoose');
mongoose.connect(config.services.mongodb);

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
    var token = req.body.jwt || req.query.jwt || req.headers['x-access-token'];

    // decode token
    if (!token) {
        return res.status(401).send({ error: 'No token provided!' });
    }

    jwt.verify(token, config.secret, function(err, user) {
        if (err) return res.status(401).json({ error: 'Failed to authenticate token!' });

        req.user = user;
        next();
    });
};



api.post('/authenticate', function(req, res) {
    User.findOne({ username: req.body.username }, function(err, user) {
        if (err) throw err;

        if (!user || !user.validPassword(req.body.password) || !user.validToken(req.body.twoFA)) {
            return res.status(400).json({ error: 'Authentication failed!' });
        } else {
            res.json({ success: true, jwt: user.generateJWT() });
        }
    });
});


api.get('/2fa.svg', function(req, res) {

    var secret = speakeasy.generateSecret({ name: 'S5-Storage' });
    var svg_string = qr.imageSync(secret.otpauth_url, { type: 'svg' });

    res.json({
        svg: svg_string,
        secret: secret
    });
});


api.route('/users/')
    .post(function(req, res) {
        if (typeof req.body.username !== 'string' || req.body.username.length < 2 ||
            typeof req.body.name !== 'string' || req.body.name.length < 2) {
            return res.status(400).json({ error: 'All fields are required!' });
        }
        if (typeof req.body.password !== 'string' || req.body.password.length < 8) {
            return res.status(400).json({ error: 'Passwords must be 8 digits or longer!' });
        }

        var verified = speakeasy.totp.verify({
            secret: req.body.secret.base32,
            encoding: 'base32',
            token: req.body.twoFA
        });

        if (! verified) {
            return res.status(400).json({ error: '2FA token does not match!' });
        }

        var user = new User(req.body);
        user.setPassword(req.body.password);

        user.save(function(err, user) {
            if (err) throw err;
            res.status(201).json({ success: 'Account created!', jwt: user.generateJWT() });
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
            return res.status(403).json({ error: 'You can only get the user currently logged in!' });

        User.findById(req.params.id, '_id name username fileT fileN created storageSize', function(err, user) {
            if (err) throw err;
            res.json(user);
        });
    })

    .put(auth, function(req, res) {
        if (req.user.id != req.params.id)
            return res.status(403).json({ error: 'You can only update the user currently logged in!' });

        User.findById(req.params.id, function(err, user) {
            if (err) throw err;

            if (!req.body.twoFA || !user.validToken(req.body.twoFA)) {
                return res.status(401).json({ error: '2FA token does not match!' });
            }

            if (req.body.name)     user.name = req.body.name;
            if (req.body.username) user.username = req.body.username;
            if (req.body.fileT)    user.fileT = req.body.fileT;
            if (req.body.fileN)    user.fileN = req.body.fileN;
            if (req.body.password) user.setPassword(req.body.password);

            user.save( function(err) {
                if (err) throw err;
                res.json({
                    success: 'Account updated!',
                    jwt: user.generateJWT(),
                    user: {
                        _id: user._id,
                        name: user.name,
                        username: user.username,
                        fileT: user.fileT,
                        fileN: user.fileN,
                        created: user.created
                    }
                });
            });
        });
    })

    .delete(auth, function(req, res) {
        if (req.user.id != req.params.id)
            return res.status(403).json({ error: 'You can only delete the user currently logged in' });

        User.findByIdAndRemove(req.params.id, function(err) {
            if (err) {
                console.error(err.message);
                throw err;
            }
            console.log('Removed', req.params.id);

            res.json({ success: 'Account deleted!'});
        });
    });


api.route('/files')
    .post([auth, upload.single('file')], function(req, res) {
        if (!req.file) return res.status(400).json({ error: 'File required!' });

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
        res.json({ success: 'Uploading', file: file });
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
        if (!req.file) return res.status(400).json({ error: 'File required!' });

        File.findOne({ _owner: req.user.id, _id: req.params.id }, function(err, file) {
            if (err) throw err;
            if (file.name !== req.file.originalname || file.mimetype !== req.file.mimetype) {
                return res.status(400).json({ error: 'File Name or Mimetype changed!' });
            }

            // Delete the current shares
            _.each(file.shares, function(share) {
                request.del(config.services[share.provider]+'/api/objects/'+share._id,
                    function(err, httpResponse, body) {

                    body = JSON.parse(body);
                    if (httpResponse.statusCode == 200 && body.success == true) {
                        share.remove(function() {
                            file.save(function() {
                                console.log('share deleted:', share._id);
                            });
                        });
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
            res.json({ success: 'File saved!', file: file });
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

            res.json({ success: 'File deleted!' });
        });
    });



module.exports = api;
