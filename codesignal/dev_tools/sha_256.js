/**
 * Password SHA-256 hash algorithm (taken from site source). Generates a hash of a
 * password which can then be sent to the server when logging in.
 * @param {string} password
 */

function passwordHash(password) {
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
