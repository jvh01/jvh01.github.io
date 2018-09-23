const WebSocket = require('ws')
const {performance} = require('perf_hooks');

var serverTimeOffset = Date.now();

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

  /**
   * Password hash algorithm (taken from site source). Generates a hash of a
   * password which can then be sent to the server when logging in.
   * @param {string} password
   */
  static passwordHash(password) {
    let r = password;

    function n(r, n) {
      var t = (65535 & r) + (65535 & n),
          e = (r >> 16) + (n >> 16) + (t >> 16);
      return e << 16 | 65535 & t
    }
    function t(r, n) {
      return r >>> n | r << 32 - n
    }
    function e(r, n) {
      return r >>> n
    }
    function o(r, n, t) {
      return r & n ^ ~r & t
    }
    function a(r, n, t) {
      return r & n ^ r & t ^ n & t
    }
    function u(r) {
      return t(r, 2) ^ t(r, 13) ^ t(r, 22)
    }
    function f(r) {
      return t(r, 6) ^ t(r, 11) ^ t(r, 25)
    }
    function c(r) {
      return t(r, 7) ^ t(r, 18) ^ e(r, 3)
    }
    function i(r) {
      return t(r, 17) ^ t(r, 19) ^ e(r, 10)
    }
    function g(r, t) {
      var e = new Array(1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298), g = new Array(1779033703,3144134277,1013904242,2773480762,1359893119,2600822924,528734635,1541459225), h = new Array(64), C, v, d, m, A, l, S, k, P, y, w, b;
      r[t >> 5] |= 128 << 24 - t % 32,
      r[(t + 64 >> 9 << 4) + 15] = t;
      for (var P = 0; P < r.length; P += 16) {
        C = g[0],
        v = g[1],
        d = g[2],
        m = g[3],
        A = g[4],
        l = g[5],
        S = g[6],
        k = g[7];
        for (var y = 0; 64 > y; y++)
          16 > y ? h[y] = r[y + P] : h[y] = n(n(n(i(h[y - 2]), h[y - 7]), c(h[y - 15])), h[y - 16]),
          w = n(n(n(n(k, f(A)), o(A, l, S)), e[y]), h[y]),
          b = n(u(C), a(C, v, d)),
          k = S,
          S = l,
          l = A,
          A = n(m, w),
          m = d,
          d = v,
          v = C,
          C = n(w, b);
        g[0] = n(C, g[0]),
        g[1] = n(v, g[1]),
        g[2] = n(d, g[2]),
        g[3] = n(m, g[3]),
        g[4] = n(A, g[4]),
        g[5] = n(l, g[5]),
        g[6] = n(S, g[6]),
        g[7] = n(k, g[7])
      }
      return g
    }
    function h(r) {
      for (var n = Array(), t = (1 << d) - 1, e = 0; e < r.length * d; e += d)
        n[e >> 5] |= (r.charCodeAt(e / d) & t) << 24 - e % 32;
      return n
    }
    function C(r) {
      for (var n = "", t = 0; t < r.length; t++) {
        var e = r.charCodeAt(t);
        128 > e ? n += String.fromCharCode(e) : e > 127 && 2048 > e ? (n += String.fromCharCode(e >> 6 | 192),
        n += String.fromCharCode(63 & e | 128)) : (n += String.fromCharCode(e >> 12 | 224),
        n += String.fromCharCode(e >> 6 & 63 | 128),
        n += String.fromCharCode(63 & e | 128))
      }
      return n
    }
    function v(r) {
      for (var n = m ? "0123456789ABCDEF" : "0123456789abcdef", t = "", e = 0; e < 4 * r.length; e++)
        t += n.charAt(r[e >> 2] >> 8 * (3 - e % 4) + 4 & 15) + n.charAt(r[e >> 2] >> 8 * (3 - e % 4) & 15);
      return t
    }
    var d = 8
      , m = 0;
    return r = C(r),
    v(g(h(r), r.length * d))
  }
}

/** List of all active connections */
Connection.all = [];

module.exports = {
  Connection
};