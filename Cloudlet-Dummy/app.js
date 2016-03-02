/*jslint node: true */
'use strict';

var express        = require('express');
var app            = express();
var server         = app.listen(process.env.PORT || 3002);
var compress       = require('compression');
var bodyParser     = require('body-parser');
var morgan         = require('morgan');


app.use( compress() );
app.use( morgan('dev') );
app.use( bodyParser.json() );
app.use( bodyParser.urlencoded({ extended: true }) );


// ROUTES FOR THE API
// =============================================================================
var api = require('./api');
app.use('/api', api);


console.log("Server started on port %d in %s mode", server.address().port, app.settings.env);
