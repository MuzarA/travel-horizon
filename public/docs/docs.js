/* Nomad Horizon — self-hosted Swagger UI (no dependencies, works under CSP default-src 'self'). */
(function () {
  'use strict';
  var METHODS = ['get', 'post', 'put', 'patch', 'delete'];
  var app = document.getElementById('app');
  var spec, server, ops = [], starred = {};
  try { starred = JSON.parse(localStorage.getItem('nh-docs-stars') || '{}') || {}; } catch (e) { starred = {}; }

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function inline(s) {
    return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  }
  function md(text) {
    if (!text) return '';
    var out = [], list = null, para = null;
    function flushPara() { if (para) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = null; } }
    function flushList() { if (list) { out.push('<ul>' + list.map(function (i) { return '<li>' + inline(i) + '</li>'; }).join('') + '</ul>'); list = null; } }
    text.split(/\n/).forEach(function (line) {
      var m = line.match(/^\s*[*-]\s+(.*)$/);
      if (m) { flushPara(); if (!list) list = []; list.push(m[1]); return; }
      if (!line.trim()) { flushPara(); flushList(); return; }
      if (list && /^\s+/.test(line)) { list[list.length - 1] += ' ' + line.trim(); return; }
      flushList();
      if (!para) para = [];
      para.push(line.trim());
    });
    flushPara(); flushList();
    return out.join('');
  }
  function ref(r) {
    var node = spec;
    r.replace(/^#\//, '').split('/').forEach(function (k) { node = node && node[k]; });
    return node || {};
  }
  function refName(r) { return r.split('/').pop(); }
  function full(s) {
    if (!s) return {};
    if (s.$ref) return full(ref(s.$ref));
    if (s.allOf) {
      var merged = { type: 'object', properties: {}, required: [] };
      s.allOf.forEach(function (part) {
        var p = full(part);
        Object.keys(p).forEach(function (k) {
          if (k === 'properties') Object.assign(merged.properties, p.properties);
          else if (k === 'required') merged.required = merged.required.concat(p.required);
          else merged[k] = p[k];
        });
      });
      Object.keys(s).forEach(function (k) { if (k !== 'allOf') merged[k] = s[k]; });
      if (!Object.keys(merged.properties).length) delete merged.properties;
      return merged;
    }
    return s;
  }
  function example(s, depth) {
    depth = depth || 0;
    s = full(s);
    if (s.example !== undefined) return s.example;
    if (depth > 6) return null;
    if (s.enum) return s.enum[0];
    if (s.type === 'array') return [example(s.items, depth + 1)];
    if (s.type === 'object' || s.properties) {
      var o = {};
      Object.keys(s.properties || {}).forEach(function (k) {
        var v = example(s.properties[k], depth + 1);
        if (v !== null && v !== undefined) o[k] = v;
      });
      if (!s.properties && s.additionalProperties) o.key = example(s.additionalProperties, depth + 1);
      return o;
    }
    if (s.type === 'integer' || s.type === 'number') return s.minimum || 0;
    if (s.type === 'boolean') return true;
    if (s.format === 'date-time') return '2026-11-18T09:00:00Z';
    if (s.format === 'date') return '2026-11-18';
    if (s.format === 'binary') return '<binary>';
    if (s.type === 'string') return 'string';
    return null;
  }
  function typeLabel(s) {
    var name = s.$ref ? refName(s.$ref) : '';
    var f = full(s);
    var t = f.type || (f.properties ? 'object' : '');
    if (t === 'array') {
      var it = f.items || {};
      t = 'array[' + (it.$ref ? refName(it.$ref) : (full(it).type || '')) + ']';
    }
    if (name && f.type !== 'object' && !f.properties) t = name + ' (' + t + ')';
    else if (name) t = name;
    if (f.format) t += ' <' + f.format + '>';
    return t;
  }
  function limits(s) {
    var f = full(s), out = [];
    if (f.minLength != null || f.maxLength != null) out.push('length ' + (f.minLength || 0) + '–' + (f.maxLength != null ? f.maxLength : '∞'));
    if (f.minimum != null || f.maximum != null) out.push('range ' + (f.minimum != null ? f.minimum : '−∞') + '–' + (f.maximum != null ? f.maximum : '∞'));
    if (f.minItems != null || f.maxItems != null) out.push('items ' + (f.minItems || 0) + '–' + (f.maxItems != null ? f.maxItems : '∞'));
    if (f.pattern) out.push('pattern ' + f.pattern);
    if (f.nullable) out.push('nullable');
    return out;
  }
  function tree(s, depth, seen) {
    depth = depth || 0; seen = seen || [];
    var f = full(s);
    if (f.type === 'array' && f.items) {
      return '<span class="t">array</span> [<div class="prop">' + tree(f.items, depth + 1, seen) + '</div>]';
    }
    if (!f.properties) {
      var h = '<span class="t">' + esc(typeLabel(s)) + '</span>';
      if (f.enum) h += ' <span class="e">' + esc(f.enum.join(' | ')) + '</span>';
      var l = limits(s); if (l.length) h += ' <span class="c">' + esc(l.join(', ')) + '</span>';
      if (f.description) h += ' <span class="c">— ' + inline(f.description) + '</span>';
      if (f.additionalProperties && typeof f.additionalProperties === 'object') {
        h += ' <span class="c">{ key: </span>' + tree(f.additionalProperties, depth + 1, seen) + '<span class="c"> }</span>';
      }
      return h;
    }
    var name = s.$ref ? refName(s.$ref) : 'object';
    if (s.$ref && seen.indexOf(s.$ref) > -1) return '<span class="t">' + esc(name) + '</span> <span class="c">(see above)</span>';
    var next = s.$ref ? seen.concat(s.$ref) : seen;
    var req = f.required || [];
    var inner = Object.keys(f.properties).map(function (k) {
      return '<div class="prop"><span class="k' + (req.indexOf(k) > -1 ? ' r' : '') + '">' + esc(k) + '</span>: ' + tree(f.properties[k], depth + 1, next) + '</div>';
    }).join('');
    var desc = f.description ? ' <span class="c">— ' + inline(f.description) + '</span>' : '';
    return '<details' + (depth < 2 ? ' open' : '') + '><summary><span class="t">' + esc(name) + '</span> {' + desc + '</summary>' + inner + '}</details>';
  }
  function icon(name) {
    var p = {
      lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
      unlock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/>',
      star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
      chev: '<path d="M9 5l7 7-7 7"/>'
    }[name];
    return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }
  function saveStars() { try { localStorage.setItem('nh-docs-stars', JSON.stringify(starred)); } catch (e) { /* ignore */ } }

  /* ---------- render ---------- */
  function render() {
    var info = spec.info;
    var servers = spec.servers.slice();
    var here = location.protocol.indexOf('http') === 0 ? location.origin : '';
    var onSite = servers.some(function (s) { return s.url === here; });
    if (here && !onSite && !/claude|claudeusercontent|anthropic/.test(location.hostname)) {
      servers.unshift({ url: here, description: 'This site' });
    }
    server = (servers.filter(function (s) { return s.url === here; })[0] || servers[0]).url;

    ops = [];
    Object.keys(spec.paths).forEach(function (path) {
      METHODS.forEach(function (m) {
        var op = spec.paths[path][m];
        if (op) ops.push({ path: path, method: m, op: op, id: op.operationId || (m + path), tag: (op.tags || ['default'])[0] });
      });
    });

    var html = '';
    html += '<header class="top"><div class="title"><h1>' + esc(info.title) + '</h1>' +
      '<span class="pill">' + esc(info.version) + '</span><span class="pill oas">OAS ' + esc(spec.openapi) + '</span></div>' +
      '<p class="spec-link"><a href="openapi.json">openapi.json</a> · <a href="openapi.yaml">openapi.yaml</a>' +
      (info.contact && info.contact.url ? ' · <a href="' + esc(info.contact.url) + '">' + esc(info.contact.name || info.contact.url) + '</a>' : '') + '</p>' +
      '<div class="desc">' + md(info.description) + '</div></header>';

    html += '<div class="bar"><div class="field"><label for="srv">Servers</label><select id="srv">' +
      servers.map(function (s) { return '<option value="' + esc(s.url) + '"' + (s.url === server ? ' selected' : '') + '>' + esc(s.url) + ' — ' + esc(s.description || '') + '</option>'; }).join('') +
      '</select></div><div class="field grow"><label for="flt">Filter</label><input id="flt" type="search" placeholder="/api/hosts, POST, request…"></div>' +
      '<button class="btn auth" id="authBtn">' + icon('lock') + '<span>Authorize</span></button></div>';

    spec.tags.forEach(function (t) {
      var list = ops.filter(function (o) { return o.tag === t.name; });
      if (!list.length) return;
      html += '<section class="tag" data-tag="' + esc(t.name) + '"><button class="tag-head" data-act="tag"><h2>' + esc(t.name) + '</h2><span>' + esc(t.description || '') + '</span><i class="chev">' + icon('chev') + '</i></button><div class="ops">';
      list.forEach(function (o) { html += opRow(o); });
      html += '</div></section>';
    });

    html += '<section class="models" id="models"><button data-act="models"><span>Schemas</span><span class="chev">' + icon('chev') + '</span></button><div class="list">' +
      Object.keys(spec.components.schemas).map(function (n) {
        return '<details class="model"><summary>' + esc(n) + '</summary><div class="schema">' + tree({ $ref: '#/components/schemas/' + n }) + '</div></details>';
      }).join('') + '</div></section>';

    html += '<p class="foot">Nomad Horizon · OpenAPI ' + esc(spec.openapi) + ' · API version ' + esc(info.version) + '</p>';
    html += '<div class="overlay" id="ov"><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlgT">' +
      '<h2 id="dlgT">Admin authorization</h2><p class="note">Scheme <code>adminCookie</code>: <code>POST /api/login</code> sets the <code>th_admin</code> cookie (HttpOnly, 12 h). The browser then sends it with every 🔒 request automatically.</p>' +
      '<div class="row"><input id="pw" type="password" placeholder="Admin password" autocomplete="current-password"><button class="btn exec" id="loginBtn">Log in</button></div>' +
      '<div class="status" id="authStatus"></div>' +
      '<div class="actions"><button class="btn" id="logoutBtn">Log out</button><button class="btn" id="closeBtn">Close</button></div></div></div>';

    app.innerHTML = html;
    bind();
    checkSession();
  }

  function opRow(o) {
    var op = o.op, secure = op.security && op.security.length;
    var star = starred[o.id];
    return '<div class="op' + (op.deprecated ? ' deprecated' : '') + '" data-id="' + esc(o.id) + '" data-search="' + esc((o.method + ' ' + o.path + ' ' + (op.summary || '')).toLowerCase()) + '">' +
      '<div class="op-row" role="button" tabindex="0" data-act="toggle" aria-expanded="false">' +
      '<span class="method m-' + o.method + '">' + o.method.toUpperCase() + '</span>' +
      '<span class="op-text"><div class="op-path">' + esc(o.path) + '</div><div class="op-sum">' + esc(op.summary || '') + '</div></span>' +
      '<span class="icon lock' + (secure ? '' : ' open') + '" title="' + (secure ? 'Requires admin session (th_admin cookie)' : 'Public') + '">' + icon(secure ? 'lock' : 'unlock') + '</span>' +
      '<button class="star' + (star ? ' on' : '') + '" data-act="star" title="Star" aria-label="Star">' + icon('star').replace('fill="none"', star ? 'fill="currentColor"' : 'fill="none"') + '</button>' +
      '<span class="chev icon">' + icon('chev') + '</span></div>' +
      '<div class="op-body"></div></div>';
  }

  function opBody(o) {
    var op = o.op, h = '';
    if (op.description) h += '<div class="op-desc">' + md(op.description) + '</div>';
    var params = (op.parameters || []).map(function (p) { return p.$ref ? ref(p.$ref) : p; });
    h += '<h3>Parameters<span class="sp"></span><button class="btn small" data-act="try">Try it out</button></h3>';
    if (params.length) {
      h += '<table class="params"><tr><th>Name</th><th>Description</th></tr>' + params.map(function (p) {
        var ex = example(p.schema);
        return '<tr><td><span class="pname">' + esc(p.name) + '</span>' + (p.required ? '<span class="req">* required</span>' : '') +
          '<div class="ptype">' + esc(typeLabel(p.schema)) + ' (' + esc(p.in) + ')</div></td><td>' +
          (p.description ? '<div>' + inline(p.description) + '</div>' : '') +
          (full(p.schema).enum ? '<div class="ptype">' + esc(full(p.schema).enum.join(' | ')) + '</div>' : '') +
          '<input type="text" data-param="' + esc(p.name) + '" data-in="' + esc(p.in) + '" value="' + esc(ex) + '" disabled></td></tr>';
      }).join('') + '</table>';
    } else h += '<p class="note">No parameters</p>';

    var rb = op.requestBody;
    if (rb) {
      var types = Object.keys(rb.content);
      var main = types[0], sch = rb.content[main].schema;
      h += '<h3>Request body' + (rb.required ? ' <span class="req">required</span>' : '') + '<span class="sp"></span><span class="ctype">' + esc(types.join(', ')) + '</span></h3>';
      if (main === 'application/json') {
        h += '<div class="tabs" data-tabs><button class="on" data-act="tab" data-v="ex">Example Value</button><button data-act="tab" data-v="sc">Schema</button></div>' +
          '<div data-pane="ex"><textarea class="code" data-body readonly spellcheck="false">' + esc(JSON.stringify(example(sch), null, 2)) + '</textarea></div>' +
          '<div data-pane="sc" hidden><div class="schema">' + tree(sch) + '</div></div>';
      } else {
        h += '<p class="note">Raw binary file (' + esc(types.join(', ')) + ').</p><input type="file" data-file accept="' + esc(types.join(',')) + '" disabled>';
      }
    }

    h += '<div class="live" hidden><button class="btn exec" data-act="exec">Execute</button> <button class="btn" data-act="clear">Clear</button><div data-out></div></div>';

    h += '<h3>Responses</h3><table class="resp">' + Object.keys(op.responses).map(function (code) {
      var r = op.responses[code]; if (r.$ref) r = ref(r.$ref);
      var cell = '<div>' + inline(r.description || '') + '</div>';
      if (r.headers) cell += '<div class="ptype">Headers: ' + Object.keys(r.headers).map(esc).join(', ') + '</div>';
      if (r.content) {
        var t = Object.keys(r.content)[0], c = r.content[t];
        if (t === 'application/json') {
          var ex = c.example !== undefined ? c.example : example(c.schema);
          cell += '<div class="ctype">' + esc(t) + '</div><pre class="code">' + esc(JSON.stringify(ex, null, 2)) + '</pre>';
        } else cell += '<div class="ctype">' + esc(Object.keys(r.content).join(', ')) + '</div>';
      }
      return '<tr><td class="code-col s' + code[0] + '">' + esc(code) + '</td><td>' + cell + '</td></tr>';
    }).join('') + '</table>';
    return h;
  }

  /* ---------- try it out ---------- */
  function curl(method, url, ctype, body, secure) {
    var c = "curl -X '" + method.toUpperCase() + "' \\\n  '" + url + "'";
    c += " \\\n  -H 'accept: application/json'";
    if (secure) c += " \\\n  -b 'th_admin=<session token>'";
    if (ctype) c += " \\\n  -H 'Content-Type: " + ctype + "'";
    if (body && ctype === 'application/json') c += " \\\n  -d '" + body.replace(/'/g, "'\\''") + "'";
    else if (body) c += " \\\n  --data-binary '@image.jpg'";
    return c;
  }

  function execute(el, o) {
    var op = o.op, path = o.path, query = [];
    var bad = [];
    el.querySelectorAll('[data-param]').forEach(function (inp) {
      var v = inp.value.trim();
      if (!v) { if (inp.closest('tr').querySelector('.req')) bad.push(inp.dataset.param); return; }
      if (inp.dataset.in === 'path') path = path.replace('{' + inp.dataset.param + '}', encodeURIComponent(v));
      else if (inp.dataset.in === 'query') query.push(encodeURIComponent(inp.dataset.param) + '=' + encodeURIComponent(v));
    });
    var out = el.querySelector('[data-out]');
    if (bad.length) { out.innerHTML = '<div class="warn">Fill in required parameters: ' + esc(bad.join(', ')) + '</div>'; return; }
    var url = server.replace(/\/$/, '') + path + (query.length ? '?' + query.join('&') : '');
    var init = { method: o.method.toUpperCase(), credentials: 'include', headers: { accept: 'application/json' } };
    var ctype = null, bodyText = null;
    var ta = el.querySelector('[data-body]'), file = el.querySelector('[data-file]');
    if (ta) {
      bodyText = ta.value;
      try { JSON.parse(bodyText); } catch (e) { out.innerHTML = '<div class="warn">Request body is not valid JSON: ' + esc(e.message) + '</div>'; return; }
      ctype = 'application/json'; init.headers['Content-Type'] = ctype; init.body = bodyText;
    } else if (file) {
      var f = file.files[0];
      if (!f) { out.innerHTML = '<div class="warn">Choose an image file first.</div>'; return; }
      ctype = f.type || 'application/octet-stream'; init.headers['Content-Type'] = ctype; init.body = f; bodyText = 'file';
    }
    var secure = op.security && op.security.length;
    var head = '<h3>Curl</h3><pre class="code">' + esc(curl(o.method, url, ctype, bodyText, secure)) + '</pre><h3>Request URL</h3><pre class="code">' + esc(url) + '</pre>';
    out.innerHTML = head + '<p class="note">Sending…</p>';
    var t0 = Date.now();
    fetch(url, init).then(function (res) {
      var hdrs = []; res.headers.forEach(function (v, k) { hdrs.push(k + ': ' + v); });
      return res.text().then(function (txt) {
        var pretty = txt;
        try { pretty = JSON.stringify(JSON.parse(txt), null, 2); } catch (e) { /* not JSON */ }
        out.innerHTML = head + '<h3>Server response</h3><div class="meta"><span class="s' + String(res.status)[0] + '">' + res.status + ' ' + esc(res.statusText) + '</span> · ' + (Date.now() - t0) + ' ms</div>' +
          '<div class="ctype">Response body</div><pre class="code">' + esc(pretty || '(empty)') + '</pre>' +
          '<div class="ctype">Response headers</div><pre class="code">' + esc(hdrs.join('\n')) + '</pre>';
        if (o.path === '/api/login' || o.path === '/api/logout') checkSession();
      });
    }).catch(function (err) {
      out.innerHTML = head + '<div class="warn">The browser blocked or could not send the request (' + esc(err.message) + '). ' +
        'The API accepts requests only from its own site, so “Try it out” works when this page is opened at <code>' + esc(spec.servers[0].url) + '/docs/</code> or on the local server. The curl command above works from a terminal.</div>';
    });
  }

  /* ---------- auth ---------- */
  function setAuth(on) {
    var b = document.getElementById('authBtn');
    if (!b) return;
    b.classList.toggle('on', on);
    b.querySelector('span').textContent = on ? 'Authorized' : 'Authorize';
  }
  function checkSession() {
    fetch(server.replace(/\/$/, '') + '/api/session', { credentials: 'include' })
      .then(function (r) { return r.json(); })
      .then(function (j) { setAuth(!!j.authenticated); })
      .catch(function () { setAuth(false); });
  }
  function login() {
    var st = document.getElementById('authStatus'), pw = document.getElementById('pw').value;
    if (!pw) { st.textContent = 'Enter the admin password.'; return; }
    st.textContent = 'Logging in…';
    fetch(server.replace(/\/$/, '') + '/api/login', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw })
    }).then(function (r) { return r.json().then(function (j) { return { s: r.status, j: j }; }); })
      .then(function (x) {
        document.getElementById('pw').value = '';
        if (x.s === 200) { st.innerHTML = '<span class="s2">Logged in. Session valid for 12 hours.</span>'; setAuth(true); }
        else if (x.j.error === 'wrong_password') st.innerHTML = '<span class="s4">Wrong password. Attempts left: ' + esc(x.j.attemptsLeft) + '</span>';
        else if (x.j.error === 'blocked') st.innerHTML = '<span class="s5">Blocked. Try again in ' + Math.ceil((x.j.retryAfterSeconds || 0) / 60) + ' min.</span>';
        else st.innerHTML = '<span class="s5">Error: ' + esc(x.j.error || x.s) + '</span>';
      })
      .catch(function () { st.innerHTML = '<span class="s4">Could not reach the server from this page. Open the docs on the site itself (/docs/).</span>'; });
  }
  function logout() {
    fetch(server.replace(/\/$/, '') + '/api/logout', { method: 'POST', credentials: 'include' })
      .then(function () { document.getElementById('authStatus').textContent = 'Logged out.'; setAuth(false); })
      .catch(function () { document.getElementById('authStatus').textContent = 'Could not reach the server.'; });
  }

  /* ---------- events ---------- */
  function find(id) { return ops.filter(function (o) { return o.id === id; })[0]; }
  function bind() {
    document.getElementById('srv').addEventListener('change', function (e) { server = e.target.value; checkSession(); });
    document.getElementById('flt').addEventListener('input', function (e) {
      var q = e.target.value.trim().toLowerCase();
      document.querySelectorAll('.op').forEach(function (el) { el.hidden = q && el.dataset.search.indexOf(q) === -1; });
      document.querySelectorAll('.tag').forEach(function (t) {
        t.hidden = !t.querySelector('.op:not([hidden])');
        if (q) t.classList.remove('closed');
      });
    });
    var ov = document.getElementById('ov');
    document.getElementById('authBtn').addEventListener('click', function () { ov.classList.add('on'); document.getElementById('pw').focus(); });
    document.getElementById('closeBtn').addEventListener('click', function () { ov.classList.remove('on'); });
    ov.addEventListener('click', function (e) { if (e.target === ov) ov.classList.remove('on'); });
    document.getElementById('loginBtn').addEventListener('click', login);
    document.getElementById('pw').addEventListener('keydown', function (e) { if (e.key === 'Enter') login(); });
    document.getElementById('logoutBtn').addEventListener('click', logout);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') ov.classList.remove('on');
      if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset && e.target.dataset.act === 'toggle') { e.preventDefault(); e.target.click(); }
    });

    app.addEventListener('click', function (e) {
      var t = e.target.closest('[data-act]');
      if (!t) return;
      var act = t.dataset.act, opEl = t.closest('.op'), o = opEl && find(opEl.dataset.id);
      if (act === 'tag') { t.parentNode.classList.toggle('closed'); return; }
      if (act === 'models') { document.getElementById('models').classList.toggle('open'); return; }
      if (act === 'star') {
        e.stopPropagation();
        starred[o.id] = !starred[o.id]; if (!starred[o.id]) delete starred[o.id]; saveStars();
        t.classList.toggle('on', !!starred[o.id]);
        t.querySelector('svg').setAttribute('fill', starred[o.id] ? 'currentColor' : 'none');
        return;
      }
      if (act === 'toggle') {
        var body = opEl.querySelector('.op-body');
        if (!body.innerHTML) body.innerHTML = opBody(o);
        opEl.classList.toggle('open');
        t.setAttribute('aria-expanded', opEl.classList.contains('open'));
        if (opEl.classList.contains('open') && location.hash !== '#' + o.id) {
          try { history.replaceState(null, '', '#' + o.id); } catch (err) { /* ignore */ }
        }
        return;
      }
      if (act === 'tab') {
        var tabs = t.parentNode, wrap = tabs.parentNode;
        tabs.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b === t); });
        wrap.querySelectorAll('[data-pane]').forEach(function (p) { p.hidden = p.dataset.pane !== t.dataset.v; });
        return;
      }
      if (act === 'try') {
        var on = t.textContent === 'Try it out';
        t.textContent = on ? 'Cancel' : 'Try it out';
        opEl.querySelectorAll('[data-param],[data-file]').forEach(function (i) { i.disabled = !on; });
        var ta = opEl.querySelector('[data-body]'); if (ta) ta.readOnly = !on;
        if (on && ta) { var tb = opEl.querySelector('[data-tabs] button'); if (tb) tb.click(); }
        opEl.querySelector('.live').hidden = !on;
        return;
      }
      if (act === 'exec') { execute(opEl, o); return; }
      if (act === 'clear') { opEl.querySelector('[data-out]').innerHTML = ''; }
    });

    var id = location.hash.slice(1);
    if (id) {
      var el = document.querySelector('.op[data-id="' + id.replace(/[^\w-]/g, '') + '"]');
      if (el) { el.querySelector('[data-act="toggle"]').click(); el.scrollIntoView(); }
    }
  }

  /* ---------- load ---------- */
  function start(s) { spec = s; render(); }
  if (window.NH_OPENAPI) start(window.NH_OPENAPI);
  else fetch('openapi.json').then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(start)
    .catch(function (e) { app.innerHTML = '<p class="warn">Could not load openapi.json (' + esc(e.message) + ').</p>'; });
})();
