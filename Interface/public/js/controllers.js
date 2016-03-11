'use strict';
/* jslint browser: true */
/* global angular:false, _:false, $:flase */

var ctrls = angular.module('app.controllers', ['ngResource']);

ctrls.controller('NavCtrl', ['$scope','auth','$state',
    function($scope, auth, $state) {
        $scope.isLoggedIn = auth.isLoggedIn;
        $scope.currentUser = auth.currentUser;
        $scope.logOut = function() {
            auth.logOut();
            $state.go('home');
        };
    }]);

ctrls.controller('AuthCtrl', function($scope, $http, API, auth, $state) {
    $scope.user = {};

    $scope.register = function(){
        $http.post(API + '/users', $scope.user).success(function(res) {
            if (res.success === true) {
                $state.go('files');
            } else {
                console.error('register', res);
            }
        });
    };

    $scope.authenticate = function() {
        $http.post(API + '/authenticate', $scope.user).success(function(res) {
            if (res.success === true) {
                $state.go('files');
            } else {
                console.error('authenticate', res);
            }
        });
    };
});


ctrls.controller('SettingsCtrl', function($scope, $http, API, auth, $state) {
    var userId = auth.currentUser().id;
    $scope.user = {};

    $http.get(API + '/users/' + userId).success(function(res) {
        $scope.user = res;
    });

    $scope.update = function() {
        $http.put(API + '/users/' + userId, $scope.user).success(function(res) {
            if (res.status === 'updated') {
                console.log('Updated!');
                $state.go('files');
            } else {
                console.error('update', res);
            }
        });
    };

    $scope.delete = function() {
        console.warn('Delete has been disabled until warning have been added!');
        // $http.delete(API + '/users/' + userId).success(function(res) {
        //     console.log(res);
        // });
    };

    $scope.cancel = function() {
        $state.go('files');
    };
});


ctrls.controller('FilesCtrl', function($scope, $http, API, auth) {
    $scope.search = { name:'' };
    $scope.files = [];

    function load() {
        $http.get(API + '/files/').success(function(res) {
            $scope.files = res.files;
        });
    }
    load();

    $scope.create = function() {
        var fd = new FormData();
        fd.append('file', $scope.createFile);

        $http.post(API+'/files', fd, {
            transformRequest: angular.identity,
            headers: {'Content-Type': undefined}
        }).then(function(res) {
            console.info('POST: /files', res);
            load();
        });
    };

    $scope.download = function(file) {
        $http.get(API + '/files/' + file._id, { responseType: 'blob' }).success(function(blob) {
            saveAs(blob, file.name);
        });
    };

    $scope.setFileToUpdate = function(file) {
        $scope.fileToUpdate = file;
    }

    $scope.update = function() {
        var fd = new FormData();
        fd.append('file', $scope.updateFile);

        $http.put(API + '/files/'+ id, fd, {
            transformRequest: angular.identity,
            headers: {'Content-Type': undefined}
        }).then(function(res) {
            console.info('PUT: /files', res);
            load();
        });
    };

    $scope.delete = function(id) {
        console.log('delete', id);

        $http.delete(API + '/files/'+ id).success(function(res) {
            if (res.status === 'removed') {
                // Remove local/refresh
                load();
            } else {
                console.error('delete', res)
            }
        });
    };
});
