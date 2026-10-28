// Dependency-free, flat-shaded WebGL 3D renderer. Column-major matrices.
export const mat={
 mul(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o},
 perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),n=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*n,-1,0,0,2*far*near*n,0])},
 look(eye,target){const norm=v=>{const l=Math.hypot(...v);return v.map(n=>n/l)},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((s,n,i)=>s+n*b[i],0);const z=norm(eye.map((v,i)=>v-target[i])),x=norm(cross([0,1,0],z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1])},
 model(x=0,y=0,z=0,rot=0){const c=Math.cos(rot),s=Math.sin(rot);return new Float32Array([c,0,-s,0,0,1,0,0,s,0,c,0,x,y,z,1])}
};
const rgb=h=>{h=h.replace('#','');return[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255)};
export class Geometry{
 constructor(){this.v=[]}
 tri(a,b,c,color){const u=b.map((n,i)=>n-a[i]),v=c.map((n,i)=>n-a[i]),normal=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],len=Math.hypot(...normal)||1;const light=.72+.28*Math.max(0,(normal[0]*.4+normal[1]*.85+normal[2]*.3)/len);const col=rgb(color).map(v=>v*light);for(const p of[a,b,c])this.v.push(...p,...col);return this}
 quad(a,b,c,d,col){this.tri(a,b,c,col);this.tri(a,c,d,col)}
 box(x,y,z,w,h,d,col,rot=0){const co=Math.cos(rot),si=Math.sin(rot),p=(a,b,c)=>[x+a*co+c*si,y+b,z-a*si+c*co],a=p(-w/2,0,-d/2),b=p(w/2,0,-d/2),c=p(w/2,h,-d/2),e=p(-w/2,h,-d/2),f=p(-w/2,0,d/2),g=p(w/2,0,d/2),i=p(w/2,h,d/2),j=p(-w/2,h,d/2);this.quad(a,e,c,b,col);this.quad(f,g,i,j,col);this.quad(a,f,j,e,col);this.quad(b,c,i,g,col);this.quad(e,j,i,c,col);this.quad(a,b,g,f,col);return this}
 cylinder(x,y,z,r,h,col,n=10,top=r){for(let i=0;i<n;i++){const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2,p=[x+Math.cos(a)*r,y,z+Math.sin(a)*r],q=[x+Math.cos(b)*r,y,z+Math.sin(b)*r],u=[x+Math.cos(a)*top,y+h,z+Math.sin(a)*top],v=[x+Math.cos(b)*top,y+h,z+Math.sin(b)*top];this.quad(p,u,v,q,col);this.tri([x,y+h,z],v,u,col);this.tri([x,y,z],p,q,col)}return this}
 roof(x,y,z,w,h,d,col){const a=[x-w/2,y,z-d/2],b=[x+w/2,y,z-d/2],c=[x+w/2,y,z+d/2],e=[x-w/2,y,z+d/2],u=[x,y+h,z-d*.38],v=[x,y+h,z+d*.38];this.quad(a,e,v,u,col);this.quad(b,u,v,c,col);this.tri(a,u,b,col);this.tri(e,c,v,col);return this}
 torus(x,y,z,r,t,col,axis='y'){const p=(a,b)=>axis==='y'?[x+(r+t*Math.cos(b))*Math.cos(a),y+t*Math.sin(b),z+(r+t*Math.cos(b))*Math.sin(a)]:[x+(r+t*Math.cos(b))*Math.cos(a),y+(r+t*Math.cos(b))*Math.sin(a),z+t*Math.sin(b)];for(let i=0;i<16;i++)for(let j=0;j<5;j++){const a=i*Math.PI/8,b=(i+1)*Math.PI/8,c=j*Math.PI*2/5,d=(j+1)*Math.PI*2/5;this.quad(p(a,c),p(b,c),p(b,d),p(a,d),col)}return this}
}
export class Renderer{
 constructor(canvas){this.canvas=canvas;const gl=this.gl=canvas.getContext('webgl',{antialias:false,alpha:false,powerPreference:'low-power'});if(!gl)throw Error('이 기기에서 WebGL을 사용할 수 없습니다. 브라우저의 하드웨어 가속을 켜고 다시 접속해 주세요.');
 const shader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s};const vs=shader(gl.VERTEX_SHADER,`attribute vec3 position;attribute vec3 color;uniform mat4 vp;uniform mat4 model;varying vec3 col;varying float depth;void main(){gl_Position=vp*model*vec4(position,1.0);col=color;depth=gl_Position.w;}`),fs=shader(gl.FRAGMENT_SHADER,`precision mediump float;varying vec3 col;varying float depth;void main(){float fog=smoothstep(35.0,95.0,depth)*.52;gl_FragColor=vec4(mix(col,vec3(.79,.87,.79),fog),1.0);}`);this.program=gl.createProgram();gl.attachShader(this.program,vs);gl.attachShader(this.program,fs);gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.program));gl.useProgram(this.program);this.pos=gl.getAttribLocation(this.program,'position');this.col=gl.getAttribLocation(this.program,'color');this.vpLoc=gl.getUniformLocation(this.program,'vp');this.modelLoc=gl.getUniformLocation(this.program,'model');gl.enable(gl.DEPTH_TEST);gl.clearColor(.80,.88,.81,1);this.resize();}
 resize(){const d=Math.min(devicePixelRatio||1,1.5);this.canvas.width=Math.round(innerWidth*d);this.canvas.height=Math.round(innerHeight*d);this.gl.viewport(0,0,this.canvas.width,this.canvas.height)}
 upload(g){const gl=this.gl,buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(g.v),gl.STATIC_DRAW);return{buffer,count:g.v.length/6}}
 dispose(m){if(m)this.gl.deleteBuffer(m.buffer)}
 begin(eye,target){const gl=this.gl;gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);this.vp=mat.mul(mat.perspective(.72,this.canvas.width/this.canvas.height,.2,150),mat.look(eye,target));gl.uniformMatrix4fv(this.vpLoc,false,this.vp)}
 draw(mesh,model=mat.model()){const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);gl.enableVertexAttribArray(this.pos);gl.enableVertexAttribArray(this.col);gl.vertexAttribPointer(this.pos,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(this.col,3,gl.FLOAT,false,24,12);gl.uniformMatrix4fv(this.modelLoc,false,model);gl.drawArrays(gl.TRIANGLES,0,mesh.count)}
 project(p){const m=this.vp;if(!m)return[-999,-999,-1];const v=[...p,1],o=[0,0,0,0];for(let r=0;r<4;r++)for(let c=0;c<4;c++)o[r]+=m[c*4+r]*v[c];return[(o[0]/o[3]*.5+.5)*innerWidth,(-o[1]/o[3]*.5+.5)*innerHeight,o[3]]}
}
export function avatar(skin='#c88e62',shirt='#e3b568',hair='#3e382c',style='short',item=''){
 const g=new Geometry();g.cylinder(0,.015,0,.52,.02,'#92aa87',16);g.box(-.17,.05,0,.23,.58,.28,'#465a53');g.box(.17,.05,0,.23,.58,.28,'#465a53');g.box(-.17,.04,.07,.25,.15,.42,'#eee8d6');g.box(.17,.04,.07,.25,.15,.42,'#eee8d6');g.box(0,.61,0,.63,.64,.38,shirt);g.box(-.42,.65,0,.2,.55,.25,skin);g.box(.42,.65,0,.2,.55,.25,skin);g.cylinder(0,1.24,0,.29,.48,skin,9);g.cylinder(0,1.60,-.02,.31,.19,hair,9,.25);if(style==='long')g.box(0,1.22,-.23,.55,.45,.17,hair);if(style==='bun')g.cylinder(0,1.75,-.04,.18,.18,hair,8,.1);g.box(-.105,1.45,.279,.045,.045,.015,'#2f3a32');g.box(.105,1.45,.279,.045,.045,.015,'#2f3a32');if(item.includes('매듭')){g.torus(.22,.95,.23,.12,.025,'#c8674a','z');g.box(.22,.7,.24,.04,.18,.04,'#c8674a')}if(item.includes('직조'))g.box(0,1.07,.205,.64,.12,.03,'#b37b54');if(item.includes('도자기'))g.cylinder(.48,.7,.1,.12,.22,'#b3825f',8,.075);return g;
}
export function buildWorld(){const g=new Geometry(),colliders=[];
 const house=(x,z,style='kr',color='#c77555',w=6,d=4)=>{g.box(x,.05,z,w+.7,.28,d+.7,'#d4cbb6');g.box(x,.33,z,w,2.65,d,style==='ph'?'#d2b88b':'#f1e3c9');g.roof(x,3,z,w+1.3,1.6,d+1.2,color);g.box(x,3,z,w+1.4,.15,d+1.3,color);for(const xx of[-w/2+.16,w/2-.16])for(const zz of[-d/2+.15,d/2-.15])g.box(x+xx,.3,z+zz,.23,2.7,.23,'#815e42');g.box(x,.33,z+d/2+.02,1,1.95,.06,'#856b4b');for(const xx of[-w/3,w/3]){g.box(x+xx,1.2,z+d/2+.04,1.1,1,.05,'#859b82');g.box(x+xx,1.2,z+d/2+.08,.06,1,.04,'#b49368');g.box(x+xx,1.7,z+d/2+.08,1.1,.05,.04,'#b49368')}if(style==='ph'){for(let i=-2;i<=2;i++)g.box(x+i*1.05,.65,z+d/2+.06,.04,2.2,.03,'#b59567')}colliders.push({x,z,w:w/2+.5,d:d/2+.5})};
 const tree=(x,z,s=1,c='#819e67')=>{g.cylinder(x,0,z,.17*s,1.3*s,'#a38458',6);g.cylinder(x,.9*s,z,1.05*s,1.25*s,c,7,.5*s);g.cylinder(x,1.65*s,z,.8*s,1*s,c,7,.1);};
 const pot=(x,z,s=1,col='#986d50')=>{g.cylinder(x,.12,z,.4*s,.6*s,col,12,.58*s);g.cylinder(x,.12+.6*s,z,.58*s,.4*s,col,12,.34*s);g.torus(x,.12+s,z,.34*s,.055*s,'#70513f');g.cylinder(x,.12+s,z,.28*s,.01,'#594738',12)};
 // Island, paths, stone plaza and softly raised terrain.
 g.cylinder(0,-1.5,0,37,1.5,'#afbf96',64,37);g.cylinder(0,-.08,0,36.7,.09,'#bccc9f',64);g.cylinder(0,.02,0,7.3,.08,'#e4ddc5',40);g.torus(0,.13,0,6.3,.08,'#c9c7ad');g.box(0,.02,0,4,.05,61,'#e4ddc5');g.box(0,.025,0,60,.05,3.6,'#e4ddc5');g.box(-16,.03,-6,3.6,.04,15,'#e4ddc5');g.box(16,.03,-4,3.6,.04,12,'#e4ddc5');g.box(-15,.03,16,26,.04,3.6,'#e4ddc5');g.box(18,.03,16,25,.04,3.6,'#e4ddc5');
 // Central communal pavilion, fountain and benches.
 g.cylinder(0,.13,0,1.9,.3,'#d5ceb7',24);g.cylinder(0,.43,0,1.6,.13,'#81b8b0',24);g.cylinder(0,.5,0,.5,1.4,'#e0d3b3',10,.3);g.cylinder(0,1.9,0,.9,.12,'#e6d9bb',12);g.cylinder(0,2.03,0,.7,.06,'#8fc5bb',12);colliders.push({x:0,z:0,w:2,d:2});
 for(const x of[-4.4,4.4]){g.box(x,.65,3,1.8,.16,.55,'#a78a5f');for(const a of[-.65,.65])g.box(x+a,0,3,.13,.65,.3,'#7d7153');g.box(x,.85,3.2,1.8,.45,.12,'#a78a5f')}
 // Korean craft quarter.
 house(-17,-9,'kr','#af654b');house(-26,1,'kr','#777d71',5,4);house(-17,8,'kr','#b58158',5,4);
 for(const x of[-20,-18,-16,-14]){g.box(x,.25,-5.5,.65,.7,.65,'#be9b70');g.torus(x,1.35,-5.5,.3,.06,'#bd6149','z')}
 // Loom frame.
 for(const x of[-28,-25])g.box(x,.2,4.4,.17,2.1,.18,'#8e6d46');g.box(-26.5,2.1,4.4,3.2,.18,.18,'#8e6d46');g.box(-26.5,.4,4.4,3.2,.18,.18,'#8e6d46');for(let i=0;i<13;i++)g.box(-27.85+i*.225,.55,4.4,.035,1.55,.035,'#f2e2bd');for(let i=0;i<7;i++)g.box(-26.5,.6+i*.17,4.44,2.8,.07,.04,i%2?'#ad7f60':'#d5af76');
 for(let i=0;i<5;i++)pot(-20+i*1.25,11,.65+(i%2)*.2);
 // Philippine comparison courtyard.
 house(18,-9,'ph','#b9985d',7,5);g.box(18,.05,-1,12,.15,7,'#d8ca9f');g.box(18,.25,-1,10,.12,2,'#b99769');for(let i=0;i<4;i++)pot(14+i*2.6,-1,.65,i<2?'#90634c':'#b38a5f');
 for(const x of[13,23]){g.box(x,1,-4,1.8,1.1,.1,'#eee3ba');g.box(x,0,-4,.12,1,.12,'#8c7955')}
 for(let i=0;i<8;i++)g.box(18,.45+i*.15,-5.5,4,.08,.08,i%2?'#f0e0ae':'#a38667');
 // Contemporary creative studio, interpreted rather than traditional architecture.
 g.box(17,.05,17,10,.25,8,'#d9d0c4');g.box(17,.3,19,9,3.4,4,'#e9e1cf');g.box(17,3.7,18,10,.3,6,'#828b81');g.box(17,.3,16.8,5.5,2.9,.08,'#8daca2');g.box(17,1.4,16.7,2.5,.08,.08,'#c2cbaa');for(const x of[13.5,20.5]){g.box(x,.3,14.5,.85,2,.7,'#4b6055');g.cylinder(x,1.1,14.9,.27,.05,'#b1bba4',10);g.box(x,.5,14.91,.38,.38,.02,'#263c31')}g.box(17,.4,14.3,3,.2,1.3,'#bb9770');g.box(17,.6,14.3,1,.6,.5,'#6d7f70');g.box(17,1.22,14.3,1.1,.06,.55,'#b5d4c1');colliders.push({x:17,z:19,w:5,d:2.5});
 // My garden.
 g.box(-16,.03,20,12,.08,10,'#c4c99c');for(let i=0;i<13;i++){g.box(-22+i,0,25,.12,1,.12,'#e9dfbf');g.box(-22+i,0,15,.12,1,.12,'#e9dfbf')}g.box(-16,.3,25,12,.13,.1,'#dfd3ad');g.box(-16,.7,25,12,.12,.1,'#dfd3ad');g.box(-16,.5,15,12,.13,.1,'#dfd3ad');g.box(-20,.05,21,3,.13,3,'#dcd2b2');
 // Youth creator and workshop kiosk, tucked just off the central path.
 g.box(1,.05,-12,6,.2,4,'#cbbd96');for(const x of[-1.5,3.5])g.box(x,.2,-12,.15,2.5,.15,'#9d7953');g.box(1,2.7,-12,6,.15,4,'#d7af77');g.box(1,.4,-11,4,.85,.7,'#ae8860');g.box(1,1.3,-11,1,.65,.5,'#657c68');g.box(1,1.45,-10.73,.7,.4,.02,'#b5c6aa');
 // Vegetation, stones and planters; deterministic layout.
 let seed=29;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 for(let i=0;i<70;i++){const a=i/70*Math.PI*2,r=31+rand()*4;tree(Math.cos(a)*r,Math.sin(a)*r,.7+rand()*.65,i%3?'#829d6a':'#a6b37b')}
 for(const [x,z] of[[-9,-9],[-9,8],[8,-8],[8,8],[-24,15],[26,13],[8,23],[-7,24],[-10,-23],[9,-22]])tree(x,z,1.1);
 for(let i=0;i<50;i++){const x=(rand()-.5)*60,z=(rand()-.5)*60;if(Math.abs(x)<7||Math.abs(z)<4||Math.hypot(x,z)>31)continue;g.cylinder(x,.02,z,.15+rand()*.2,.23,'#a8bb82',6,.08)}
 for(const [x,z] of[[-6,-4],[6,-4],[-6,5],[6,5]]){g.cylinder(x,0,z,.55,.4,'#c9b790',8);g.cylinder(x,.4,z,.5,.5,'#92a56b',7,.22);g.cylinder(x,.8,z,.16,.2,'#d0ab73',6)}
 return{geometry:g,colliders,pot,house};
}
