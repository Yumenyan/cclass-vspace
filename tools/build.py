#!/usr/bin/env python3
"""Build index.html: inline sources, encrypt member.js with per-user passwords.
Usage: python tools/build.py [--reset ID ...]   (needs: pip install cryptography)"""
import argparse, base64, hashlib, json, os, secrets, sys
from pathlib import Path
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
ROOT = Path(__file__).resolve().parent.parent
ITER = 600000
ALPHA = 'abcdefghjkmnpqrstuvwxyz23456789'   # no look-alike chars, phone-keyboard friendly
b64 = lambda x: base64.b64encode(x).decode()
def idhash(i): return hashlib.sha256(('cc:' + i.strip().lower()).encode()).hexdigest()[:16]
def js_safe(s): return s.replace('</', '<\\/')

ap = argparse.ArgumentParser(); ap.add_argument('--reset', nargs='*', default=[]); a = ap.parse_args()
accounts = json.loads((ROOT / 'tools/accounts.json').read_text())
sp = ROOT / 'tools/secrets.local.json'
sec = json.loads(sp.read_text()) if sp.exists() else {}
sec.setdefault('datakey', b64(os.urandom(32)))
pw = sec.setdefault('passwords', {})
new = {}
for acc in accounts:
    if acc not in pw or acc in a.reset:
        pw[acc] = ''.join(secrets.choice(ALPHA) for _ in range(16)); new[acc] = pw[acc]
for acc in list(pw):
    if acc not in accounts: del pw[acc]
sp.write_text(json.dumps(sec, indent=1))
dk = base64.b64decode(sec['datakey'])

member = (ROOT / 'src/member.js').read_text().replace('@@IDS@@', json.dumps(accounts))
bi = os.urandom(12)
users = []
for acc in accounts:
    salt, iv = os.urandom(16), os.urandom(12)
    key = hashlib.pbkdf2_hmac('sha256', pw[acc].encode(), salt, ITER, 32)
    users.append({'h': idhash(acc), 's': b64(salt), 'i': b64(iv), 'd': b64(AESGCM(key).encrypt(iv, dk, None))})
enc = {'n': ITER, 'u': users, 'bi': b64(bi), 'b': b64(AESGCM(dk).encrypt(bi, member.encode(), None))}

cfg = json.loads((ROOT / 'config.json').read_text())
html = (ROOT / 'src/index.template.html').read_text()
for k, v in {'@@ENC@@': json.dumps(enc), '@@CFG@@': js_safe(json.dumps(cfg, ensure_ascii=False)),
             '@@WORLD@@': js_safe((ROOT / 'src/world.js').read_text()), '@@AUTH@@': js_safe((ROOT / 'src/auth.js').read_text())}.items():
    html = html.replace(k, v)
(ROOT / 'index.html').write_text(html)
print('built index.html (%d KB)' % (len(html) // 1024))
if new:
    print('NEW PASSWORDS (shown once; also saved in tools/secrets.local.json — never commit):')
    for k, v in new.items(): print('  %-12s %s' % (k, v))
