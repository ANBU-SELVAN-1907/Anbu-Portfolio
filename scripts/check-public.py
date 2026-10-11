import urllib.request,urllib.error,json,os,re
base=os.environ.get('PORTFOLIO_TEST_URL','http://localhost:5174').rstrip('/')
def req(path,body=None,headers=None,method=None):
 h={'Origin':base,**(headers or {})}
 data=json.dumps(body).encode() if body is not None else None
 if data:h['Content-Type']='application/json'
 try:
  r=urllib.request.urlopen(urllib.request.Request(base+path,data=data,headers=h,method=method),timeout=15)
 except urllib.error.HTTPError as e:r=e
 return r.status,r.read(),r.headers
for page in ['/','/admin','/resume-builder']:
 status,body,h=req(page);assert status==200,(page,status)
 assert h.get('X-Content-Type-Options')=='nosniff'
 assert h.get('X-Frame-Options')=='DENY'
 policy=h.get('Content-Security-Policy','')
 assert "frame-ancestors 'none'" in policy and "object-src 'none'" in policy
 assert "'unsafe-eval'" not in policy
 nonce=re.search(r"'nonce-([^']+)'",policy).group(1)
 assert ('nonce="'+nonce+'"').encode() in body
 _,_,again=req(page)
 assert again.get('Content-Security-Policy')!=policy,'Nonces must change per request'
status,raw,_=req('/api/auth/config');config=json.loads(raw);assert status==200 and not config['ready'];assert 'private_key' not in raw.decode() and 'SERVICE_ACCOUNT' not in raw.decode()
assert req('/api/admin')[0]==403
assert req('/api/admin',headers={'OAI-User-Email':'anbu.t80555@gmail.com','OAI-User-ID':'owner','Cookie':'anbu_owner=forged'})[0]==403
assert req('/api/admin',{'action':'publish','revision':0})[0]==403
assert req('/api/auth/session',{'idToken':'forged'},headers={'Origin':'https://other.example'})[0]==403
assert req('/api/auth/session',{'idToken':'forged'})[0]==503
assert req('/api/auth/email',{'email':'anbu.t80555@gmail.com'})[0]==503
assert req('/api/auth/email',{'email':'anbu.t80555@gmail.com'},headers={'Origin':'https://other.example'})[0]==403
assert req('/api/auth/session',headers={'Origin':'https://other.example'},method='DELETE')[0]==403
status,_,headers=req('/api/auth/session',method='DELETE')
assert status==200 and 'Max-Age=0' in headers.get('Set-Cookie','') and 'Secure' in headers.get('Set-Cookie','')
assert req('/api/resume?preview=1')[0]==403
assert req('/api/media',headers={'Origin':'https://other.example'},method='DELETE')[0]==403
assert req('/api/media/00000000-0000-4000-8000-000000000000')[0]==404
assert req('/api/resume-ai',{'task':'summary','facts':'fictional sample','consent':True})[0]==503
status,raw,_=req('/api/resume');assert status==200 and raw.startswith(b'%PDF')
status,raw,_=req('/pdf.worker.min.mjs');assert status==200 and b'dev-error-overlay' not in raw and b'/@vite/client' not in raw
assert req('/not-a-real-route')[0]==404
print('Public pages, security headers, locked unconfigured admin, forged identity/origin rejection, private media, unavailable AI, resume PDF, static PDF worker and 404 checks passed.')
