const WebSocket = require('ws')
const {performance} = require('perf_hooks');

var serverTimeOffset = Date.now();
var log = (...args) => console.log('[' + new Date().toJSON() + '] ', ...args);

/**
 * @fileoverview Manages the connection to the CodeFights servers.
 * @author jakzo
 *
 * Since there doesn't seem to be a way to get an up-to-date list of challenges
 * using pure HTTP requests, I had to mimic what the browser does to set up a
 * WebSocket connection with CodeFights. I know nothing about the internals of
 * Meteor - I just reverse-engineered this using Chrome developer tools. This
 * means it's highly likely to break as soon as CodeFights or Meteor change
 * anything.
 */

/**
 * Connection class.
 * Creates a new connection to the CodeFights servers.
 */
class Connection {
  constructor({ username: username, passHash: passHash }) {
    this.status = 'closed';

    // Aparently it's possible to receive a server number, but I've never gotten
    // one - it always defaults to a random number between 0 and 999...
    this.server = 0; //Math.random() * 1000 | 0;
    // The random string is 8 alpha-numeric characters
    this.randomString = Math.random().toString(36).substr(2, 8);
    // The server seems to only accept secure WebSocket connections
    this.protocol = 'wss';
    this.host = 'app.codesignal.com';
    this.path = '/sockjs/' + this.server + '/' + this.randomString + '/websocket';
    this.url = this.protocol + '://' + this.host + this.path;

    // The current auto-incrementing ID used to identify request responses
    this.currentId = 0;
    // List of callbacks for requests by ID
    this.callbacks = {};
    // List of requests waiting to be sent
    this.queue = [];
    this.events = {};

    this.openedAt = 0;

    // Login
    this.loggedIn = !!username;
    this.username = username;
    this.passHash = passHash;

    // Connect!
    this.connect();
  }

  /**
   * Connects to the server.
   */
  connect() {
    console.log(this.url);
    if (this.status != 'closed') return;
    this.status = 'connecting';
    this.socket = new WebSocket(this.url);
    this.socket.addEventListener('open', (e) => {
      log('Socket opened!');
      this.status = 'connected';
      Connection.all.push(this);
      this.openedAt = Date.now();

      // The server will not let us retreive the challenge list unless we send
      // this connection request
      this.socket.send(JSON.stringify([JSON.stringify({
        msg: 'connect',
        version: '1',
        support: [ '1' ]
      })]));

      // Get the server time before finishing the connection phase
      this.send({
        msg: 'method',
        method: 'getServerTime',
        params: []
      }, (time) => {
        if (time > 0) {
          let now = performance.now();
          serverTimeOffset = Math.floor(time - now);
        }
        this.fireEvent('connect', null);
        this.sendPending();
      });

      // Login if we have credentials
      if (this.username) {
        this.send({
          msg: 'method',
          method: 'login',
          params: [{
            user: {
              username: this.username
            },
            password: {
              digest: this.passHash,
              algorithm: 'sha-256'
            }
          }]
        });
      }
    }, false);
    this.socket.addEventListener('message', (e) => {
      // The first character specifies the type of the message
      var type = e.data[0],
          // The rest contains the message body
          body = e.data.slice(1);
      this.fireEvent('message', { type: type, body: body });

      switch (type) {

        // On open:
        case 'o':
          log('Socket open notification.');
          break;

        // On data:
        case 'a':
          // Data comes as a JSON array of JSON strings
          // Parse the JSON-ception
          let data = JSON.parse(JSON.parse(body)[0]);
          log('Received:', data);

          // If they send us a 'ping', we need to send back a 'pong' so that
          // they know we're still alive
          if (data.msg == 'ping') {
            this.socket.send(JSON.stringify([JSON.stringify({ msg: 'pong' })]));
            this.fireEvent('ping', null);
          }

          // Requests and responses are linked using the 'id' property
          else {
            this.fireEvent('data', data);
            let index = this.queue.findIndex((item) => item.data.id == data.id);
            if (index >= 0) {
              let request = this.queue[index];
              this.queue.splice(index, 1);
              clearTimeout(request.timeout);
              if (request.onSuccess) request.onSuccess(data.result);
            }
          }
          break;

        // On close:
        case 'c':
          // The server is telling us that they're closing the socket :'(
          log('Socket close notification.');
          break;

        default:
          log('Unknown message received: ' + e.data);
          this.fireEvent('unknown', e.data);
      }
    }, false);
    this.socket.addEventListener('close', (e) => {
      log('Socket closed!');
      this.status = 'closed';
      Connection.all = Connection.all.filter((connection) => {
        return connection != this;
      });

      // Remove requests waiting for a response from the queue
      this.queue = this.queue.filter((request) => {
        if (request.data.status == 'sent') {
          if (this.callbacks.hasOwnProperty(request.data.id)) {
            delete this.callbacks[request.data.id];
          }
          return false;
        }
        else return true;
      });

      this.fireEvent('close', null);
    }, false);
  }

  /**
   * Sends a message through the connection.
   * @param {any} data - The data to be converted to JSON and sent.
   * @param {Function(any)} onSuccess - The function to call with the response
   *                                    when it is received.
   */
  send(data, onSuccess) {

    // Push the request to the queue
    if (!data.id) data.id = ++this.currentId + '';
    let request = {
      status: 'pending',
      onSuccess: onSuccess,
      data: data
    };
    this.queue.push(request);
    this.sendPending();
  }

  /**
   * Sends all pending requests from the queue.
   */
  sendPending() {
    if (this.status == 'connected') {
      this.queue.forEach((request, i) => {
        if (request.status == 'pending') {
          this.socket.send(JSON.stringify([ JSON.stringify(request.data) ]));
          if (request.data.name == 'unseenChallenges') {
            console.log(Date.now() / 1000 | 0, 'Resub sent');
          }
          request.status = 'sent';
          log('Sent:', request.data);
          setTimeout(() => {
            this.queue.splice(i, 1);
          }, 60 * 1000);
        }
      });
    }
    else if (this.status == 'closed') {
      this.connect();
    }
  }

  /**
   * Closes the connection.
   */
  close() {
    if (this.socket) this.socket.close();
  }

  /**
   * Subscribes to a connection event.
   */
  on(eventName, callback) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    this.events[eventName].push(callback);
  }

  /**
   * Executes all the callbacks for a particular event.
   */
  fireEvent(eventName, data) {
    let callbacks = this.events[eventName];
    if (callbacks) {
      callbacks.forEach((callback) => callback(data));
    }
  }
}

/** List of all active connections */
Connection.all = [];

module.exports = {
  Connection
};