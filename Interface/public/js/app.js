'use strict';
/* jslint browser: true */
/* global angular:false */

var app = angular.module('S5', [
    'app.controllers',
    'app.services'
]);


app.constant('API', '/api');

app.config([
    '$stateProvider',
    '$urlRouterProvider',
    '$httpProvider',
    function($stateProvider, $urlRouterProvider, $httpProvider) {

    $stateProvider
        .state('home', {
            url: '/home',
            templateUrl: 'views/home.html'
        })
        .state('files', {
            url: '/files',
            templateUrl: 'views/files.html',
            controller: 'FilesCtrl',
            onEnter: ['$state', 'auth', function($state, auth) {
                if (!auth.isLoggedIn()) {
                    $state.go('login');
                }
            }]
        })
        .state('settings', {
            url: '/settings',
            templateUrl: 'views/settings.html',
            controller: 'SettingsCtrl',
            onEnter: ['$state', 'auth', function($state, auth) {
                if (!auth.isLoggedIn()) {
                    $state.go('login');
                }
            }]
        })
        .state('login', {
            url: '/login',
            templateUrl: 'views/login.html',
            controller: 'AuthCtrl',
            onEnter: ['$state', 'auth', function($state, auth) {
                if (auth.isLoggedIn()) {
                    $state.go('home');
                }
            }]
        })
        .state('register', {
            url: '/register',
            templateUrl: 'views/register.html',
            controller: 'RegisterCtrl',
            onEnter: ['$state', 'auth', function($state, auth) {
                if (auth.isLoggedIn()) {
                    $state.go('home');
                }
            }]
        });

    $urlRouterProvider.otherwise('home');


    $httpProvider.interceptors.push('authInterceptor');
}]);


app.filter('orderObjectBy', function() {
    return function(items, field, reverse) {
        var filtered = [];

        angular.forEach(items, function(item) {
            filtered.push(item);
        });

        filtered.sort(function (a, b) {
            return (a[field] > b[field] ? 1 : -1);
        });

        if (reverse) filtered.reverse();

        return filtered;
    };
});


// http://stackoverflow.com/a/18650828/1599191
app.filter('formatBytes', function() {
    return function(bytes, decimals) {
        if (bytes == 0) return '0 Byte';
        var k = 1000;
        var dm = decimals + 1 || 3;
        var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        var i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };
});

app.directive('fileModel', ['$parse', function ($parse) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            var model = $parse(attrs.fileModel);
            var modelSetter = model.assign;

            element.bind('change', function(){
                scope.$apply(function(){
                    modelSetter(scope, element[0].files[0]);
                });
            });
        }
    };
}]);

