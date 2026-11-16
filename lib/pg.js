/* Minimal PostgreSQL client for Node.js 18+ using only built-in modules.
   Speaks the PostgreSQL wire protocol v3: TLS (with SNI, as Neon needs), SCRAM-SHA-256 and
   SCRAM-SHA-256-PLUS authentication, parameterised queries and transactions.
   One connection per process, used one query at a time — enough for this site and for
   serverless functions, where each instance handles one request at a time. */
'use strict';
const net = require('net');
const tls = require('tls');
const crypto = require('crypto');

const IDLE_RECONNECT_MS = 60 * 1000;   // a connection idle this long is replaced before use (Neon closes idle ones)
const QUERY_TIMEOUT_MS = 15 * 1000;

function parseUrl(url) {
  const u = new URL(url);
  if (!/^postgres(ql)?:$/.test(u.protocol)) throw new Error('DATABASE_URL must start with postgres:// or postgresql://');
  const q = u.searchParams;
  const local = /^(localhost|127\.0\.0\.1|::1)$/.test(u.hostname);
  const sslmode = q.get('sslmode') || (local ? 'disable' : 'require');
  return {
    host: u.hostname.replace(/^\[|\]$/g, ''), port: Number(u.port) || 5432,
    user: decodeURIComponent(u.username), password: decodeURIComponent(u.password),
    database: decodeURIComponent(u.pathname.slice(1)) || decodeURIComponent(u.username),
    sslmode, verify: sslmode === 'verify-full' || sslmode === 'verify-ca' || (sslmode === 'require' && !local),
    options: q.get('options') || ''
  };
}

/* ------------------------------------------------------------ encoding */
function cstr(s) { return Buffer.concat([Buffer.from(String(s), 'utf8'), Buffer.from([0])]); }
function int32(n) { const b = Buffer.alloc(4); b.writeInt32BE(n); return b; }
function int16(n) { const b = Buffer.alloc(2); b.writeInt16BE(n); return b; }
function msg(type, payload) {
  const body = Buffer.concat(payload);
  return Buffer.concat([Buffer.from(type, 'latin1'), int32(body.length + 4), body]);
}
function serialize(v) {
  if (v === null || v === undefined) return null;
  if (Buffer.isBuffer(v)) return '\\x' + v.toString('hex');
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/* ------------------------------------------------------------ decoding */
const PARSERS = {
  16: (v) => v === 't',
  20: Number, 21: Number, 23: Number, 26: Number, 700: Number, 701: Number, 1700: Number,
  114: JSON.parse, 3802: JSON.parse,
  17: (v) => Buffer.from(v.slice(2), 'hex'),
  1184: (v) => new Date(v.replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00')).toISOString(),
  1114: (v) => new Date(v.replace(' ', 'T') + 'Z').toISOString()
};

/* ---------------------------------------------------------------- SCRAM */
function hmac(key, data) { return crypto.createHmac('sha256', key).update(data).digest(); }
function sha256(data) { return crypto.createHash('sha256').update(data).digest(); }
function xor(a, b) { const out = Buffer.alloc(a.length); for (let i = 0; i < a.length; i++) out[i] = a[i] ^ b[i]; return out; }
function certHash(socket) {
  // tls-server-end-point (RFC 5929): hash of the server certificate; MD5/SHA-1 signatures use SHA-256.
  const cert = socket.getPeerCertificate && socket.getPeerCertificate();
  if (!cert || !cert.raw) return null;
  let alg = 'sha256';
  try {
    const x = new crypto.X509Certificate(cert.raw);
    const m = /sha(384|512)/i.exec(String(x.signatureAlgorithm || ''));
    if (m) alg = 'sha' + m[1];
  } catch (e) { /* keep sha256 */ }
  return crypto.createHash(alg).update(cert.raw).digest();
}

/* ----------------------------------------------------------- connection */
class Connection {
  constructor(cfg) {
    this.cfg = cfg; this.socket = null; this.buf = Buffer.alloc(0);
    this.handler = null; this.dead = false; this.lastUsed = Date.now();
  }

  connect() {
    const cfg = this.cfg;
    return new Promise((resolve, reject) => {
      let settled = false;
      const done = (err) => { if (settled) return; settled = true; clearTimeout(timer); err ? (this.destroy(), reject(err)) : resolve(); };
      const timer = setTimeout(() => done(new Error('database connection timed out')), 10000);
      const raw = net.connect({ host: cfg.host, port: cfg.port });
      raw.setNoDelay(true);
      raw.once('error', (e) => done(e));
      const startup = () => {
        this.attach(this.socket);
        const params = { user: cfg.user, database: cfg.database, client_encoding: 'UTF8', TimeZone: 'UTC', application_name: 'nomad-horizon' };
        if (cfg.options) params.options = cfg.options;
        const parts = [int32(196608)];
        for (const k in params) parts.push(cstr(k), cstr(params[k]));
        parts.push(Buffer.from([0]));
        const body = Buffer.concat(parts);
        this.handler = (type, data) => this.onAuth(type, data, done);
        this.socket.write(Buffer.concat([int32(body.length + 4), body]));
      };
      raw.once('connect', () => {
        if (cfg.sslmode === 'disable') { this.socket = raw; return startup(); }
        raw.write(Buffer.concat([int32(8), int32(80877103)]));      // SSLRequest
        raw.once('data', (b) => {
          if (b[0] === 0x53) {                                         // 'S' — server accepts TLS
            const servername = net.isIP(cfg.host) ? undefined : cfg.host;
            const s = tls.connect({ socket: raw, servername, rejectUnauthorized: cfg.verify });
            s.once('secureConnect', () => { this.socket = s; this.tls = true; startup(); });
            s.once('error', (e) => done(e));
          } else if (cfg.sslmode === 'prefer' || cfg.sslmode === 'allow') { this.socket = raw; startup(); }
          else done(new Error('the database server does not accept TLS'));
        });
      });
    });
  }

  attach(socket) {
    socket.removeAllListeners('error');
    socket.on('data', (chunk) => this.onData(chunk));
    socket.on('error', (e) => this.fail(e));
    socket.on('close', () => this.fail(new Error('database connection closed')));
  }

  onData(chunk) {
    this.buf = this.buf.length ? Buffer.concat([this.buf, chunk]) : chunk;
    while (this.buf.length >= 5) {
      const len = this.buf.readInt32BE(1);
      if (this.buf.length < len + 1) break;
      const type = String.fromCharCode(this.buf[0]);
      const data = this.buf.subarray(5, len + 1);
      this.buf = this.buf.subarray(len + 1);
      if (type === 'N' || type === 'S' || type === 'A') continue;     // notices, parameter status, notifications
      if (this.handler) this.handler(type, data);
    }
  }

  fail(err) {
    if (this.dead) return;
    this.dead = true;
    const h = this.handler; this.handler = null;
    if (h) h('!', err);
    this.destroy();
  }
  destroy() { this.dead = true; if (this.socket) { this.socket.destroy(); } }

  onAuth(type, data, done) {
    if (type === '!') return done(data);
    if (type === 'E') return done(pgError(data));
    if (type === 'R') {
      const code = data.readInt32BE(0);
      if (code === 0) return;                                        // AuthenticationOk
      if (code === 3) return this.socket.write(msg('p', [cstr(this.cfg.password)]));
      if (code === 5) {
        const salt = data.subarray(4, 8);
        const inner = crypto.createHash('md5').update(this.cfg.password + this.cfg.user).digest('hex');
        const outer = 'md5' + crypto.createHash('md5').update(Buffer.concat([Buffer.from(inner), salt])).digest('hex');
        return this.socket.write(msg('p', [cstr(outer)]));
      }
      if (code === 10) return this.scramStart(data.subarray(4).toString('utf8').split('\0').filter(Boolean), done);
      if (code === 11) return this.scramContinue(data.subarray(4).toString('utf8'), done);
      if (code === 12) return this.scramFinal(data.subarray(4).toString('utf8'), done);
      return done(new Error('unsupported authentication method ' + code));
    }
    if (type === 'K') return;
    if (type === 'Z') { this.handler = null; this.socket.unref && this.socket.unref(); return done(); }
  }

  scramStart(mechanisms, done) {
    const plus = this.tls && mechanisms.indexOf('SCRAM-SHA-256-PLUS') >= 0 && certHash(this.socket);
    if (!plus && mechanisms.indexOf('SCRAM-SHA-256') < 0) return done(new Error('server offers no supported SASL mechanism'));
    const mech = plus ? 'SCRAM-SHA-256-PLUS' : 'SCRAM-SHA-256';
    this.gs2 = plus ? 'p=tls-server-end-point,,' : (this.tls ? 'y,,' : 'n,,');
    this.cbind = plus ? certHash(this.socket) : Buffer.alloc(0);
    this.nonce = crypto.randomBytes(18).toString('base64');
    this.firstBare = 'n=*,r=' + this.nonce;
    const first = Buffer.from(this.gs2 + this.firstBare, 'utf8');
    this.socket.write(msg('p', [cstr(mech), int32(first.length), first]));
  }

  scramContinue(serverFirst, done) {
    const attrs = {};
    serverFirst.split(',').forEach((p) => { attrs[p[0]] = p.slice(2); });
    if (!attrs.r || !attrs.r.startsWith(this.nonce) || !attrs.s || !attrs.i) return done(new Error('invalid SCRAM server response'));
    const salted = crypto.pbkdf2Sync(this.cfg.password.normalize('NFKC'), Buffer.from(attrs.s, 'base64'), Number(attrs.i), 32, 'sha256');
    const clientKey = hmac(salted, 'Client Key');
    const finalNoProof = 'c=' + Buffer.concat([Buffer.from(this.gs2), this.cbind]).toString('base64') + ',r=' + attrs.r;
    const authMessage = this.firstBare + ',' + serverFirst + ',' + finalNoProof;
    const proof = xor(clientKey, hmac(sha256(clientKey), authMessage)).toString('base64');
    this.serverSignature = hmac(hmac(salted, 'Server Key'), authMessage).toString('base64');
    this.socket.write(msg('p', [Buffer.from(finalNoProof + ',p=' + proof, 'utf8')]));
  }

  scramFinal(serverFinal, done) {
    const v = /(?:^|,)v=([^,]+)/.exec(serverFinal);
    if (!v || v[1] !== this.serverSignature) done(new Error('database server signature mismatch'));
  }

  /* Runs one statement with parameters ($1, $2 …) using the extended query protocol. */
  run(text, params, simple) {
    return new Promise((resolve, reject) => {
      if (this.dead) return reject(new Error('database connection closed'));
      const fields = [], rows = [];
      let error = null, rowCount = 0;
      const timer = setTimeout(() => this.fail(new Error('database query timed out')), QUERY_TIMEOUT_MS);
      this.socket.ref && this.socket.ref();
      this.handler = (type, data) => {
        if (type === '!') { clearTimeout(timer); return reject(data); }
        if (type === 'T') {
          fields.length = 0;
          const n = data.readInt16BE(0); let o = 2;
          for (let i = 0; i < n; i++) {
            const end = data.indexOf(0, o);
            const name = data.toString('utf8', o, end); o = end + 1;
            const oid = data.readInt32BE(o + 6); o += 18;
            fields.push({ name, parse: PARSERS[oid] });
          }
        } else if (type === 'D') {
          const n = data.readInt16BE(0); let o = 2; const row = {};
          for (let i = 0; i < n; i++) {
            const len = data.readInt32BE(o); o += 4;
            const f = fields[i] || { name: 'c' + i };
            if (len < 0) { row[f.name] = null; continue; }
            const v = data.toString('utf8', o, o + len); o += len;
            row[f.name] = f.parse ? f.parse(v) : v;
          }
          rows.push(row);
        } else if (type === 'C') {
          const m = /(\d+)$/.exec(data.toString('utf8', 0, data.length - 1));
          rowCount = m ? Number(m[1]) : 0;
        } else if (type === 'E') {
          error = pgError(data);
        } else if (type === 'Z') {
          clearTimeout(timer);
          this.handler = null; this.lastUsed = Date.now();
          this.socket.unref && this.socket.unref();
          if (error) { error.query = text.slice(0, 200); return reject(error); }
          resolve({ rows, rowCount });
        }
      };
      if (simple) return this.socket.write(msg('Q', [cstr(text)]));
      const values = (params || []).map(serialize);
      const bind = [cstr(''), cstr(''), int16(0), int16(values.length)];
      values.forEach((v) => {
        if (v === null) bind.push(int32(-1));
        else { const b = Buffer.from(v, 'utf8'); bind.push(int32(b.length), b); }
      });
      bind.push(int16(0));
      this.socket.write(Buffer.concat([
        msg('P', [cstr(''), cstr(text), int16(0)]),
        msg('B', bind),
        msg('D', [Buffer.from('P'), cstr('')]),
        msg('E', [cstr(''), int32(0)]),
        msg('S', [])
      ]));
    });
  }

  close() {
    if (this.dead || !this.socket) return;
    try { this.socket.end(Buffer.concat([Buffer.from('X'), int32(4)])); } catch (e) { /* ignore */ }
    this.dead = true;
  }
}

function pgError(data) {
  const f = {}; let o = 0;
  while (o < data.length && data[o] !== 0) {
    const code = String.fromCharCode(data[o]);
    const end = data.indexOf(0, o + 1);
    f[code] = data.toString('utf8', o + 1, end); o = end + 1;
  }
  const e = new Error(f.M || 'database error');
  e.code = f.C; e.detail = f.D; e.constraint = f.n;
  return e;
}

/* ---------------------------------------------------------------- pool */
/* Creates a database handle: db.query(text, params) → { rows, rowCount }, db.tx(fn), db.exec(sql), db.end(). */
function createDb(url) {
  const cfg = parseUrl(url);
  let conn = null, chain = Promise.resolve();

  async function connection() {
    if (conn && !conn.dead && Date.now() - conn.lastUsed > IDLE_RECONNECT_MS) { conn.close(); conn = null; }
    if (!conn || conn.dead) { const c = new Connection(cfg); await c.connect(); conn = c; }
    return conn;
  }
  // Every use goes through one queue so a single connection is never shared mid-query.
  function exclusive(fn) {
    const next = chain.then(fn, fn);
    chain = next.catch(() => {});
    return next;
  }
  async function runWithRetry(text, params, simple) {
    const c = await connection();
    try { return await c.run(text, params, simple); }
    catch (e) {
      if (e.code || !c.dead) throw e;                 // a real SQL error: do not retry
      const fresh = await connection();               // the connection died (frozen function, idle close): retry once
      return fresh.run(text, params, simple);
    }
  }
  return {
    config: { host: cfg.host, database: cfg.database, ssl: cfg.sslmode !== 'disable' },
    query: (text, params) => exclusive(() => runWithRetry(text, params, false)),
    exec: (sql) => exclusive(() => runWithRetry(sql, null, true)),
    tx: (fn) => exclusive(async () => {
      const c = await connection();
      const q = (text, params) => c.run(text, params, false);
      await q('BEGIN');
      try { const out = await fn({ query: q, exec: (sql) => c.run(sql, null, true) }); await q('COMMIT'); return out; }
      catch (e) { if (!c.dead) await q('ROLLBACK').catch(() => {}); throw e; }
    }),
    end: () => exclusive(async () => { if (conn) conn.close(); conn = null; })
  };
}

module.exports = { createDb, parseUrl };
