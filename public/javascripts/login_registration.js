/**
 * Created by P.K.V.M. on 7/12/17.
 */
if (!BROWSER_APIKEY || !clientData){
    console.error("In your html file, make sure to import apikey.js file before this javascript file.");
}
var app = angular.module("webapp-door", ['ngRoute', 'ngCookies', 'ngTouch']);
/*app.config(['$locationProvider', function($locationProvider){
    $locationProvider.html5Mode({
        enabled: true,
        requireBase: false
    })
}]);*/
app.service('login_registration', function($http) {
    this.login = function (url, email, password, temp, callback) {
        data = {
            "username": username,
            "password": password,
            "temp": temp
        };
        $http.post(url, data, {headers:{Authorization: "Apikey "+temp}}).then(function (response) {
            //console.log("in promise:"+JSON.stringify(response));
            callback(response.data);
        }).catch(function(error) {
            //console.log("http login request returned the error status code "+error.status);
            callback(error.data);
        });
    };
    this.register = function (url, username, firstname, lastname, email, password, profile_type, age, gender, temp, callback) {
        data = {
            "username": username,
            "firstname": firstname,
            "lastname": lastname,
            "email": email,
            "password": password,
            "type": profile_type,
            "age": age,
            "gender": gender,
            "temp": temp
        };
        $http.post(url, data, {headers:{Authorization: "Apikey "+temp}}).then(function (response) {
            //console.log("in promise:"+JSON.stringify(response));
            callback(response.data);
        }).catch(function(error) {
            //console.log("http login request returned the error status code "+error.status);
            callback(error.data);
        });
    };
    this.confirm = function (url, token, temp, callback) {
        data = {
            "signup_token": token,
            "temp": temp
        };
        $http.post(url, data, {headers:{Authorization: "Apikey "+temp}}).then(function (response) {
            //console.log("in promise:"+JSON.stringify(response));
            callback(response.data);
        }).catch(function(error) {
            console.log(error);
            callback(error.data);
        });
    };
});

app.run(function($rootScope) {
    $rootScope.message = "";
});

app.controller('root_controller', function($scope, $http, $cookies, $location, $interval, $touch, $rootScope, login_registration) {
    //console.log('calling root_controller contoller');
    $scope.host = "http://"+$location.host();
    $scope.showfields = true;
    $scope.profile_type = "default";
    $scope.age = 17;
    $scope.gender = "F";
    $scope.temp = BROWSER_APIKEY;

    $scope.goDemo = function(event) {
        if (event){
            //console.log(JSON.stringify(event));
            window.location = "/demos";
        }
    };
    // at least 8 characters, at least 3 of the following 4 types of characters: a-z A-Z 0-9 -=[]\;,./~!@#$%^&*()_+{}|:<>?, not include username/email adress, Not be a common keyboard sequence, such as "qwerty89" or "abc123"
    $scope.goLogin = function(event){
        //console.log("gologin called");

        if ($scope.loginForm.email.$valid && $scope.loginForm.password.$valid){
            login_registration.login($scope.host+"/api/login",$scope.email,$scope.password,$scope.temp, function(response){
                if (response.status === 201 || response.status === 200) {
                    //console.log("succes: "+response["results"]["sessionid"]+" "+response["results"]["username"]+" "+response["results"]["username"]);
                    //$cookies.put('sessionid', response["results"]["sessionid"]);
                    //$cookies.put('username', response["results"]["username"]);
                    clientData.setItem('token', response["results"]["sessionid"]);
                    clientData.setItem('username', response["results"]["username"]);
                    window.location = response["results"]["url"];
                } else {// (response.status === 500 || response.status === 400 || response.status === 404)
                    $scope.message = response["userErrorMessage"];
                    //console.log("session expired "+$scope.message);
                    //$scope.apply();
                }
            });
        } else {
            /*if($scope.loginForm.email.$invalid && $scope.loginForm.email.$touched) {
             $scope.message = "address email invalid";
             //$scope.apply();
             }
             if($scope.loginForm.password.$invalid && $scope.loginForm.password.$touched) {
             $scope.message = "password must be at least 8 characters, at least 3 of the following 4 types of characters: a-z A-Z 0-9 -=[]\;,./~!@#$%^&*()_+{}|:<>?, not include username/email adress";
             //$scope.apply();
             }*/
        }
    };
    $scope.goRegister = function(event){

        if ($scope.signupForm.userid.$valid && $scope.signupForm.firstname.$valid && $scope.signupForm.lastname.$valid && $scope.signupForm.email.$valid && $scope.signupForm.password.$valid && $scope.signupForm.cpassword.$valid && $scope.signupForm.profile_type.$valid && $scope.signupForm.age.$valid && $scope.signupForm.gender.$valid){
            if ($scope.password !== $scope.cpassword){
                $scope.message = "the passwords you typed are different";
            } else {
                $scope.message = "";
                login_registration.register($scope.host+"/api/signup",$scope.userid,$scope.firstname,$scope.lastname,$scope.email,$scope.password,$scope.profile_type,$scope.age,$scope.gender,$scope.temp, function(response){
                    if (response.status === 202) {
                        $scope.showfields = false;
                        $scope.message = response["results"]["message"];
                    } else {
                        $scope.message = response["userErrorMessage"];
                    }
                });
            }
        } else {
            if($scope.signupForm.userid.$invalid) {
                $scope.message = "userid: [a...z,0...9,_], min 2 characters, max 10 characters";
            } else {
                $scope.message = "";
            }
            /*if($scope.signupForm.email.$invalid) {
                $scope.message = "address email invalid";
            }
            if($scope.signupForm.password.$invalid) {
                $scope.message = "password must be at least 8 characters, at least 3 of the following 4 types of characters: a-z A-Z 0-9 -=[]\;,./~!@#$%^&*()_+{}|:<>?, not include username/email adress";
            }
            if($scope.signupForm.profile_type.$invalid) {
                $scope.message = "must be Creative, Fan or Brand";
            }
            if($scope.signupForm.age.$invalid) {
                $scope.message = "must be >= 16 years old";
            }
            if($scope.signupForm.gender.$invalid) {
                $scope.message = "must be M, F or M/F";
            }*/
        }
    };

});

app.controller('confirm_controller', function($scope, $http, $cookies, $location, $interval, $rootScope, login_registration) {
    //console.log('calling root_controller contoller');
    $scope.host = "http://"+$location.host();
    if ($location.port !== "80") {
        $scope.host = $scope.host +":"+ $location.port();
    }
    $scope.temp = BROWSER_APIKEY;
    $scope.emailtoken = $location.search().token;
    console.log($scope.host+"/signup"+", token "+JSON.stringify($location.search()));
    $scope.confirm = function(){
        if ($scope.emailtoken){
            login_registration.confirm($scope.host+"/signup", $scope.emailtoken, $scope.temp, function(response){
                if (response.status === 201 || response.status === 200) {
                    $scope.message = response["results"]["message"];
                } else {
                    $scope.message = response["userErrorMessage"];
                }
            });
        } else {
            $scope.message = "Something went wrong during your registration process. Please sign-up again";
        }
    };
    $scope.confirm();
});
