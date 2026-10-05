from pathlib import Path
import urllib.request, urllib.error, http.cookiejar, json, uuid
base='http://localhost:5173'
jar=http.cookiejar.CookieJar();client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
def req(path,data=None,method=None,origin=True,auth=True,headers=None):
 h=headers or {};h.update({'Origin':base} if origin else {'Origin':'https://other.example'})
 if isinstance(data,dict):data=json.dumps(data).encode();h['Content-Type']='application/json'
 request=urllib.request.Request(base+path,data=data,headers=h,method=method)
 try:
  r=(client if auth else urllib.request.build_opener()).open(request);raw=r.read();status=r.status
 except urllib.error.HTTPError as e:status=e.code;raw=e.read()
 try:body=json.loads(raw)
 except:body=raw
 return status,body
assert req('/api/admin',auth=False)[0]==403
assert req('/api/admin',{'action':'save'},auth=False)[0]==403
assert req('/signin-with-chatgpt?return_to=/admin')[0]==200
status,state=req('/api/admin');assert status==200,(status,state)
original=state['draft'];revision=state['revision']
assert req('/api/admin',{'action':'save','content':original,'revision':revision},origin=False)[0]==403
invalid=json.loads(json.dumps(original));invalid['profile']['github']='javascript:alert(1)'
assert req('/api/admin',{'action':'save','content':invalid,'revision':revision})[0]==400
modified=json.loads(json.dumps(original));modified['profile']['intro']='Local QA draft persistence check.'
s,b=req('/api/admin',{'action':'save','content':modified,'revision':revision});assert s==200,(s,b);revision=b['revision']
s,read=req('/api/admin');assert read['draft']['profile']['intro']==modified['profile']['intro'];assert read['published']['profile']['intro']!=modified['profile']['intro']
assert req('/api/admin',{'action':'save','content':original,'revision':revision-1})[0]==409
s,b=req('/api/admin',{'action':'publish','revision':revision});assert s==200;revision=b['revision']
s,read=req('/api/admin');assert read['published']['profile']['intro']==modified['profile']['intro']
s,b=req('/api/admin',{'action':'save','content':original,'revision':revision});assert s==200;revision=b['revision']
s,b=req('/api/admin',{'action':'publish','revision':revision});assert s==200;revision=b['revision']
s,read=req('/api/admin');restore=read['history'][0]['id']
s,b=req('/api/admin',{'action':'restore','id':restore,'revision':revision});assert s==200
s,b=req('/api/contact',{'name':'QA Test','email':'qa@example.com','message':'Local integration test of the contact inbox.','website':''},auth=False);assert s==200,(s,b)
s,read=req('/api/admin');msg=next(m for m in read['messages'] if m['email']=='qa@example.com');assert req('/api/admin',{'action':'read','id':msg['id']})[0]==200;assert req('/api/admin',{'action':'delete-message','id':msg['id']})[0]==200
assert req('/api/contact',{'name':'Q','email':'wrong','message':'short'},auth=False)[0]==400
boundary='----QA'+uuid.uuid4().hex
raw=(' --').encode()
payload=(f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="test.pdf"\r\nContent-Type: application/pdf\r\n\r\n').encode()+b'%PDF-1.4\nQA test\n'+f'\r\n--{boundary}--\r\n'.encode()
s,media=req('/api/media',payload,headers={'Content-Type':'multipart/form-data; boundary='+boundary});assert s==200,(s,media)
assert req(media['url'],auth=False)[0]==404
assert req(media['url'])[0]==200
assert req('/api/media?id='+media['id'],method='DELETE')[0]==200
s,pdf=req('/api/resume',auth=False);assert s==200 and pdf.startswith(b'%PDF-1.4')
Path('tmp').mkdir(exist_ok=True);Path('tmp/resume-check.pdf').write_bytes(pdf)
print('PASS: owner sign-in, unauthorized rejection, CSRF rejection, schema validation, draft persistence, published isolation, stale edit protection, publish, restore, contact inbox, mark read, delete, media upload/private access/delete, generated PDF.')
