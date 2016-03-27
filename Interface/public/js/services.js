'use strict';
/* jslint browser: true */
/* global angular:false */

var services = angular.module('app.services', ['ui.router']);


services.factory('authInterceptor', ['API', 'auth', function(API, auth) {
    return {
        // Automatically attach Authorization header
        request: function(config) {
            var token = auth.getToken();
            if (config.url.indexOf(API) === 0 && token) {
                config.headers['x-access-token'] = token;
                console.log('setting access headers');
            }
            return config;
        },

        // Automatically save JWT tokens sent back from the server
        response: function(res) {
            if (res.config.url.indexOf(API) === 0 && res.data.jwt) {
                auth.saveToken(res.data.jwt);
            }
            return res;
        }
    };
}]);


services.factory('auth', ['$window', '$timeout', function($window, $timeout) {
    var auth = {};

    var timer = null;

    auth.saveToken = function(token) {
        $window.localStorage['jwtToken'] = token;

        $timeout.cancel( timer );
        var payload = auth.parseJwt(token);
        timer = $timeout(function() {
            window.location = '#/login';
        }, payload.exp * 1000 - Date.now());
    };

    auth.getToken = function() {
        return $window.localStorage['jwtToken'];
    };

    auth.parseJwt = function(token) {
        var payload = JSON.parse($window.atob(token.split('.')[1]));
        return payload;
    };

    auth.isLoggedIn = function() {
        var token = auth.getToken();

        if (token) {
            var payload = JSON.parse($window.atob(token.split('.')[1]));

            return payload.exp > Date.now() / 1000;
        } else {
            return false;
        }
    };

    auth.currentUser = function() {
        if (auth.isLoggedIn()) {
            var token = auth.getToken();
            // var payload = JSON.parse($window.atob(token.split('.')[1]));

            return auth.parseJwt(token);
        }
    };

    auth.logOut = function() {
        $window.localStorage.removeItem('jwtToken');
    };

    return auth;
}]);
