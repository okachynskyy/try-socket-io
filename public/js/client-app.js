var tryApp = angular.module('tryApp', ['ngRoute']);

tryApp.config(function($routeProvider) {
  $routeProvider
  .when('/', {
    controller : 'homeController',
    templateUrl : 'partials/home.html',
  })
  .when('/about', {
    templateUrl : 'partials/about.html',
  })
  .when('/players', {
    controller : 'playersController',
    templateUrl : 'partials/players.html',
  })
  .when('/game', {
    templateUrl : 'partials/game.html',
  })
  .otherwise({
    templateUrl : 'partials/404.html',
  });
});

tryApp.factory('namedSocket', ['$rootScope', '$cacheFactory', function ($rootScope, $cacheFactory) {
  var sockets = $cacheFactory('socket-connections');
  return function (namespace) {
    var ns = namespace? '/'+namespace: '/'; 
    var socket;
    if (!sockets.get(ns)) {
      sockets.put(ns, io.connect(ns));
    }
    socket = sockets.get(ns);
    socket.on('disconnect', function () { sockets.remove(ns); })
    return {
      on: on.bind(null, socket),
      emit: emit.bind(null, socket)
    };
  };

  function on(socket, event, callback) {
    socket.on(event, function () {  
      var args = arguments;
      $rootScope.$apply(function () {
        callback.apply(socket, args);
      });
    })
  }

  function emit(socket, eventName, data, callback) {
    socket.emit(eventName, data, function () {
      var args = arguments;
      $rootScope.$apply(function () {
        if (callback) {
          callback.apply(socket, args);
        }
      });
    })
  }
}]);


tryApp.controller('mainController', ['$scope', 'namedSocket', '$http', function($scope, namedSocket, $http){
  console.log('mainController!');

  var generalBus = namedSocket('/');
  var userSocket;

  $http.get('/api/records')
  .then(function(response) {
    $scope.records = response.data;
  });

    // generalBus.on('updateRecords', function() {
    //   console.log('updateRecords');
    //   $http.get('/api/records')
    //   .then(function(response) {
    //       $scope.records = response.data;
    //   });
    // });

    generalBus.on('connect', function(data) {
      userName = prompt("What is your name?");
      generalBus.emit('join', userName);

      $http.get('/api/get-namespace/'+userName)
      .then(function(response) {
        var ns = response.data.toString();
        console.log(ns);
        userSocket = namedSocket(ns);
        $scope.userSocket = userSocket;
      });

    });

    // socket.on('newNamaspace', function(data){
    //   console.log(data);
    // });
  }]); 

tryApp.controller('homeController', ['$scope', function($scope){
  console.log('homeController');
  $scope.hi = function(){
    console.log('hi!');
  };
}]); 

tryApp.controller('playersController', ['$scope', '$http', 'namedSocket', '$location',function($scope, $http, namedSocket, $location){
  console.log('playersController');

  var generalBus = namedSocket('/');
  var userSocket = $scope.userSocket;

  $http.get('api/users-online')
  .then(function(response) {
    $scope.usersOnline = response.data;
  });

  generalBus.on('userList', function(data) {
    $scope.usersOnline = data;
    console.log(data);
  });

  $scope.invite = function (userId) {
    userSocket.emit('invite', userId)
  };

  $scope.usersInvites = [];

  userSocket.on('incomingInvite', function(data){
    $scope.usersInvites.push(data);
    console.log(data);
  })

  $scope.accept = function (userId) {
    userSocket.emit('accept', userId);
  };

  userSocket.on('startGame', function(data){
    $location.path('/game')
    $scope.data = data;
  });

}]); 
