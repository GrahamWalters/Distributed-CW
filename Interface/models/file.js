// models/user.js

var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;


var ShareSchema = new Schema({
    provider : { type: String, required: true },
    key      : { type: String, required: false },
    md5      : { type: String, required: false },
    saved    : Boolean
});

var FileSchema = new Schema({
    name     : { type: String, required: true },
    md5      : { type: String, required: false },
    size     : { type: Number, required: true },
    mimetype : { type: String, required: true },
    T        : { type: Number, required: true },
    N        : { type: Number, required: true },
    shares   : [ ShareSchema ],
    _owner   : { type: Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: {
        createdAt: 'created',
        updatedAt: 'modified'
    }
});


module.exports = mongoose.model('File', FileSchema);
