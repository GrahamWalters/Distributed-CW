'use strict';
/* jslint browser: true */
/* global angular:false, _:false, $:flase, toastr:false, console:false */

var ctrls = angular.module('app.controllers', ['ngResource']);

toastr.options.progressBar = true;
toastr.options.timeOut = 4000;

var notify = function(obj) {
    if (obj.error) toastr.error(obj.error);
    if (obj.warning) toastr.warning(obj.warning);
    if (obj.success) toastr.success(obj.success);
};


ctrls.controller('NavCtrl', ['$scope','auth','$state',
    function($scope, auth, $state) {
        $scope.isLoggedIn = auth.isLoggedIn;
        $scope.currentUser = auth.currentUser;
        $scope.logOut = function() {
            auth.logOut();
            notify({success: 'Access Token Destroyed!'});
            $state.go('home');
        };
    }]);


ctrls.controller('RegisterCtrl', function($scope, $http, API, auth, $state) {
    $scope.user = {};

    $http.get(API + '/2fa.svg').success(function(res) {
        $('#svg-container').html(res.svg);

        $scope.user.secret = res.secret;
    }).error(notify);

    $scope.register = function() {
        $http.post(API + '/users', $scope.user).success(function(res) {
            if (res.success) {
                notify(res);
                $state.go('files');
            }
        }).error(notify);
    };
});

ctrls.controller('AuthCtrl', function($scope, $http, API, auth, $state) {
    $scope.user = {};

    $scope.authenticate = function() {
        $http.post(API + '/authenticate', $scope.user).success(function(res) {
            if (res.success) {
                $state.go('files');
            }
        }).error(notify);
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
            if (res.success) {
                notify(res);
                $state.go('files');
            }
        }).error(notify);
    };

    $scope.delete = function() {
        $http.delete(API + '/users/' + userId).success(function(res) {
            if (res.success) {
                notify(res);
                auth.logOut();
                $state.go('home');
            }
        });
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
        }).success(function(res) {
            notify(res);
            load();
        }).error(notify);
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
        var id = $scope.fileToUpdate._id;

        var fd = new FormData();
        fd.append('file', $scope.updateFile);

        $http.put(API + '/files/'+ id, fd, {
            transformRequest: angular.identity,
            headers: {'Content-Type': undefined}
        }).success(function(res) {
            notify(res);
            load();
            $scope.fileToUpdate = {};
        }).error(notify);
    };

    $scope.delete = function(id) {
        $http.delete(API + '/files/'+ id).success(function(res) {
            notify(res);
            load();
        }).error(notify);
    };
});
