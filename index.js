var request = require('request');
var app = require('app');
var ipc = require('ipc');
var Menu = require('menu');
var MenuItem = require('menu-item');
var BrowserWindow = require('browser-window');

require('crash-reporter').start();

var mainWindow = null;
// var hostname = "http://localhost:3000"
var hostname = "https://fitentry.com";

app.on('window-all-closed', function() {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('ready', function() {
  var template = [];
  mainWindow = new BrowserWindow({
    width: 480,
    height: 360,
    'min-width': 480,
    'min-height': 280,
    frame: true
  });
  mainWindow.loadUrl('file://' + __dirname + '/index.html');
  mainWindow.on('closed', function() {
    mainWindow = null;
  });

  ipc.on('create-check-in', function(event, token, pin) {
    console.log(pin);
    var data = {
      check_in: {
        pin: pin
      }
    };
    var options = {
      url: hostname + '/api/check_ins',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'token ' + token
      },
      json: data
    };
    request.post(options,
      function(error, response, body) {
        if (response.statusCode == 200) {
          event.sender.send('created-check-in', body && body.check_in);
        }
        else {
          event.sender.send('check-in-failed');
        }
      }
    );
  });

  ipc.on('request-auth', function(event) {
    var sender = event.sender;
    var authUrl = hostname + "/oauth";

    var authWindow = new BrowserWindow({
      show: false
    });

    authWindow.loadUrl(authUrl);
    authWindow.show();
    authWindow.webContents.on('did-get-redirect-request', function(event, oldUrl, newUrl) {
      var token = /token=([^&]*)/.exec(newUrl) || null;
      if (token) {
        authWindow.close();
        sender.send('auth-received', token[1]);
      }
    });

    authWindow.on('close', function() {
      sender.send('auth-closed');
    }, false);

  });

});
