import urllib.request,urllib.error,json
base='http://localhost:5173'
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
status,raw,_=req('/api/auth/config');config=json.loads(raw);assert status==200 and not config['ready'];assert 'private_key' not in raw.decode() and 'SERVICE_ACCOUNT' not in raw.decode()
assert req('/api/admin')[0]==403
assert req('/api/admin',headers={'OAI-User-Email':'anbu.t80555@gmail.com','OAI-User-ID':'owner','Cookie':'anbu_owner=forged'})[0]==403
assert req('/api/admin',{'action':'publish','revision':0})[0]==403
assert req('/api/auth/session',{'idToken':'forged'},headers={'Origin':'https://other.example'})[0]==403
assert req('/api/auth/session',{'idToken':'forged'})[0]==503
assert req('/api/media',headers={'Origin':'https://other.example'},method='DELETE')[0]==403
assert req('/api/media/00000000-0000-4000-8000-000000000000')[0]==404
assert req('/api/resume-ai',{'task':'summary','facts':'fictional sample','consent':True})[0]==503
status,raw,_=req('/api/resume');assert status==200 and raw.startswith(b'%PDF')
status,raw,_=req('/pdf.worker.min.mjs');assert status==200 and b'dev-error-overlay' not in raw and b'/@vite/client' not in raw
assert req('/not-a-real-route')[0]==404
print('Public pages, security headers, locked unconfigured admin, forged identity/origin rejection, private media, unavailable AI, resume PDF, static PDF worker and 404 checks passed.')
