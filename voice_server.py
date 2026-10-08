#!/usr/bin/env python3
"""Loopback-only app server with on-demand course-specific speech. No audio bundle."""
import argparse, asyncio, hashlib, json, os, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

ROOT=Path(__file__).resolve().parent
# Explicitly configured providers; a locale label is not a dialect guarantee.
VOICES={'en-zh':'zh-CN-XiaoxiaoNeural','en-ar-palestinian':'ar-JO-SanaNeural'}
REGISTRY=json.loads((ROOT/'courses.json').read_text())
TEXTS={}
for course in REGISTRY['courses']:
    if course['id'] not in VOICES or not course.get('localSpeechHelper'):continue
    deck_path=(ROOT/course['deckFile']).resolve()
    if not deck_path.is_relative_to(ROOT.resolve()):raise ValueError('Invalid deck path')
    deck=json.loads(deck_path.read_text())
    field=course.get('cardFields',{}).get('text','text')
    TEXTS[course['id']]={card['id']:card[field] for card in deck}
    TEXTS[course['id']]['test']=course['testText']
CACHE=ROOT/'.speech-cache'
GATE=threading.BoundedSemaphore(2)
MAX_FILES=128
MAX_BYTES=8*1024*1024

def prune_cache():
    files=sorted(CACHE.glob('*.mp3'),key=lambda p:p.stat().st_mtime)
    total=sum(p.stat().st_size for p in files)
    while files and (len(files)>MAX_FILES or total>MAX_BYTES):
        path=files.pop(0)
        try:
            size=path.stat().st_size;path.unlink();total-=size
        except FileNotFoundError:pass

CACHE_LOCK=threading.Lock()
def recording(card_id,slow=False,course_id='en-zh'):
    import edge_tts
    text=TEXTS[course_id][card_id];voice=VOICES[course_id];rate='-28%' if slow else '+0%'
    digest=hashlib.sha256((course_id+'\0'+voice+'\0'+rate+'\0'+text).encode()).hexdigest()
    CACHE.mkdir(exist_ok=True)
    path=CACHE/(digest+'.mp3')
    with CACHE_LOCK:
        if path.exists():
            data=path.read_bytes();path.touch();return data,True
    async def generate():
        parts=[]
        async for chunk in edge_tts.Communicate(text,voice,rate=rate,connect_timeout=10,receive_timeout=20).stream():
            if chunk['type']=='audio':parts.append(chunk['data'])
        return b''.join(parts)
    data=asyncio.run(asyncio.wait_for(generate(),timeout=35))
    if len(data)<1000:raise ValueError('Speech service returned no audio')
    with CACHE_LOCK:
        path.write_bytes(data);prune_cache()
    return data,False

class Handler(BaseHTTPRequestHandler):
    def log_message(self,fmt,*args):
        # Log paths/status only, never card text or credentials.
        print(fmt%args,flush=True)
    def send(self,status,data,mime='text/plain; charset=utf-8',headers=None):
        self.send_response(status);self.send_header('Content-Type',mime)
        self.send_header('Content-Length',str(len(data)))
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        for k,v in (headers or {}).items():self.send_header(k,v)
        self.end_headers()
        try:self.wfile.write(data)
        except (BrokenPipeError,ConnectionResetError):pass
    def do_GET(self):
        allowed={f'127.0.0.1:{self.server.server_port}',f'localhost:{self.server.server_port}'}
        if self.headers.get('Host') not in allowed:
            return self.send(403,b'Localhost access only')
        url=urlsplit(self.path)
        if url.path in ['/','/index.html']:
            html=(ROOT/'index.html').read_text()
            flags='window.ONLINE_VOICE_ENABLED=true;window.ONLINE_VOICE_COURSES='+json.dumps(list(TEXTS))+';'
            html=html.replace('<script>','<script>'+flags+'</script><script>',1)
            return self.send(200,html.encode(),'text/html; charset=utf-8')
        assets={'/sw.js':'application/javascript','/manifest.webmanifest':'application/manifest+json','/icon.svg':'image/svg+xml','/icon-192.png':'image/png','/icon-512.png':'image/png'}
        if url.path in assets:
            return self.send(200,(ROOT/url.path[1:]).read_bytes(),assets[url.path])
        if url.path=='/api/voice-status':
            return self.send(200,json.dumps({'voices':{key:VOICES[key] for key in TEXTS},'mode':'online','app':'mandarin-remember','cacheLimitFiles':MAX_FILES,'cacheLimitBytes':MAX_BYTES}).encode(),'application/json')
        if url.path!='/api/speech':return self.send(404,b'Not found')
        args=parse_qs(url.query);course_id=args.get('course',['en-zh'])[0];card_id=args.get('id',[''])[0];slow=args.get('slow',['0'])[0]
        if course_id not in TEXTS or card_id not in TEXTS[course_id] or slow not in ['0','1']:return self.send(400,b'Unknown course, card or speed')
        if not GATE.acquire(blocking=False):return self.send(429,b'Speech busy; try again')
        try:
            data,cached=recording(card_id,slow=='1',course_id)
            self.send(200,data,'audio/mpeg',{'X-Speech-Cache':'hit' if cached else 'miss'})
        except Exception as error:
            print('Speech service error:',type(error).__name__,flush=True)
            self.send(502,b'Speech service unavailable; check internet and retry')
        finally:GATE.release()

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8766);args=parser.parse_args()
    if not 1024<=args.port<=65535:parser.error('port must be between 1024 and 65535')
    server=ThreadingHTTPServer(('127.0.0.1',args.port),Handler)
    print(f'Open http://127.0.0.1:{args.port} — voices: {", ".join(VOICES[c] for c in TEXTS)}. Ctrl+C stops the server.',flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()
