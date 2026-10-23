import * as T from '../node_modules/three/build/three.module.js';
const TAU=Math.PI*2,clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);},v=(x=0,y=0,z=0)=>new T.Vector3(x,y,z);
function mat(color,options={}){return new T.MeshPhysicalMaterial({color,roughness:.32,metalness:.15,clearcoat:.5,envMapIntensity:.45,side:T.DoubleSide,transparent:true,...options});}
function add(parent,geometry,material,x=0,y=0,z=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);parent.add(m);return m;}
function fade(root,amount){const seen=new Set();root.traverse(o=>{for(const m of [].concat(o.material||[])){if(seen.has(m))continue;seen.add(m);m.userData.baseOpacity??=m.opacity;if(m.uniforms?.opacity)m.uniforms.opacity.value=amount;else m.opacity=m.userData.baseOpacity*amount;}});}
function particles(parent,count,texture,color,size=8){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(count*3),3).setUsage(T.DynamicDrawUsage));const m=new T.PointsMaterial({color,size,map:texture,transparent:true,depthWrite:false,blending:T.AdditiveBlending});const p=new T.Points(g,m);p.frustumCulled=false;parent.add(p);return p;}
function updatePoints(points,count,position){const a=points.geometry.attributes.position;for(let n=0;n<count;n++){const p=position(n);a.setXYZ(n,p.x,p.y,p.z);}a.needsUpdate=true;}
function tendril(){const p=[],indices=[];for(let n=0;n<=24;n++)for(let j=0;j<6;j++){p.push(0,-n*6,0);if(n<24){const a=n*6+j,b=n*6+(j+1)%6;indices.push(a,a+6,b,b,a+6,b+6);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3).setUsage(T.DynamicDrawUsage));g.setIndex(indices);g.computeVertexNormals();return g;}
const vertex=`varying vec2 tex;void main(){tex=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
function vortex(){return new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,uniforms:{time:{value:0},opacity:{value:1}},vertexShader:vertex,fragmentShader:`varying vec2 tex;uniform float time;uniform float opacity;
void main(){vec2 p=tex*2.-1.;float r=length(p),a=atan(p.y,p.x);float spiral=pow(.5+.5*sin(a*4.+r*19.-time*2.4),4.);float dust=.5+.5*sin(p.x*31.+sin(p.y*23.+time)*3.);vec3 c=mix(vec3(.08,.03,.23),vec3(.32,.12,.85),spiral);c+=vec3(.05,.58,.7)*pow(spiral,2.)*(.3+r);c+=vec3(.4,.17,.23)*dust*.2;float edge=1.-smoothstep(.85,1.,r);gl_FragColor=vec4(c*1.2,edge*.83*opacity);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});}
function glass(){return new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.FrontSide,uniforms:{opacity:{value:1}},vertexShader:`varying vec3 n;varying vec3 eye;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);eye=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,fragmentShader:`varying vec3 n;varying vec3 eye;uniform float opacity;void main(){float rim=pow(1.-abs(dot(normalize(n),normalize(eye))),3.);float highlight=pow(max(0.,dot(normalize(n),normalize(vec3(-.5,.7,1.)))),35.);gl_FragColor=vec4(vec3(.58,.86,1.)+highlight*.6,(rim*.65+highlight*.4+.025)*opacity);
#include <tonemapping_fragment>
#include <colorspace_fragment>
}`});}

export const creativeMethods={
 buildportal(i){
  i.portal=new T.Group();i.portal.position.y=115;i.root.add(i.portal);i.rings=[];
  const gold=mat('#efc57c',{metalness:.8,roughness:.23}),cyan=mat('#69e9ec',{metalness:.5,emissive:'#148ba6',emissiveIntensity:.8});
  for(const [r,tube,m] of [[140,5,gold],[151,1.4,cyan],[128,1.2,cyan]])i.rings.push(add(i.portal,new T.TorusGeometry(r,tube,8,96),m));
  i.disc=add(i.portal,new T.CircleGeometry(125,96),vortex(),0,0,-8);
  i.crystals=[];for(let n=0;n<12;n++){const crystal=add(i.portal,new T.OctahedronGeometry(8),mat(n%2?'#b28aff':'#8df5ff',{metalness:.3,roughness:.18,emissive:n%2?'#412278':'#176d90',emissiveIntensity:.4}));crystal.scale.y=1.8;i.crystals.push(crystal);}
  i.dust=particles(i.portal,440,this.glow,'#9cd9ff',6);
 },
 updateportal(i,t){
  const f=ease(t/.7)*ease((i.effect.life-t)/1.1);fade(i.root,f);i.portal.scale.setScalar(Math.max(.001,ease(t/1.2)));i.portal.rotation.set(Math.sin(t*.7)*.12,Math.sin(t*.4)*.3,Math.sin(t*.35)*.08);
  i.disc.material.uniforms.time.value=t;i.rings[1].rotation.z=t*.2;
  i.crystals.forEach((c,n)=>{const a=n/12*TAU+t*.28,r=151+Math.sin(t*1.2+n)*6;c.position.set(Math.cos(a)*r,Math.sin(a)*r,Math.sin(n+t)*12);c.rotation.set(t*.6+n,t+n,a);});
  updatePoints(i.dust,440,n=>{const u=(n*.61803398875+t*.07)%1,a=n*2.39996+t*(.15+u*.6),r=12+Math.sqrt(u)*109;return v(Math.cos(a)*r,Math.sin(a)*r,Math.sin(a*2+t)*14-3);});
 },
 buildjellyfish(i){
  i.jellies=[];for(let n=0;n<3;n++){
   const root=new T.Group();i.root.add(root);const bell=new T.Group();root.add(bell);const color=['#439fce','#a76acb','#4bbfb0'][n];
   const profile=[v(0,45),v(10,44),v(23,39),v(35,28),v(43,13),v(45,1),v(39,-4),v(31,0)];
   add(bell,new T.LatheGeometry(profile,48),mat(color,{opacity:.52,roughness:.23,metalness:.05,depthWrite:false,emissive:color,emissiveIntensity:.18}));
   const rim=add(bell,new T.TorusGeometry(42,1.1,6,64),mat(color,{emissive:color,emissiveIntensity:.8,roughness:.35}));rim.rotation.x=Math.PI/2;
   const halo=new T.Sprite(new T.SpriteMaterial({map:this.glow,color,transparent:true,opacity:.18,depthWrite:false,blending:T.AdditiveBlending}));halo.scale.set(125,100,1);halo.position.set(0,15,-8);bell.add(halo);
   const core=add(bell,new T.SphereGeometry(16,16,10),mat(color,{emissive:color,emissiveIntensity:.5,opacity:.45,depthWrite:false}),0,14);core.scale.y=.35;
   const veins=[];for(let k=0;k<8;k++){const a=k/8*TAU,points=[v(Math.cos(a)*4,44,Math.sin(a)*4),v(Math.cos(a)*28,35,Math.sin(a)*28),v(Math.cos(a)*43,8,Math.sin(a)*43)];veins.push(add(bell,new T.TubeGeometry(new T.CatmullRomCurve3(points),16,.45,4),mat(color,{emissive:color,emissiveIntensity:.6,opacity:.65})));}
   const arms=[];const material=mat(color,{roughness:.5,emissive:color,emissiveIntensity:.4,opacity:.65,depthWrite:false});for(let k=0;k<9;k++)arms.push(add(root,tendril(),material));
   i.jellies.push({root,bell,arms,phase:n*2.1,n});
  }
  i.bubbles=particles(i.root,60,this.glow,'#b9e9f8',5);
 },
 updatejellyfish(i,t){
  fade(i.root,ease(t/.6)*ease((i.effect.life-t)/1));
  for(const j of i.jellies){const a=t+j.phase,pulse=Math.sin(a*2.7);j.root.position.set((j.n-1)*145+Math.sin(a*.65)*22,125+j.n%2*65+t*7+Math.sin(a*1.7)*12,Math.sin(a*.55)*45);j.root.rotation.set(.12,Math.sin(a*.5)*.35,Math.sin(a*.6)*.12);j.root.scale.setScalar((j.n===1?1.15:.8)*Math.max(.001,ease((t-j.n*.12)/.7)));j.bell.scale.set(1-pulse*.07,1+pulse*.13,1-pulse*.07);
   j.arms.forEach((arm,k)=>{const angle=k/9*TAU,attr=arm.geometry.attributes.position,length=100+k%4*18;
    for(let h=0;h<=24;h++){const u=h/24,lag=a*2.2-u*5-k*.3,x=Math.cos(angle)*29+Math.sin(lag)*u*23+u*u*Math.sin(a*.8)*18,z=Math.sin(angle)*29+Math.cos(lag*.8)*u*18,r=(1-u)*1.6+.16;for(let side=0;side<6;side++){const b=side/6*TAU;attr.setXYZ(h*6+side,x+Math.cos(b)*r,-u*length,z+Math.sin(b)*r);}}
    attr.needsUpdate=true;arm.geometry.computeVertexNormals();
   });
  }
  updatePoints(i.bubbles,60,n=>v(Math.sin(n*13+t*.3)*250,((n*37+t*20)%320)-60,Math.cos(n*7)*70));
 },
 buildsnowglobe(i){
  i.globe=new T.Group();i.globe.position.y=124;i.root.add(i.globe);
  const gold=mat('#d6b478',{metalness:.65,roughness:.3}),navy=mat('#213d61',{metalness:.35,roughness:.38}),snow=mat('#e2f1fa',{roughness:.8,metalness:0});
  add(i.globe,new T.CylinderGeometry(76,82,14,48),navy,0,-106);add(i.globe,new T.TorusGeometry(78,3,8,64),gold,0,-99).rotation.x=Math.PI/2;add(i.globe,new T.TorusGeometry(82,2,8,64),gold,0,-114).rotation.x=Math.PI/2;
  const hill=add(i.globe,new T.SphereGeometry(82,40,16,0,TAU,0,Math.PI/2),snow,0,-98);hill.scale.y=.23;
  i.village=new T.Group();i.globe.add(i.village);
  const house=add(i.village,new T.BoxGeometry(35,32,28),mat('#975c4b',{roughness:.75}),3,-62,17);
  const roof=add(i.village,new T.ConeGeometry(32,23,4),snow,3,-35,17);roof.rotation.y=Math.PI/4;
  const warm=mat('#ffd48d',{emissive:'#ffae39',emissiveIntensity:1.5,roughness:.6});for(const x of [-6,10])add(i.village,new T.BoxGeometry(6,9,1),warm,x,-60,31.5);
  for(const [x,z,size]of [[-42,-4,1],[37,-20,.8],[-14,-40,.75]]){add(i.village,new T.CylinderGeometry(2,3,12,6),gold,x,-78,z);for(let k=0;k<3;k++){add(i.village,new T.ConeGeometry((19-k*4)*size,29*size,12),mat('#386d70',{roughness:.7}),x,-61+k*14*size,z);add(i.village,new T.ConeGeometry((17-k*4)*size,21*size,12),snow,x,-55+k*14*size,z);}}
  i.snow=particles(i.globe,340,this.glow,'#eefaff',8);i.shell=add(i.globe,new T.SphereGeometry(115,48,32),glass());i.shell.renderOrder=8;
  const glint=add(i.globe,new T.TorusGeometry(113,1.2,5,42,Math.PI*.28),mat('#e0f5ff',{opacity:.7,emissive:'#a8d8ee',emissiveIntensity:.4,depthWrite:false}));glint.rotation.z=.85;glint.position.z=20;
 },
 updatesnowglobe(i,t){
  fade(i.root,ease(t/.7)*ease((i.effect.life-t)/1));i.globe.scale.setScalar(Math.max(.001,ease(t/.9)));i.globe.rotation.y=Math.sin(t*.45)*.22;i.globe.rotation.z=Math.sin(t*.8)*.035;
  updatePoints(i.snow,340,n=>{const radius=25+(n*.754877666%1)*76,phase=n*2.39996+t*(.25+n%5*.04),height=105-((n*17.3+t*(12+n%7))%198);const bound=Math.sqrt(Math.max(0,110*110-height*height));return v(Math.cos(phase)*Math.min(radius,bound),height,Math.sin(phase)*Math.min(radius,bound));});
 },
 buildphoenix(i){
  i.bird=new T.Group();i.root.add(i.bird);const gold=mat('#f0b958',{metalness:.5,roughness:.3}),amber=mat('#dc763a',{metalness:.35,roughness:.32}),cream=mat('#ffe0a0',{metalness:.45,roughness:.28});
  const body=add(i.bird,new T.SphereGeometry(17,20,16),gold,0,40,0);body.scale.set(.83,2.1,.8);const neck=add(i.bird,new T.CapsuleGeometry(8,22,5,12),gold,0,77,0);neck.rotation.z=-.18;
  add(i.bird,new T.SphereGeometry(11,16,12),cream,4,99,1);const beak=add(i.bird,new T.ConeGeometry(4,15,8),amber,17,98,1);beak.rotation.z=-Math.PI/2;
  const eye=mat('#1c2029',{metalness:.3,roughness:.2});add(i.bird,new T.SphereGeometry(2,8,6),eye,10,102,9);
  for(let k=0;k<5;k++){const feather=add(i.bird,this.petal,k%2?amber:gold,0,105,0);feather.scale.set(3,24+k*3,8);feather.rotation.z=.2+k*.17;}
  i.wings=[];for(const side of [-1,1]){const hinge=new T.Group();hinge.position.set(side*11,57,0);hinge.scale.x=side;i.bird.add(hinge);const feathers=[];
   for(let n=0;n<17;n++){const feather=add(hinge,this.petal,n%3===0?cream:n%3===1?gold:amber,n*2.5,Math.sin(n*.15)*15,-n*.65);feather.scale.set(8-n*.13,102+n*3,30);feather.rotation.set(-.15+n*.012,0,-.38-n*.055);feathers.push(feather);}
   for(let n=0;n<9;n++){const feather=add(hinge,this.petal,n%2?gold:amber,7+n*7,6,7);feather.scale.set(9,62-n*2,22);feather.rotation.z=-.65-n*.08;feathers.push(feather);}
   i.wings.push({hinge,side,feathers});
  }
  i.tails=[];for(let n=0;n<7;n++){const feather=add(i.bird,this.petal,n%2?gold:amber,(n-3)*3,15,-3);feather.scale.set(7,100+Math.cos((n-3)*.4)*65,30);feather.rotation.z=Math.PI+(n-3)*.13;i.tails.push(feather);}
  i.embers=particles(i.root,260,this.glow,'#ffd58a',8);
 },
 updatephoenix(i,t){
  const f=ease(t/.65)*ease((i.effect.life-t)/1.1);fade(i.root,f);i.bird.scale.setScalar(Math.max(.001,ease(t/.9)));i.bird.position.set(Math.sin(t*.65)*27,Math.min(190,t*28)+Math.sin(t*2)*6,Math.sin(t*.6)*35);i.bird.rotation.set(.08,Math.sin(t*.6)*.22,Math.sin(t*.8)*.065);
  for(const w of i.wings){w.hinge.rotation.y=w.side*Math.sin(t*3.8)*.55;w.hinge.rotation.z=w.side*(Math.sin(t*3.8)*.15+.06);w.feathers.forEach((feather,n)=>feather.rotation.x=-.12+Math.sin(t*3.8-n*.08)*.1);}
  i.tails.forEach((tail,n)=>{tail.rotation.x=Math.sin(t*2-n*.28)*.23;tail.rotation.z=Math.PI+(n-3)*.13+Math.sin(t*1.8-n*.35)*.09;});
  updatePoints(i.embers,260,n=>{const a=(n*.6180339+t*.17)%1,theta=n*2.39996+t*.5;return v(Math.sin(t*.65-a)*27+Math.cos(theta)*a*72,Math.min(190,t*28)-20-a*180,Math.sin(theta)*a*45);});
 }
};
