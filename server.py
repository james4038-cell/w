"""Single-process ASGI server: static assets and anonymous multiplayer rooms."""
import asyncio
import json
import mimetypes
import re
import time
import uuid
from pathlib import Path
from urllib.parse import parse_qs
from validation import sanitize

PUBLIC = Path(__file__).parent.joinpath('public').resolve()
ROOMS = {}

async def response(send, status, body, content_type='application/json; charset=utf-8'):
    await send({'type':'http.response.start','status':status,'headers':[
        (b'content-type',content_type.encode()), (b'cache-control',b'no-store'),
        (b'x-content-type-options',b'nosniff')]})
    await send({'type':'http.response.body','body':body})

async def app(scope, receive, send):
    if scope['type'] == 'lifespan':
        while True:
            event = await receive()
            if event['type'] == 'lifespan.startup':
                await send({'type':'lifespan.startup.complete'})
            elif event['type'] == 'lifespan.shutdown':
                await send({'type':'lifespan.shutdown.complete'})
                return
    elif scope['type'] == 'http':
        path = scope['path']
        if path in ('/api/config', '/healthz'):
            await response(send,200,json.dumps({'name':'ITGYEOL','multiplayer':True,
                'wsPath':'/ws','defaultRoom':'itgyeol','roomCapacity':24}).encode())
            return
        if scope['method'] not in ('GET','HEAD'):
            await response(send,405,b'{"error":"Method not allowed"}')
            return
        file = (PUBLIC / ('index.html' if path == '/' else path.lstrip('/'))).resolve()
        if not file.is_relative_to(PUBLIC) or not file.is_file():
            await response(send,404,b'{"error":"Not found"}')
            return
        content_type = mimetypes.guess_type(file.name)[0] or 'application/octet-stream'
        if file.suffix == '.js': content_type = 'text/javascript; charset=utf-8'
        body = await asyncio.to_thread(file.read_bytes)
        await response(send,200,b'' if scope['method']=='HEAD' else body,content_type)
    elif scope['type'] == 'websocket':
        await multiplayer(scope, receive, send)

async def multiplayer(scope, receive, send):
    await receive()
    room = parse_qs(scope.get('query_string',b'').decode('utf-8',errors='replace')).get('room',['itgyeol'])[0]
    if scope['path'] != '/ws' or not re.fullmatch(r'[a-zA-Z0-9_-]{1,30}',room):
        await send({'type':'websocket.close','code':1008}); return
    members = ROOMS.setdefault(room,{})
    if len(members) >= 24:
        await send({'type':'websocket.close','code':1013}); return
    identity = str(uuid.uuid4())
    latest = sanitize({'type':'move','x':0,'z':7},identity)
    members[identity] = latest
    async def emit(packet):
        await send({'type':'websocket.send','text':json.dumps(packet)})
    task = None
    try:
        await send({'type':'websocket.accept'})
        await emit({'type':'welcome','id':identity,'peers':[p for id,p in members.items() if id!=identity]})
        async def incoming():
            last = 0
            while True:
                event = await receive()
                if event['type'] == 'websocket.disconnect': return
                raw = event.get('text','')
                if not isinstance(raw,str) or len(raw)>2048: continue
                try: packet = sanitize(json.loads(raw),identity)
                except (ValueError,TypeError): continue
                if packet and time.monotonic()-last >= .075:
                    members[identity] = packet
                    last = time.monotonic()
        task = asyncio.create_task(incoming())
        previous = set()
        while not task.done():
            current = {id:p for id,p in members.items() if id!=identity}
            for id in previous-current.keys(): await emit({'type':'leave','id':id})
            for packet in current.values(): await emit(packet)
            previous = set(current)
            await asyncio.wait({task},timeout=.25)
        await task
    finally:
        if task:
            task.cancel()
            await asyncio.gather(task,return_exceptions=True)
        members.pop(identity,None)
        if not members: ROOMS.pop(room,None)
