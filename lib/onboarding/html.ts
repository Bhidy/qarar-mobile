/**
 * Premium 3D onboarding — self-contained HTML document for the WebView host.
 *
 * Direct port of the Smart Invest onboarding stage (WebView + inline Three.js
 * r128: morphing flat-shaded polyhedron, wireframe shell, additive halo,
 * orbiting particles, pointer parallax, swipe pager) re-branded to the
 * SmartSignals login palette (royal blue #0B4DD4 / #4D8EF8 on deep navy).
 *
 * Everything is inline (Three.js + woff2 fonts) so the screen renders offline
 * with zero network requests. The document talks back to React Native via
 * window.ReactNativeWebView.postMessage with JSON: {"t":"haptic"|"done"|"skip"}.
 */
import { THREE_MIN_JS } from "./three-min";
import {
  SORA_800,
  MANROPE_500,
  MANROPE_600,
  MANROPE_700,
  CAIRO_400,
  CAIRO_700,
} from "./fonts";

export interface OnboardingHtmlOptions {
  isAr: boolean;
  /** Device safe-area insets in px, injected from useSafeAreaInsets(). */
  topInset: number;
  bottomInset: number;
}

// ── Copy (mirrors the approved bilingual slide content) ───────────────────────
const SLIDES = [
  {
    title: { en: "A Clearer View<br>of the Market", ar: "رؤية أوضح<br>للسوق" },
    body: {
      en: "Professional signals from elite market analysts to help you read opportunities and make more informed decisions.",
      ar: "إشارات استثمارية احترافية من نخبة المحللين تساعدك على فهم الفرص واتخاذ قرارات أكثر وعيًا.",
    },
  },
  {
    title: { en: "Clear Signals.<br>Sharper Decisions.", ar: "إشارات واضحة.<br>قرارات أدق." },
    body: {
      en: "Buy, sell and hold calls with clear price targets and precise entry and exit points.",
      ar: "توصيات شراء وبيع واحتفاظ، مع أسعار مستهدفة ونقاط دخول وخروج واضحة.",
    },
  },
  {
    title: { en: "Never Miss<br>a Move", ar: "لا تفوّت<br>أي فرصة" },
    body: {
      en: "Instant alerts the moment any new signal or market update is published.",
      ar: "تنبيه فوري بمجرد صدور أي إشارة جديدة أو تحديث من محللي الأسواق.",
    },
  },
];

const LABELS = {
  brand: "Smart Signals",
  skip: { en: "Skip", ar: "تخطي" },
  next: { en: "Next", ar: "التالي" },
  start: { en: "Get Started", ar: "ابدأ الآن" },
};

// SmartSignals "Decisive Q" mark — circle (market) + diagonal + conviction dot.
const MARK_SVG = `<svg width="15" height="15" viewBox="0 0 64 64" fill="none"><circle cx="24" cy="24" r="18" stroke="#FFFFFF" stroke-width="5"/><path d="M 37 37 L 58 58" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round"/><circle cx="58" cy="58" r="7" fill="#4D8EF8"/></svg>`;

export function buildOnboardingHtml({ isAr, topInset, bottomInset }: OnboardingHtmlOptions): string {
  const L = isAr ? "ar" : "en";
  const dir = isAr ? "rtl" : "ltr";

  // Per-language brand type. Arabic = Cairo (brand Arabic font, owner request
  // 2026-07-10); the Latin brand word keeps Manrope in both languages.
  const fontFaces = isAr
    ? `
@font-face{font-family:'Cairo';font-weight:400;font-display:swap;src:url(data:font/woff2;base64,${CAIRO_400}) format('woff2');}
@font-face{font-family:'Cairo';font-weight:700;font-display:swap;src:url(data:font/woff2;base64,${CAIRO_700}) format('woff2');}
@font-face{font-family:'Manrope';font-weight:700;font-display:swap;src:url(data:font/woff2;base64,${MANROPE_700}) format('woff2');}`
    : `
@font-face{font-family:'Sora';font-weight:800;font-display:swap;src:url(data:font/woff2;base64,${SORA_800}) format('woff2');}
@font-face{font-family:'Manrope';font-weight:500;font-display:swap;src:url(data:font/woff2;base64,${MANROPE_500}) format('woff2');}
@font-face{font-family:'Manrope';font-weight:600;font-display:swap;src:url(data:font/woff2;base64,${MANROPE_600}) format('woff2');}
@font-face{font-family:'Manrope';font-weight:700;font-display:swap;src:url(data:font/woff2;base64,${MANROPE_700}) format('woff2');}`;

  const uiFont = isAr
    ? `'Cairo',-apple-system,system-ui,sans-serif`
    : `'Manrope',-apple-system,system-ui,sans-serif`;
  const displayFont = isAr
    ? `'Cairo',-apple-system,system-ui,sans-serif`
    : `'Sora',-apple-system,system-ui,sans-serif`;

  const slidesHtml = SLIDES.map(
    (s, i) => `
      <div class="ob-slide${i === 0 ? " active" : ""}" data-i="${i}">
        <h1 class="ob-title">${s.title[L]}</h1>
        <p class="ob-sub">${s.body[L]}</p>
      </div>`,
  ).join("");

  const dotsHtml = SLIDES.map((_, i) => `<span class="ob-dot${i === 0 ? " on" : ""}"></span>`).join("");

  // Forward arrow points with the reading direction.
  const arrowFlip = isAr ? "transform:scaleX(-1);" : "";

  return `<!DOCTYPE html>
<html lang="${L}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<style>${fontFaces}</style>
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;}
html,body{width:100%;height:100%;overflow:hidden;overscroll-behavior:none;background:#02060F;}
body{font-family:${uiFont};}

/* ═══ Stage — deep-navy analog of the Smart Invest deep-green cosmos ═══ */
#ob{position:fixed;inset:0;background:radial-gradient(circle at 50% 30%,#0B2450 0%,#050D24 52%,#02060F 100%);overflow:hidden;touch-action:none;}
.ob-blob{position:absolute;z-index:0;width:300px;height:300px;left:50%;top:30%;transform:translate(-50%,-50%);border-radius:50%;
  background:radial-gradient(circle,rgba(77,142,248,.26),transparent 64%);filter:blur(42px);animation:obFloat 8s ease-in-out infinite;pointer-events:none;}
@keyframes obFloat{0%,100%{transform:translate(-50%,-50%) scale(1);}50%{transform:translate(-50%,-60%) scale(1.14);}}
#ob-canvas{position:absolute;inset:0;width:100%;height:100%;z-index:1;display:block;}
.ob-grid{position:absolute;inset:0;z-index:2;pointer-events:none;background-image:radial-gradient(rgba(255,255,255,.05) 1px,transparent 1px);background-size:24px 24px;
  -webkit-mask:radial-gradient(circle at 50% 38%,#000 0%,transparent 72%);mask:radial-gradient(circle at 50% 38%,#000 0%,transparent 72%);}
.ob-vig{position:absolute;inset:0;z-index:2;pointer-events:none;background:radial-gradient(circle at 50% 36%,transparent 42%,rgba(0,5,12,.6) 100%);}
.ob-scrim{position:absolute;left:0;right:0;bottom:0;height:46%;z-index:3;pointer-events:none;background:linear-gradient(to top,#02060F 8%,rgba(2,6,15,.85) 38%,transparent 100%);}

/* ═══ Top bar — brand lockup + Skip ═══ */
.ob-top{position:absolute;top:0;left:0;right:0;z-index:6;display:flex;justify-content:space-between;align-items:center;padding:${Math.round(topInset) + 14}px 24px 0;}
.ob-logo{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:700;color:#fff;letter-spacing:-.02em;font-family:'Manrope',-apple-system,system-ui,sans-serif;}
.ob-logo-ic{width:26px;height:26px;border-radius:8px;background:rgba(77,142,248,.16);border:1px solid rgba(77,142,248,.32);display:flex;align-items:center;justify-content:center;}
.ob-skip{font-size:13px;font-weight:${isAr ? 500 : 600};color:rgba(255,255,255,.7);cursor:pointer;padding:7px 14px;border-radius:100px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.13);backdrop-filter:blur(8px);transition:background .2s;}
.ob-skip:active{background:rgba(255,255,255,.16);}

/* ═══ Copy slides — staggered blur reveal ═══ */
.ob-content{position:absolute;left:0;right:0;bottom:${Math.round(bottomInset) + 128}px;z-index:5;padding:0 30px;height:210px;}
.ob-slide{position:absolute;left:30px;right:30px;bottom:0;opacity:0;pointer-events:none;transition:opacity .35s cubic-bezier(.22,1,.36,1);}
.ob-slide.active{opacity:1;pointer-events:auto;}
.ob-title{font-family:${displayFont};font-size:${isAr ? 30 : 31}px;font-weight:${isAr ? 700 : 800};color:#fff;letter-spacing:${isAr ? "0" : "-.03em"};line-height:${isAr ? 1.3 : 1.08};margin-bottom:13px;}
.ob-sub{font-size:14px;font-weight:500;color:rgba(255,255,255,.6);line-height:${isAr ? 1.75 : 1.6};max-width:310px;}
.ob-slide .ob-slide .ob-title,.ob-slide .ob-sub{opacity:0;transform:translateY(18px);filter:blur(6px);transition:opacity .6s cubic-bezier(.22,1,.36,1),transform .6s cubic-bezier(.22,1,.36,1),filter .6s cubic-bezier(.22,1,.36,1);}
.ob-slide.active .ob-title{opacity:1;transform:none;filter:none;transition-delay:.16s;}
.ob-slide.active .ob-sub{opacity:1;transform:none;filter:none;transition-delay:.24s;}

/* ═══ Footer — dots + CTA ═══ */
.ob-foot{position:absolute;left:0;right:0;bottom:0;z-index:6;padding:0 30px ${Math.round(bottomInset) + 34}px;display:flex;align-items:center;justify-content:space-between;}
.ob-dots{display:flex;gap:8px;align-items:center;}
.ob-dot{width:8px;height:8px;border-radius:100px;background:rgba(255,255,255,.22);cursor:pointer;transition:all .45s cubic-bezier(.22,1,.36,1);}
.ob-dot.on{width:28px;background:linear-gradient(90deg,#0B4DD4,#4D8EF8);box-shadow:0 0 14px rgba(77,142,248,.6);}
.ob-next{display:flex;align-items:center;gap:11px;padding:14px 16px 14px 24px;border-radius:100px;border:none;cursor:pointer;font-family:inherit;font-size:14.5px;font-weight:700;color:#fff;
  background:linear-gradient(135deg,#4D8EF8,#0B4DD4);box-shadow:0 10px 34px rgba(11,77,212,.55);transition:transform .15s;}
html[dir="rtl"] .ob-next{padding:14px 24px 14px 16px;}
.ob-next:active{transform:scale(.95);}
.ob-next-ic{width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.16);display:flex;align-items:center;justify-content:center;${arrowFlip}}
</style>
</head>
<body>
<div id="ob">
  <div class="ob-blob"></div>
  <canvas id="ob-canvas"></canvas>
  <div class="ob-grid"></div>
  <div class="ob-vig"></div>
  <div class="ob-scrim"></div>
  <div class="ob-top">
    <div class="ob-logo"><span class="ob-logo-ic">${MARK_SVG}</span>${LABELS.brand}</div>
    <div class="ob-skip" id="ob-skip">${LABELS.skip[L]}</div>
  </div>
  <div class="ob-content">${slidesHtml}
  </div>
  <div class="ob-foot">
    <div class="ob-dots">${dotsHtml}</div>
    <button class="ob-next" id="ob-next">
      <span class="ob-next-t">${LABELS.next[L]}</span>
      <span class="ob-next-ic"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>
    </button>
  </div>
</div>
<script>${THREE_MIN_JS}</script>
<script>
(function(){
  'use strict';
  var IS_AR=${isAr ? "true" : "false"};
  var NEXT_LABEL=${JSON.stringify(LABELS.next[L])};
  var START_LABEL=${JSON.stringify(LABELS.start[L])};
  function send(t){try{if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify({t:t}));}catch(e){}}

  var section=document.getElementById('ob');
  var canvas=document.getElementById('ob-canvas');
  var renderer,scene,camera,group,mesh,halo,particles;
  var targetX=0,targetY=0;

  /* Slide palettes — brand blue / platinum / gold (wealth accent). */
  var PAL=[
    {c:0x2160F0,e:0x0A2C86,w:0x9FC2FF,h:0x4D8EF8,m:0.62,r:0.17,ei:0.5},
    {c:0xEAEEF7,e:0x0E121A,w:0xFFFFFF,h:0xC2D8EA,m:0.98,r:0.09,ei:0.08},
    {c:0xE6BD66,e:0x7A5A18,w:0xFFE8B0,h:0xF0C75A,m:0.85,r:0.16,ei:0.42}
  ];
  var BLOB=['rgba(77,142,248,.26)','rgba(186,210,230,.22)','rgba(230,189,102,.22)'];
  var blobEl=document.querySelector('.ob-blob');

  var coreMat,wireMat,accentMat,greenMat,redMat;
  var candleParts=[],curIdx=0;
  /* Feature-mapped objects: 0 ascending signal path (rising chart + golden
     signal nodes), 1 ascending candlesticks (real trading calls), 2 golden
     bell (alerts). Accent parts use the static gold material, no wire. */
  function addPart(parent,geo,x,y,z,mat){
    var m=new THREE.Mesh(geo,mat||coreMat);m.position.set(x,y,z);
    if(!mat){var w=new THREE.Mesh(geo,wireMat);w.scale.setScalar(1.03);m.add(w);}
    parent.add(m);return m;
  }
  function buildShape(i,parent){
    parent.rotation.set(0,0,0);
    candleParts.length=0;
    if(i===0){
      /* Faceted geodesic sphere with a loose wire cage — the market, whole. */
      var s0=addPart(parent,new THREE.IcosahedronGeometry(1.05,1),0,0,0);
      s0.children[0].scale.setScalar(1.07);
    }else if(i===1){
      /* Bullish chart pattern at real price levels: green, red pullback,
         green breakout. Candles float gently (no spin, no resizing);
         colors are fixed. */
      var defs=[
        {x:-0.74,cy:-0.45,h:0.80,z:0.06,mat:greenMat,phase:0.0,speed:0.021},
        {x:0.00,cy:-0.08,h:0.50,z:-0.05,mat:redMat,phase:2.1,speed:0.017},
        {x:0.74,cy:0.34,h:1.10,z:0.03,mat:greenMat,phase:4.2,speed:0.026}
      ];
      for(var k=0;k<3;k++){
        var df=defs[k];
        var body=addPart(parent,new THREE.BoxGeometry(0.36,df.h,0.36),df.x,df.cy,df.z,df.mat);
        var bw=new THREE.Mesh(body.geometry,wireMat);bw.scale.setScalar(1.03);body.add(bw);
        var wTop=addPart(parent,new THREE.CylinderGeometry(0.045,0.045,0.30,6),df.x,df.cy+df.h/2+0.15,df.z);
        var wBot=addPart(parent,new THREE.CylinderGeometry(0.045,0.045,0.24,6),df.x,df.cy-df.h/2-0.12,df.z);
        candleParts.push({body:body,wTop:wTop,wBot:wBot,cy:df.cy,cyT:df.cy+df.h/2+0.15,cyB:df.cy-df.h/2-0.12,phase:df.phase,speed:df.speed});
      }
    }else{
      /* Golden bell — crown knob, faceted skirt, clapper. */
      var P=[[0.00,0.92],[0.22,0.88],[0.30,0.70],[0.34,0.44],[0.38,0.14],[0.46,-0.14],[0.62,-0.40],[0.86,-0.62],[0.94,-0.72],[0.80,-0.74]];
      var pts=P.map(function(p){return new THREE.Vector2(p[0],p[1]);});
      addPart(parent,new THREE.LatheGeometry(pts,9),0,0.05,0);
      addPart(parent,new THREE.IcosahedronGeometry(0.15,0),0,1.02,0);
      addPart(parent,new THREE.IcosahedronGeometry(0.17,0),0,-0.80,0);
      parent.rotation.z=0.12;
    }
  }
  function glowTex(){
    var c=document.createElement('canvas');c.width=c.height=128;var x=c.getContext('2d');
    var g=x.createRadialGradient(64,64,0,64,64,64);
    g.addColorStop(0,'rgba(255,255,255,0.9)');g.addColorStop(0.2,'rgba(77,142,248,0.55)');g.addColorStop(1,'rgba(77,142,248,0)');
    x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);
  }
  function backOut(x){var c1=1.70158,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2);}
  function tweenScale(obj,to,dur,cb){
    var from=obj.scale.x,t0=performance.now();
    (function a(t){var p=Math.min(1,(t-t0)/(dur*1000));var e=backOut(p);obj.scale.setScalar(from+(to-from)*e);if(p<1)requestAnimationFrame(a);else if(cb)cb();})(performance.now());
  }

  try{
    if(!window.THREE)throw new Error('no three');
    renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    scene=new THREE.Scene();
    camera=new THREE.PerspectiveCamera(45,1,0.1,100);camera.position.set(0,0,6);
    scene.add(new THREE.AmbientLight(0x1C2B4D,0.6));
    var d=new THREE.DirectionalLight(0xffffff,1.6);d.position.set(3,5,6);scene.add(d);
    var p1=new THREE.PointLight(0x5B9BFF,2.0,40);p1.position.set(-5,2,3);scene.add(p1);
    var p2=new THREE.PointLight(0xFFE0A0,0.8,40);p2.position.set(4,-3,2);scene.add(p2);
    var p3=new THREE.PointLight(0xffffff,1.0,30);p3.position.set(0,0,6);scene.add(p3);
    group=new THREE.Group();group.position.y=1.18;scene.add(group);
    function envFace(){var c=document.createElement('canvas');c.width=c.height=128;var x=c.getContext('2d');
      var lg=x.createLinearGradient(0,0,0,128);lg.addColorStop(0,'#eaf3ff');lg.addColorStop(0.46,'#9fbcd8');lg.addColorStop(0.5,'#2f3a4b');lg.addColorStop(1,'#0a0f16');
      x.fillStyle=lg;x.fillRect(0,0,128,128);
      var rg=x.createRadialGradient(44,30,2,44,30,48);rg.addColorStop(0,'rgba(255,255,255,0.95)');rg.addColorStop(1,'rgba(255,255,255,0)');
      x.fillStyle=rg;x.fillRect(0,0,128,128);return c;}
    var envTex=new THREE.CubeTexture([envFace(),envFace(),envFace(),envFace(),envFace(),envFace()]);envTex.needsUpdate=true;
    coreMat=new THREE.MeshStandardMaterial({color:PAL[0].c,emissive:PAL[0].e,emissiveIntensity:PAL[0].ei,metalness:PAL[0].m,roughness:PAL[0].r,flatShading:true,envMap:envTex,envMapIntensity:1.15});
    wireMat=new THREE.MeshBasicMaterial({color:PAL[0].w,wireframe:true,transparent:true,opacity:0.22});
    accentMat=new THREE.MeshStandardMaterial({color:0xE6BD66,emissive:0x7A5A18,emissiveIntensity:0.42,metalness:0.85,roughness:0.16,flatShading:true,envMap:envTex,envMapIntensity:1.15});
    greenMat=new THREE.MeshStandardMaterial({color:0x10A860,emissive:0x064D2C,emissiveIntensity:0.45,metalness:0.72,roughness:0.16,flatShading:true,envMap:envTex,envMapIntensity:1.1});
    redMat=new THREE.MeshStandardMaterial({color:0xE0393E,emissive:0x6E1216,emissiveIntensity:0.45,metalness:0.72,roughness:0.16,flatShading:true,envMap:envTex,envMapIntensity:1.1});
    mesh=new THREE.Group();buildShape(0,mesh);group.add(mesh);
    halo=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex(),color:PAL[0].h,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,opacity:0.5}));
    halo.scale.set(4.6,4.6,1);halo.position.set(0,1.18,-1.2);scene.add(halo);
    var N=190,arr=new Float32Array(N*3);
    for(var i=0;i<N;i++){var r=2.6+Math.random()*3.4,th=Math.random()*6.2832,ph=Math.acos(2*Math.random()-1);arr[i*3]=r*Math.sin(ph)*Math.cos(th);arr[i*3+1]=r*Math.sin(ph)*Math.sin(th);arr[i*3+2]=r*Math.cos(ph);}
    var pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(arr,3));
    particles=new THREE.Points(pg,new THREE.PointsMaterial({size:0.045,color:0xAECBFF,transparent:true,opacity:0.7,blending:THREE.AdditiveBlending,depthWrite:false}));
    scene.add(particles);
    function resize(){var w=canvas.clientWidth||390,h=canvas.clientHeight||844;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
    resize();window.addEventListener('resize',resize);
    var t=0;
    (function loop(){
      requestAnimationFrame(loop);
      t+=1;
      if(curIdx===1){
        /* Candles slide: hold a fixed 3/4 heading (no spin); each candle
           floats gently on its own rhythm. Sizes and colors never change. */
        group.rotation.y+=((-0.30)-group.rotation.y)*0.05;
        for(var ci=0;ci<candleParts.length;ci++){
          var cp=candleParts[ci],dy=Math.sin(t*cp.speed+cp.phase)*0.05;
          cp.body.position.y=cp.cy+dy;
          cp.wTop.position.y=cp.cyT+dy;
          cp.wBot.position.y=cp.cyB+dy;
        }
      }else{
        group.rotation.y+=0.006;
      }
      group.rotation.x=Math.sin(t*0.012)*0.12+targetY*0.25;
      group.rotation.z=-targetX*0.2;
      group.position.y=1.18+Math.sin(t*0.02)*0.11;
      halo.position.y=group.position.y;
      particles.rotation.y+=0.0009;particles.rotation.x+=0.0004;
      camera.position.x+=((targetX*0.7)-camera.position.x)*0.05;
      camera.position.y+=((-targetY*0.5)-camera.position.y)*0.05;
      camera.lookAt(0,0.66,0);
      renderer.render(scene,camera);
    })();
    window.obMorph=function(i){
      tweenScale(mesh,0.001,0.22,function(){
        while(mesh.children.length){var old=mesh.children.pop();if(old.geometry)old.geometry.dispose();}
        buildShape(i,mesh);
        curIdx=i;
        coreMat.color.setHex(PAL[i].c);coreMat.emissive.setHex(PAL[i].e);
        coreMat.metalness=PAL[i].m;coreMat.roughness=PAL[i].r;coreMat.emissiveIntensity=PAL[i].ei;
        wireMat.color.setHex(PAL[i].w);halo.material.color.setHex(PAL[i].h);
        tweenScale(mesh,1,0.6);
      });
    };
  }catch(e){window.obMorph=function(){};}

  /* Pointer parallax + swipe (mirrored for RTL). */
  section.addEventListener('pointermove',function(e){var r=canvas.getBoundingClientRect();targetX=((e.clientX-r.left)/r.width-0.5)*1.2;targetY=((e.clientY-r.top)/r.height-0.5)*1.2;});
  section.addEventListener('pointerleave',function(){targetX=0;targetY=0;});
  var downX=null;
  section.addEventListener('pointerdown',function(e){downX=e.clientX;});
  section.addEventListener('pointerup',function(e){
    targetX=0;targetY=0;
    if(downX==null)return;var dx=e.clientX-downX;downX=null;
    var fwd=IS_AR?dx>45:dx<-45, back=IS_AR?dx<-45:dx>45;
    if(fwd)obGo(obIndex+1);else if(back)obGo(obIndex-1);
  });

  /* Slides state machine. */
  var slides=[].slice.call(section.querySelectorAll('.ob-slide'));
  var dots=[].slice.call(section.querySelectorAll('.ob-dot'));
  var nextBtn=document.getElementById('ob-next');
  var obIndex=0;
  function obGo(i){
    var to=Math.max(0,Math.min(slides.length-1,i));
    if(to===obIndex&&i!==0)return;
    obIndex=to;
    slides.forEach(function(s,k){s.classList.toggle('active',k===obIndex);});
    dots.forEach(function(dd,k){dd.classList.toggle('on',k===obIndex);});
    nextBtn.querySelector('.ob-next-t').textContent=obIndex===slides.length-1?START_LABEL:NEXT_LABEL;
    if(blobEl)blobEl.style.background='radial-gradient(circle,'+BLOB[obIndex]+',transparent 64%)';
    if(window.obMorph)window.obMorph(obIndex);
    send('haptic');
  }
  dots.forEach(function(dd,k){dd.addEventListener('click',function(){obGo(k);});});
  nextBtn.addEventListener('click',function(){if(obIndex>=slides.length-1){send('done');}else{obGo(obIndex+1);}});
  document.getElementById('ob-skip').addEventListener('click',function(){send('skip');});
})();
</script>
</body>
</html>`;
}
