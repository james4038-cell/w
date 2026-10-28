// Shared anonymous rooms. Auto-detects the same-origin server; static hosting stays in tab demo mode.
export class Multiplayer {
 constructor(onPeer,onLeave,onStatus,{auto=true}={}) {
  this.id=globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2);
  this.peers=new Map();this.onPeer=onPeer;this.onLeave=onLeave;this.onStatus=onStatus;
  const query=typeof location!=='undefined'?new URLSearchParams(location.search).get('room'):null;
  this.room=/^[a-zA-Z0-9_-]{1,30}$/.test(query||'')?query:'itgyeol';
  this.last=0;this.epoch=0;this.retry=0;this.transport='tabs';this.url='';
  this.cleanup=setInterval(()=>{for(const[id,p]of this.peers)if(Date.now()-p.seen>10000)this.remove(id)},1500);
  this.heartbeat=setInterval(()=>this.flush(),500);
  if(auto)this.connect('auto',this.room);
 }
 remove(id){if(this.peers.delete(id))this.onLeave(id)}
 clearPeers(){for(const id of [...this.peers.keys()])this.remove(id)}
 receive(data){
  if(!data||data.id===this.id||typeof data.id!=='string'||data.id.length>64)return;
  if(data.type==='leave'){this.remove(data.id);return}
  if(data.type!=='move'||!Number.isFinite(data.x)||!Number.isFinite(data.z)||Math.abs(data.x)>35||Math.abs(data.z)>35)return;
  const color=v=>/^#[0-9a-f]{6}$/i.test(v)?v:'#c88e62';
  const p={id:data.id,x:data.x,z:data.z,rot:Number.isFinite(data.rot)?data.rot:0,skin:color(data.skin),shirt:color(data.shirt),hair:color(data.hair),style:['short','long','bun'].includes(data.style)?data.style:'short',equipped:['매듭 장식 의상','직조 장식','도자기 소품'].includes(data.equipped)?data.equipped:'',seen:Date.now()};
  this.peers.set(data.id,p);this.onPeer(p);
 }
 connect(url='auto',room='itgyeol'){
  this.close();this.room=room;this.url=url;this.retry=0;const epoch=this.epoch;
  if(url==='auto'){this.onStatus('함께할 여행자 연결 중…');this.discover(epoch)}
  else if(url)this.openSocket(url,epoch);
  else{this.fallback();this.onStatus('탭 시연 · 공유 서버 미연결')}
 }
 async discover(epoch){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),4000);
  try{
   const response=await fetch('/api/config',{cache:'no-store',signal:controller.signal});
   if(!response.ok)throw Error('No shared server');const config=await response.json();
   if(!config.multiplayer||config.wsPath!=='/ws')throw Error('No shared server');
   if(this.epoch!==epoch)return;
   const url=new URL('/ws',location.href);url.protocol=location.protocol==='https:'?'wss:':'ws:';
   this.openSocket(url.href,epoch);
  }catch{if(this.epoch===epoch){this.fallback();this.onStatus('탭 시연 · 공유 서버 미연결')}}
  finally{clearTimeout(timeout)}
 }
 openSocket(url,epoch){
  if(this.epoch!==epoch)return;
  const endpoint=new URL(url);endpoint.searchParams.set('room',this.room);
  let socket;try{socket=new WebSocket(endpoint.href)}catch{this.fallback();this.onStatus('공유 서버 주소를 확인해 주세요');return}
  this.ws=socket;this.transport='connecting';this.onStatus('같은 광장에 입장 중…');
  const timeout=this.connectTimeout=setTimeout(()=>{if(socket.readyState===0)socket.close()},6000);
  socket.onopen=()=>{
   clearTimeout(timeout);if(this.epoch!==epoch){socket.close();return}
   if(this.channel){this.channel.postMessage({type:'leave',id:this.id});this.channel.close();this.channel=null}
   this.clearPeers();this.transport='websocket';this.retry=0;this.onStatus('함께 여행 중 · '+this.room);this.last=0;this.flush();
  };
  socket.onmessage=e=>{if(this.epoch!==epoch)return;try{const data=JSON.parse(e.data);if(data.type==='welcome'&&typeof data.id==='string'){this.id=data.id;for(const p of data.peers||[])this.receive(p)}else this.receive(data)}catch{}};
  socket.onerror=()=>{}; // onclose reports the failure and schedules recovery.
  socket.onclose=()=>{
   clearTimeout(timeout);if(this.epoch!==epoch)return;this.ws=null;this.clearPeers();this.fallback();
   this.onStatus('공유 서버 재연결 중 · 잠시 기다려 주세요');
   this.retryTimer=setTimeout(()=>this.openSocket(url,epoch),Math.min(10000,1000*2**this.retry++));
  };
 }
 fallback(){this.transport='tabs';if(this.channel)return;try{this.channel=new BroadcastChannel('itgyeol:'+this.room);this.channel.onmessage=e=>this.receive(e.data)}catch{this.onStatus('공유 서버 미연결 · 혼자 둘러보기')}}
 send(p){this.latest={...p};this.flush()}
 flush(){if(!this.latest||performance.now()-this.last<100)return;this.last=performance.now();const data={type:'move',id:this.id,...this.latest};if(this.ws?.readyState===1)this.ws.send(JSON.stringify(data));else this.channel?.postMessage(data)}
 close(){this.epoch++;clearTimeout(this.retryTimer);clearTimeout(this.connectTimeout);if(this.ws){this.ws.onclose=null;this.ws.close();this.ws=null}if(this.channel){this.channel.postMessage({type:'leave',id:this.id});this.channel.close();this.channel=null}this.clearPeers()}
 destroy(){this.close();clearInterval(this.cleanup);clearInterval(this.heartbeat)}
}
