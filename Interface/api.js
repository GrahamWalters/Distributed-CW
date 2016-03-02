/*jslint node: true */
'use strict';

var config          = require('./config')
var express         = require('express');
var api             = express.Router();
var _               = require('underscore');
var moment          = require('moment');
var jwt             = require('jsonwebtoken');
var request         = require('request');
var fs              = require('fs');


var mongoose     = require('mongoose');
mongoose.connect('mongodb://localhost/DS');

var File            = require('./models/file');
var User            = require('./models/user');

var multer          = require('multer');
var upload          = multer({ dest: 'uploads/' });
// var upload          = multer({ storage: multer.memoryStorage() })



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

        User.findById(req.params.id, '_id name username fileT fileN created', function(err, user) {
            if (err) throw err;
            res.json(user);
        })
    })

    .put(auth, function(req, res) {
        if (req.user.id != req.params.id)
            return res.status(403).json({ success: false, message: 'You can only update the user currently logged in' });

        User.findByIdAndUpdate(req.params.id, req.body, {new: true}, function(err, user) {
            if (err) throw err;
            res.json({'status':'updated', 'user': user});
        });
    })

    .delete(auth, function(req, res) {
        if (req.user.id != req.params.id)
            return res.status(403).json({ success: false, message: 'You can only delete the user currently logged in' });

        User.findByIdAndRemove(req.params.id, function(err) {
            if (err) throw err;
            console.log('Removed', req.params.id);

            res.json({'status':'removed'});
        });
    });





api.route('/files')
    .post([auth, upload.single('file')], function(req, res) {
        if (!req.file) return res.json({ success: false });

        var file = new File({
            name  : req.file.originalname,
            size  : req.file.size,
            mimetype : req.file.mimetype,
            _owner: req.user.id
        });
        file.save();

        var thisShouldNotBeNeeded = fs.createReadStream(req.file.path);


        for (var n=0; n<req.user.fileN; n++) {
            var share = file.shares.create({ provider: 's3' });
            file.shares.push(share);

            console.log('share', share._id);

            var data = {
                key: share._id.toString(),
                file: thisShouldNotBeNeeded
            };
            request.post({url:'http://localhost:3002/api/objects', formData: data}, function(err, httpResponse, body) {
                if (err) {
                    return console.error('upload failed:', err);
                } else {
                    share.saved = true;
                    share.save();
                    console.log('saved ', share._id, body);
                }
            });
        }

        console.log(file);
        res.json({ success: true, message: 'processing' });
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
            res.json(file);
        });

        // request.get({url:'http://localhost:3002/api/object/'+share}, function(err, httpResponse, body) {
        //     if (err) {
        //         console.error('Get failed:', err);
        //         return res.json({ success: false, message: 'Get failed!' });
        //     }
        // }).pipe(res);
    })

    .put(auth, function(req, res) {
        File.findOne({ _owner: req.user.id, _id: req.params.id }, function(err, file) {
            if (err) throw err;
            res.json(file);
        });
    })

    .delete(auth, function(req, res) {
        File.findOne({ _owner: req.user.id, _id: req.params.id }, function(err, file) {
            if (err) throw err;

            for (var share in file.shares) {
                request
                    .delete('http://localhost:3002/api/object/'+share._id)
                    .on('response', function(response) {
                        if (response.statusCode == 202 &&
                            response.body.status == 'success') {
                            share.remove().exec();
                        }
                    });
            }

            res.json(file);
        });
    });


module.exports = api;
