"""Local helper integration: course routing and caches, without a speech-service call."""
from pathlib import Path
from tempfile import TemporaryDirectory
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer
from types import SimpleNamespace
import importlib.util
import json
import sys
import threading

root=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('helper',root/'voice_server.py')
helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
calls=[]
class FakeSpeech:
    def __init__(self,text,voice,**options):
        calls.append((text,voice,options['rate']))
        self.data=(voice+'|'+options['rate']+'|'+text).encode()*100
    async def stream(self):
        yield {'type':'audio','data':self.data}
sys.modules['edge_tts']=SimpleNamespace(Communicate=FakeSpeech)
with TemporaryDirectory() as directory:
    helper.CACHE=Path(directory)
    server=ThreadingHTTPServer(('127.0.0.1',0),helper.Handler)
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    def request(path,host=None):
        connection=HTTPConnection('127.0.0.1',server.server_port,timeout=5)
        connection.request('GET',path,headers={'Host':host} if host else {})
        response=connection.getresponse();body=response.read();status=response.status
        headers=dict(response.getheaders());connection.close();return status,body,headers
    try:
        status,body,_=request('/')
        assert status==200 and b'ONLINE_VOICE_COURSES=["en-zh", "en-ar-palestinian"]' in body
        status,body,_=request('/api/voice-status')
        assert status==200 and len(json.loads(body)['voices'])==2
        # The test ID exists in both courses; text and cached audio must stay distinct.
        _,zh,headers=request('/api/speech?id=test')
        assert calls[-1][1:] == ('zh-CN-XiaoxiaoNeural','+0%')
        _,ar,headers=request('/api/speech?course=en-ar-palestinian&id=test')
        assert ar!=zh and calls[-1][1:] == ('ar-JO-SanaNeural','+0%')
        assert calls[-1][0]==helper.TEXTS['en-ar-palestinian']['test']
        call_count=len(calls)
        _,cached,headers=request('/api/speech?course=en-ar-palestinian&id=test')
        assert cached==ar and headers['X-Speech-Cache']=='hit' and len(calls)==call_count
        _,slow,_=request('/api/speech?course=en-ar-palestinian&id=test&slow=1')
        assert slow!=ar and calls[-1][2]=='-28%'
        assert len(list(helper.CACHE.glob('*.mp3')))==3
        arabic_id=next(iter(helper.TEXTS['en-ar-palestinian']))
        assert request('/api/speech?course=en-zh&id='+arabic_id)[0]==400
        assert request('/api/speech?course=unknown&id=test')[0]==400
        assert request('/api/speech?course=en-ar-palestinian&id=unknown')[0]==400
        assert request('/api/speech?id=test&slow=2')[0]==400
        assert request('/',host='example.com')[0]==403
        assert request('/courses.json')[0]==404
    finally:
        server.shutdown();server.server_close();thread.join()
print('PASS helper: advertised courses, legacy Mandarin fallback, per-course text/voice/cache, slow rate, input validation and loopback host restriction (mock speech).')
