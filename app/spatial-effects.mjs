import * as T from '../node_modules/three/build/three.module.js';
import {creativeMethods} from './creative-effects.mjs';

const W=960,H=540,TAU=Math.PI*2;
function drawingCanvas(width,height){if(typeof document==='undefined')return new OffscreenCanvas(width,height);const c=document.createElement('canvas');c.width=width;c.height=height;return c;}
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const colors=['#ffc46b','#f19fbb','#90d9ff','#b3a0ff','#73e2c1'];
export const SPATIAL_IDS=new Set(['bloom','butterflies','sparkles','ribbons','portal','jellyfish','snowglobe','phoenix']);
const v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
function mesh(geometry,material,parent){const m=new T.Mesh(geometry,material);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function physical(color,options={}){return new T.MeshPhysicalMaterial({color,roughness:.34,metalness:0,envMapIntensity:.45,clearcoat:.38,clearcoatRoughness:.3,side:T.DoubleSide,transparent:true,...options});}
function petalGeometry(){
  const positions=[],uv=[],indices=[],shades=[];const nx=14,ny=22;
  for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
    const t=j/ny,u=i/nx*2-1,width=Math.pow(Math.sin(Math.PI*t),.68)*(.84+.16*t)+.012;
    positions.push(u*width,t,.2*u*u*Math.sin(Math.PI*t)+.16*t*t+.06*Math.sin(t*Math.PI*2));uv.push(i/nx,t);
    const color=new T.Color().setRGB(.65+.35*t,.68+.32*t,.76+.24*t);shades.push(color.r,color.g,color.b);
    if(i<nx&&j<ny){const a=j*(nx+1)+i,b=a+nx+1;indices.push(a,b,a+1,a+1,b,b+1);}
  }
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('normal',new T.Float32BufferAttribute(positions.map(()=>0),3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('color',new T.Float32BufferAttribute(shades,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
function starGeometry(){
  const s=new T.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?.42:1;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?s.lineTo(x,y):s.moveTo(x,y);}s.closePath();
  return new T.ExtrudeGeometry(s,{depth:.2,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.08,bevelThickness:.08});
}
function wingGeometry(hind=false){
  const s=new T.Shape();s.moveTo(0,0);
  if(!hind){s.bezierCurveTo(13,20,43,58,65,43);s.bezierCurveTo(83,27,54,-5,5,-12);s.quadraticCurveTo(0,-8,0,0);}
  else{s.bezierCurveTo(24,-3,59,-14,48,-39);s.bezierCurveTo(35,-63,6,-50,0,-10);s.lineTo(0,0);}
  const g=new T.ExtrudeGeometry(s,{depth:.55,bevelEnabled:true,bevelSegments:2,bevelThickness:.25,bevelSize:.5,curveSegments:20});
  const position=g.getAttribute('position'),uv=g.getAttribute('uv');for(let i=0;i<position.count;i++)uv.setXY(i,position.getX(i)/85,(position.getY(i)+65)/130);uv.needsUpdate=true;return g;
}
function wingTexture(hue){
  const canvas=drawingCanvas(512,512);const c=canvas.getContext('2d');
  const g=c.createRadialGradient(60,250,8,180,250,400);g.addColorStop(0,'#172b4f');g.addColorStop(.16,`hsl(${hue},70%,54%)`);g.addColorStop(.55,`hsl(${hue+25},82%,69%)`);g.addColorStop(.78,'#15273e');g.addColorStop(.9,'#132332');g.addColorStop(1,'#091622');c.fillStyle=g;c.fillRect(0,0,512,512);
  c.lineWidth=3;c.strokeStyle='#10243b8a';for(let i=0;i<11;i++){const a=-1.3+i*.25;c.beginPath();c.moveTo(12,255);c.bezierCurveTo(150,255+Math.sin(a)*55,225,255+Math.sin(a)*220,490,255+Math.sin(a)*290);c.stroke();}
  for(let i=0;i<18;i++){const a=i/18*TAU;c.fillStyle='#fff2cece';c.beginPath();c.ellipse(330+Math.cos(a)*110,255+Math.sin(a)*205,4,7,a,0,TAU);c.fill();}
  const t=new T.CanvasTexture(canvas);t.colorSpace=T.SRGBColorSpace;t.anisotropy=2;return t;
}
function glowTexture(){
  const canvas=drawingCanvas(64,64);const c=canvas.getContext('2d'),g=c.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'#fff');g.addColorStop(.1,'#fffdf6');g.addColorStop(.25,'#fff6cf88');g.addColorStop(1,'#ffffff00');c.fillStyle=g;c.fillRect(0,0,64,64);return new T.CanvasTexture(canvas);
}
function ribbonGeometry(n){
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(new Float32Array((n+1)*2*3),3));
  const uv=[],indices=[];for(let i=0;i<=n;i++){uv.push(0,i/n,1,i/n);if(i<n){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}}geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
function setRibbon(geometry,points,width,twist=0){
  const p=geometry.getAttribute('position'),normal=v();
  for(let i=0;i<points.length;i++){
    const prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)],t=i/(points.length-1);
    const dx=next.x-prev.x,dy=next.y-prev.y,len=Math.hypot(dx,dy)||1,a=twist+t*TAU*1.5;
    normal.set(-dy/len*Math.cos(a),dx/len*Math.cos(a),Math.sin(a));const w=width*Math.sin(Math.PI*(.02+.96*t))**.3;
    for(let side=0;side<2;side++){const sign=side?1:-1;p.setXYZ(i*2+side,points[i].x+normal.x*w*sign,points[i].y+normal.y*w*sign,points[i].z+normal.z*w*sign);}
  }p.needsUpdate=true;geometry.computeVertexNormals();
}
function trailMaterial(){
  return new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,uniforms:{opacity:{value:1}},
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`varying vec2 vUv;uniform float opacity;
    void main(){
      float edge=pow(max(0.0,1.0-abs(vUv.x*2.0-1.0)),1.6);
      float a=edge*pow(vUv.y,0.7)*opacity;
      vec3 col=mix(vec3(0.3,0.65,1.0),vec3(1.0,0.8,0.35),vUv.y);
      gl_FragColor=vec4(col*1.6,a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`
  });
}

export function initializeSpatial(effect,random){
  effect.life={bloom:7.5,butterflies:7,sparkles:6,ribbons:6.5,portal:8,jellyfish:8.5,snowglobe:8,phoenix:8.2}[effect.id];
  effect.parameters=Array.from({length:48},()=>random());
}

export class SpatialEffects {
  constructor(canvas=drawingCanvas(W,H)){
    this.renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});this.renderer.setSize(W,H,false);this.renderer.setPixelRatio(1);this.renderer.setClearColor(0,0);this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
    this.renderer.debug.onShaderError=(gl,program,vertex,fragment)=>{throw Error('3D shader failed: '+gl.getShaderInfoLog(fragment));};
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
    this.scene=new T.Scene();this.camera=new T.PerspectiveCamera(35,W/H,1,2000);this.camera.position.z=H/(2*Math.tan(35*Math.PI/360));
    this.scene.add(new T.HemisphereLight('#e5f2ff','#493a55',1.9));
    const key=new T.DirectionalLight('#fff0df',3.1);key.position.set(-300,400,600);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-600,right:600,top:400,bottom:-400,near:10,far:1400});key.shadow.bias=-.0006;this.scene.add(key);
    const rim=new T.DirectionalLight('#a9caff',2.5);rim.position.set(300,180,-150);this.scene.add(rim);
    const fill=new T.DirectionalLight('#ffc6d8',.65);fill.position.set(350,-100,450);this.scene.add(fill);
    const room=new T.Scene();room.background=new T.Color('#788596');
    for(const [x,y,z,sx,sy] of [[-4,4,5,3,5],[4,1,3,2,5],[0,5,-3,4,2]]){const light=mesh(new T.PlaneGeometry(sx,sy),new T.MeshBasicMaterial({color:new T.Color(3.5,3.4,3.2),side:T.DoubleSide,toneMapped:false}),room);light.position.set(x,y,z);light.lookAt(0,0,0);}
    const pmrem=new T.PMREMGenerator(this.renderer);this.environment=pmrem.fromScene(room,.08,.1,100,{size:128});this.scene.environment=this.environment.texture;pmrem.dispose();room.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
    this.petal=petalGeometry();this.star=starGeometry();this.foreWing=wingGeometry();this.hindWing=wingGeometry(true);this.glow=glowTexture();this.wingTextures=[200,255,325].map(wingTexture);
    this.shared=new Set([this.petal,this.star,this.foreWing,this.hindWing]);this.instances=new Map();this.cache=new Map();
  }
  disposeInstance(instance){
    this.scene.remove(instance.root);const geometries=new Set(),materials=new Set();instance.root.traverse(o=>{if(o.geometry&&!this.shared.has(o.geometry))geometries.add(o.geometry);for(const m of [].concat(o.material||[]))materials.add(m);});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();
  }
  retire(effect,i){i.root.visible=false;this.instances.delete(effect);this.cache.set(effect.id,i);}
  clear(){for(const [e,i]of this.instances)this.retire(e,i);}
  dispose(){this.clear();for(const i of this.cache.values())this.disposeInstance(i);this.cache.clear();for(const g of this.shared)g.dispose();for(const t of this.wingTextures)t.dispose();this.glow.dispose();this.environment.dispose();this.renderer.dispose();}
  build(effect){
    const reused=this.cache.get(effect.id);
    if(reused){this.cache.delete(effect.id);reused.effect=effect;reused.root.visible=true;reused.root.position.set(effect.anchor.x-W/2,H/2-effect.anchor.y,0);if(effect.id==='sparkles'||effect.id==='ribbons')reused.root.position.set(0,0,0);if(effect.id==='sparkles'){reused.history=[];reused.lastTime=0;reused.velocity?.set(0,0,0);reused.rawTarget=null;reused.position.set(effect.anchor.x-W/2,H/2-effect.anchor.y,25);}this.instances.set(effect,reused);return reused;}
    const instance={root:new T.Group(),effect};this.scene.add(instance.root);instance.root.position.set(effect.anchor.x-W/2,H/2-effect.anchor.y,0);
    this['build'+effect.id](instance);this.instances.set(effect,instance);return instance;
  }
  setOpacity(root,opacity){root.traverse(o=>{if(o.material&&!o.material.isShaderMaterial)o.material.opacity=opacity;});}
  render(context,effects,now){
    const alive=new Set(effects);for(const [effect,i]of this.instances)if(!alive.has(effect)){this.retire(effect,i);}
    if(!effects.length)return;
    for(const e of effects){const i=this.instances.get(e)||this.build(e),t=(now-e.born)/1000;this['update'+e.id](i,t,now);}
    this.renderer.render(this.scene,this.camera);context.drawImage(this.renderer.domElement,0,0,W,H);
  }
  buildbloom(i){
    const root=i.root;i.stem=new T.Group();root.add(i.stem);
    const green=physical('#477d45',{roughness:.55,clearcoat:.2});mesh(new T.TubeGeometry(new T.CatmullRomCurve3([v(0,-18,0),v(-5,35,-2),v(4,85,0),v(0,135,0)]),24,2,7,false),green,i.stem);
    for(let n=0;n<2;n++){const leaf=mesh(this.petal,physical(n?'#6b9b4d':'#4f8b50',{roughness:.45,vertexColors:true}),i.stem);leaf.position.set(0,18+n*36,0);leaf.scale.set(12,48,30);leaf.rotation.set(-.5,0,n?-.85:.95);}
    i.head=new T.Group();root.add(i.head);i.head.position.y=135;i.head.rotation.set(-.35,.12,0);i.petals=[];
    for(let ring=0;ring<4;ring++)for(let n=0;n<11-ring;n++){
      const hinge=new T.Group(),a=n/(11-ring)*TAU+ring*.34;hinge.rotation.z=a;i.head.add(hinge);
      const petal=mesh(this.petal,physical(['#d6548a','#e577a3','#ee98b6','#f2b1c5'][ring],{vertexColors:true,sheen:.25,sheenColor:new T.Color('#ef96bd'),roughness:.44,clearcoat:.12}),hinge);
      petal.scale.set(25-ring*3,89-ring*15,72-ring*8);petal.position.set(0,5+ring,ring*3);i.petals.push({petal,ring,phase:a});
    }
    i.center=new T.Group();i.head.add(i.center);i.center.position.z=16;
    const gold=physical('#e8b44f',{metalness:.2,roughness:.45});const core=mesh(new T.SphereGeometry(12,16,10),gold,i.center);core.scale.z=.5;
    for(let n=0;n<28;n++){const a=n/28*TAU,r=6+(n%3)*3;const tip=mesh(new T.SphereGeometry(1.3,6,5),gold,i.center);tip.position.set(Math.cos(a)*r,Math.sin(a)*r,7+n%4);}
    i.drifting=[];for(let n=0;n<9;n++){const p=mesh(this.petal,physical('#f4adc4',{vertexColors:true,roughness:.4}),root);p.scale.set(9,27,20);i.drifting.push(p);}
  }
  updatebloom(i,t){
    const fade=ease((i.effect.life-t)/.9);this.setOpacity(i.root,fade);i.stem.scale.y=ease(t/.75);const grow=ease((t-.25)/.8);i.head.scale.setScalar(Math.max(.001,grow));
    i.head.rotation.y=.14+Math.sin(t*.7)*.14;i.head.rotation.z=Math.sin(t*.8)*.035;
    for(const {petal,ring,phase}of i.petals){const opening=ease((t-.35-ring*.25)/1.6);petal.rotation.x=1.37*(1-opening)+(.06+ring*.13)*opening+Math.sin(t*.8+phase)*.018*opening;}
    i.center.scale.setScalar(Math.max(.001,ease((t-1.1)/1.3)));
    i.drifting.forEach((p,n)=>{const a=t-3.1-n*.15;p.visible=a>0;if(a>0){const theta=n*2.4;p.position.set(Math.cos(theta)*(32+a*23),135+Math.sin(theta)*30+a*16-a*a*8,20+Math.sin(a+n)*35);p.rotation.set(a*1.8+n,a*.9+n,theta+a*.6);p.material.opacity=fade*clamp((3-a)/.8);}});
  }
  buildbutterflies(i){
    i.flies=[];for(let n=0;n<7;n++){
      const root=new T.Group();i.root.add(root);const material=physical('#ffffff',{map:this.wingTextures[n%3],metalness:.12,roughness:.35,clearcoat:.7,iridescence:.65,iridescenceIOR:1.3});
      const wings=[];for(const side of [-1,1]){const hinge=new T.Group();root.add(hinge);hinge.scale.x=side;mesh(this.foreWing,material,hinge);mesh(this.hindWing,material,hinge);wings.push({hinge,side});}
      const body=mesh(new T.CapsuleGeometry(2.4,19,4,8),physical('#243149',{roughness:.35,metalness:.25}),root);
      body.position.z=2;mesh(new T.SphereGeometry(3,10,7),body.material,root).position.set(0,14,2);
      for(const side of [-1,1])mesh(new T.TubeGeometry(new T.QuadraticBezierCurve3(v(side,15,2),v(side*8,26,1),v(side*11,22,0)),10,.45,4,false),body.material,root);
      i.flies.push({root,wings,phase:n*1.8,delay:n*.17,side:n%2?1:-1,size:.5+n%3*.12});
    }
  }
  updatebutterflies(i,t){
    const fade=ease((i.effect.life-t)/.8);this.setOpacity(i.root,fade);
    for(const b of i.flies){const a=Math.max(0,t-b.delay);b.root.visible=t>=b.delay;const drift=ease(a/4.5);
      b.root.position.set(b.side*(35+drift*(180+b.phase*10))+Math.sin(a*1.7+b.phase)*30,20+drift*(130+b.phase*8)+Math.sin(a*1.4+b.phase)*22,Math.sin(a*.8+b.phase)*75);
      b.root.scale.setScalar(b.size*ease(a/.5));b.root.rotation.set(.15+Math.sin(a+b.phase)*.2,Math.sin(a*.9+b.phase)*.35,-b.side*.3+Math.sin(a*1.2+b.phase)*.22);
      for(const {hinge,side}of b.wings)hinge.rotation.y=side*(.15+Math.sin(a*13+b.phase)*1.05);
    }
  }
  buildsparkles(i){
    i.root.position.set(0,0,0);i.head=new T.Group();i.root.add(i.head);i.headStar=mesh(this.star,physical('#fff0b4',{metalness:.5,roughness:.24,emissive:'#be8d35',emissiveIntensity:.6}),i.head);i.headStar.scale.setScalar(15);
    i.halo=new T.Sprite(new T.SpriteMaterial({map:this.glow,color:'#ffe5a6',transparent:true,depthWrite:false,blending:T.AdditiveBlending}));i.halo.scale.set(78,78,1);i.head.add(i.halo);
    i.tail=mesh(ribbonGeometry(48),trailMaterial(),i.root);i.tail.frustumCulled=false;
    i.stars=[];for(let n=0;n<27;n++){const star=mesh(this.star,physical(colors[n%5],{metalness:.4,roughness:.28,emissive:colors[n%5],emissiveIntensity:.35}),i.root);i.stars.push(star);}
    i.history=[];i.lastTime=0;i.position=v(i.effect.anchor.x-W/2,H/2-i.effect.anchor.y,25);
  }
  sparkPoint(e,t){return v(e.anchor.x-W/2+Math.sin(t*1.7)*140,H/2-e.anchor.y+55+Math.sin(t*2.2)*60,Math.cos(t*1.1)*35);}
  updatesparkles(i,t,now){
    const e=i.effect,fade=e.tracking?clamp((e.followUntil-now)/650):ease((e.life-t)/.8);this.setOpacity(i.root,fade);
    let target=e.tracking?v(e.target.x-W/2,H/2-e.target.y,25):this.sparkPoint(e,t);
    const dt=Math.max(0,Math.min(.1,t-i.lastTime));i.lastTime=t;
    if(e.tracking){
      // Detections arrive late and in steps: estimate finger velocity from them and extrapolate to this frame.
      const raw=target;
      if(!i.rawTarget){i.rawTarget=raw.clone();i.sampleAt=now;i.targetVelocity=v(0,0,0);}
      else if(!raw.equals(i.rawTarget)){
        const gap=Math.max(.016,(now-i.sampleAt)/1000);
        i.targetVelocity.lerp(raw.clone().sub(i.rawTarget).divideScalar(gap).clampLength(0,3000),.65);
        i.rawTarget.copy(raw);i.sampleAt=now;
      }
      const ahead=Math.min(.18,(now-i.sampleAt)/1000+.07);
      target=i.rawTarget.clone().addScaledVector(i.targetVelocity,ahead);
      // Critically damped spring on top keeps the motion continuous without adding much lag.
      const vel=i.velocity||(i.velocity=v(0,0,0)),omega=2/.05,x=omega*dt,decay=1/(1+x+.48*x*x+.235*x*x*x);
      const change=i.position.clone().sub(target),temp=vel.clone().addScaledVector(change,omega).multiplyScalar(dt);
      vel.sub(temp.clone().multiplyScalar(omega)).multiplyScalar(decay);i.position.copy(target).add(change.add(temp).multiplyScalar(decay));
    }else{i.position.copy(target);i.velocity?.set(0,0,0);}
    i.head.position.copy(i.position);i.headStar.rotation.set(t*.7,t*1.8,t*1.1);i.halo.material.opacity=fade*.8;
    let points=[];
    if(e.tracking){
      i.history.push({p:i.position.clone(),t});i.history=i.history.filter(h=>t-h.t<1.3);
      const h=i.history,span=1.2;
      for(let n=0;n<=48;n++){
        // Sample the path by age, not by index, so the trail keeps its shape at any frame rate.
        const age=(1-n/48)*span,when=t-age;let k=h.length-1;while(k>0&&h[k-1].t>=when)k--;
        const a=h[Math.max(0,k-1)],b=h[k],f=b.t>a.t?clamp((when-a.t)/(b.t-a.t)):1,p=a.p.clone().lerp(b.p,f),u=age/span;
        // Wave grows toward the tail so the trail ripples like a ribbon instead of a rigid line.
        p.x+=Math.cos(age*6-t*4)*u*24;p.y+=Math.sin(age*7-t*5)*u*28;p.z+=Math.sin(age*5-t*3)*u*30;points.push(p);
      }
    }
    else for(let n=0;n<=48;n++)points.push(this.sparkPoint(e,Math.max(0,t-(1-n/48)*1.5)));
    setRibbon(i.tail.geometry,points,8,0);i.tail.material.uniforms.opacity.value=fade*.85;
    i.stars.forEach((s,n)=>{const age=(t+n*.117)%1.5,point=points[Math.max(0,Math.min(48,48-Math.floor(age/1.5*48)))];s.position.copy(point);s.position.x+=Math.sin(n*5)*age*20;s.position.y-=age*15;s.position.z+=Math.cos(n)*age*25;s.rotation.set(t+n,t*1.5+n,t*1.1);s.scale.setScalar((1-age/1.5)*(3+n%5)*ease(t/.3));s.material.opacity=fade*clamp((1.5-age)/.5);});
  }
  buildribbons(i){
    i.root.position.set(0,0,0);i.strips=[];
    for(let n=0;n<7;n++){const material=physical(['#e8b654','#e66fa1','#55b1ec','#9a76de','#45c9a9'][n%5],{metalness:.28,roughness:.28,clearcoat:.65,sheen:.6,sheenColor:new T.Color('#fff3dc')});const strip=mesh(ribbonGeometry(90),material,i.root);strip.frustumCulled=false;i.strips.push(strip);}
  }
  updateribbons(i,t){
    const fade=ease(t/.4)*ease((i.effect.life-t)/1.1);
    i.strips.forEach((strip,n)=>{const start=clamp((t-.12*n)/1.7),points=[];
      for(let k=0;k<=90;k++){const u=k/90,startX=-620+(W+260)*start*u;const a=u*TAU*1.5+t*.7+n*.7;
        points.push(v(startX+Math.sin(a+n)*85,Math.sin(a)*75+(n-3)*43+Math.sin(u*Math.PI)*25,Math.cos(a)*110+n*3));}
      setRibbon(strip.geometry,points,6+n%3*1.5,t*.75+n*.7);strip.material.opacity=fade;
    });
  }
}

Object.assign(SpatialEffects.prototype,creativeMethods);
