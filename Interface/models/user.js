// models/user.js

var config       = require('../config');
var jwt          = require('jsonwebtoken');
var speakeasy    = require('speakeasy');
var crypto       = require('crypto');
var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;


var UserSchema = new Schema({
    name     : { type: String, required: true },
    username : { type: String, required: true, index: { unique: true } },
    hash     : { type: String, required: true },
    secret   : { type: Schema.Types.Mixed },
    salt     : { type: String, required: true },
    fileN    : { type: Number, default: 3 },
    fileT    : { type: Number, default: 2 },
    storageSize : { type: Number, default: 0 },
    created  : { type: Date, default: Date.now }
});


UserSchema.methods.setPassword = function(password) {
    this.salt = crypto.randomBytes(16).toString('hex');

    this.hash = crypto.pbkdf2Sync(password, this.salt, 100000, 512).toString('hex');
};


UserSchema.methods.validPassword = function(password) {
    var hash = crypto.pbkdf2Sync(password, this.salt, 100000, 512).toString('hex');

    return this.hash === hash;
};


UserSchema.methods.validToken = function(token) {
    return speakeasy.totp.verify({
        secret: this.secret.base32,
        encoding: 'base32',
        token: token
    });
};


UserSchema.methods.generateJWT = function() {
    return jwt.sign({
        id: this._id,
        name: this.name,
        username: this.username,
        fileT: this.fileT,
        fileN: this.fileN
    }, config.secret, { expiresIn: config.expiresIn });
};


module.exports = mongoose.model('User', UserSchema);
