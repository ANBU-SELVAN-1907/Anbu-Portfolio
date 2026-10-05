"""Local integration checks for the new content schema, privacy analytics, and AI setup.
Run against the loopback development server, never against production.
"""
import json, urllib.request, urllib.error, http.cookiejar

BASE='http://localhost:5173'
jar=http.cookiejar.CookieJar()
client=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
def request(path,data=None,origin=BASE,auth=True):
    headers={'Origin':origin}
    if data is not None:
        data=json.dumps(data).encode();headers['Content-Type']='application/json'
    try:
        r=(client if auth else urllib.request.build_opener()).open(urllib.request.Request(BASE+path,data=data,headers=headers))
        status=r.status;raw=r.read()
    except urllib.error.HTTPError as e:status=e.code;raw=e.read()
    try:return status,json.loads(raw)
    except:return status,raw

assert request('/signin-with-chatgpt?return_to=/admin')[0]==200
status,state=request('/api/admin');assert status==200
original=state['draft'];revision=state['revision']
try:
    bad=json.loads(json.dumps(original));bad['settings']['paperColor']='url(javascript:alert(1))'
    assert request('/api/admin',{'action':'save','revision':revision,'content':bad})[0]==400
    modified=json.loads(json.dumps(original));modified['settings']['heroStamp']='BUILD\nWITH\nCARE'
    modified['faq'][0]['description']='QA: an editable answer preserved through the server schema.'
    status,saved=request('/api/admin',{'action':'save','revision':revision,'content':modified});assert status==200,(status,saved)
    revision=saved['revision'];status,current=request('/api/admin')
    assert current['draft']['settings']['heroStamp']==modified['settings']['heroStamp']
    assert current['published']['settings']['heroStamp']!=modified['settings']['heroStamp']
    assert current['draft']['faq'][0]['description']==modified['faq'][0]['description']
finally:
    status,current=request('/api/admin')
    status,saved=request('/api/admin',{'action':'save','revision':current['revision'],'content':original})
    assert status==200,(status,saved)

status,chat=request('/api/chat');assert status==200 and isinstance(chat['ready'],bool)
assert 'key' not in json.dumps(chat).lower()
assert request('/api/chat',{'messages':[{'role':'user','text':'What did Anbu build?'}]},origin='https://other.example',auth=False)[0]==403
if not chat['ready']:
    status,body=request('/api/chat',{'messages':[{'role':'user','text':'What did Anbu build?'}]},auth=False)
    assert status==503 and 'configuration' in body['error']
assert request('/api/analytics',{'event':'view','source':'linkedin'},origin='https://other.example',auth=False)[0]==403
assert request('/api/analytics',{'event':'view','source':'https://invalid.example/private?secret=1'},auth=False)[0]==400
status,body=request('/api/analytics',{'event':'form_attempt'},auth=False);assert status==200
status,body=request('/api/analytics',{'event':'view','source':'qa_editorial'},auth=False);assert status==200
status,state=request('/api/admin');assert any(x['source']=='qa_editorial' for x in state['sources'])
assert isinstance(state['analytics'][0]['attempts'],int)
status,html=request('/',auth=False);assert status==200
assert b'/anbu-original.png' in html and b'Learning, with receipts.' in html
assert b'https://www.linkedin.com/in/anbu-selvan-t' in html
assert request('/missing-editorial-page',auth=False)[0]==404
print('PASS: editable theme/stamp/FAQ schema, unsafe color rejection, draft isolation, restoration, chat readiness/no-secret response, cross-origin chat rejection, honest missing-key response, analytics source validation/aggregation, form attempts, original portrait, credentials, latest LinkedIn, 404.')
