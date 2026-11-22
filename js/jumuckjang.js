(()=>{
'use strict';
const $=id=>document.getElementById(id),val=id=>Number($(id).value),checked=id=>$(id).checked;
const fmt=v=>Number.isFinite(v)?Number(v.toFixed(3)).toLocaleString('ko-KR'):'—';
const svgNS='http://www.w3.org/2000/svg';
let mode='A',view='each',previewDismissed=false,showDiagonal=true,showHeight=true,showCenter=true,showJoint=true,showSlope=true,figureFullscreen=false;
const eduStorageKey='woodlab.jumuckjang.edu-mode.v5';
let eduSyncing=false;
const defaults=Object.fromEntries(Array.from(document.querySelectorAll('input')).map(el=>[el.id,el.type==='checkbox'?el.checked:el.value]));
let openInputMenu=()=>{};
function readEduPref(){try{const v=localStorage.getItem(eduStorageKey);return v===null?false:v==='1';}catch{return false;}}
function writeEduPref(on){try{localStorage.setItem(eduStorageKey,on?'1':'0');}catch{/* ignore */}}
function setDrawingToggles(on){showDiagonal=!!on;showHeight=!!on;showCenter=!!on;showJoint=!!on;showSlope=!!on;}
function drawingTogglesAllOn(){return !!(showDiagonal&&showHeight&&showCenter&&showJoint&&showSlope);}
function setEduChecked(on){eduSyncing=true;$('edu-mode').checked=!!on;eduSyncing=false;}
/* 체크 UI만 반전: 해제=토글 전부 보임, 선택=전부 숨김. 하나라도 끄면 교육용 선택 */
function syncEduFromToggles(){const checked=!drawingTogglesAllOn();if($('edu-mode').checked===checked)return;setEduChecked(checked);writeEduPref(checked);}
function applyEduMode(checked){const on=!!checked;setEduChecked(on);setDrawingToggles(!on);writeEduPref(on);}
(function initEduMode(){applyEduMode(readEduPref());})();
const widthStorageKey='woodlab.jumuckjang.app-width',widthOptions=[800,1024,1200];
function readAppWidth(){try{const n=Number(localStorage.getItem(widthStorageKey));if(widthOptions.includes(n))return n;}catch{/* ignore */}return 800;}
function applyAppWidth(n){const width=widthOptions.includes(n)?n:800;document.documentElement.style.setProperty('--app-max-width',`${width}px`);document.querySelectorAll('[data-app-width]').forEach(btn=>btn.setAttribute('aria-pressed',String(Number(btn.dataset.appWidth)===width)));try{localStorage.setItem(widthStorageKey,String(width));}catch{/* ignore */}}
(function initAppWidth(){applyAppWidth(readAppWidth());document.querySelectorAll('[data-app-width]').forEach(btn=>btn.addEventListener('click',()=>applyAppWidth(Number(btn.dataset.appWidth))));})();
function inputMin(el){const min=Number(el.min);return Number.isFinite(min)?min:1;}
function isCountField(el){return el.id==='ac'||el.id==='bc'||el.id==='cc';}
function sanitizeNumber(el){const decimal=el.step==='any';let value=el.value.replace(decimal?/[^0-9.]/g:/\D/g,'');if(decimal){const parts=value.split('.');value=parts.shift()+(parts.length?'.'+parts.join(''):'');}if(el.value!==value)el.value=value;}
function enforceNumberMinimum(el){if(el.type!=='number'||el.value==='')return;const min=inputMin(el),n=Number(el.value);if(!Number.isFinite(n)||n<min)el.value=String(min);}
function enforceOddCount(el){
if(!isCountField(el)||el.value==='')return;
let n=Math.round(Number(el.value));
if(!Number.isFinite(n))return;
const min=inputMin(el),max=Number(el.max);const hi=Number.isFinite(max)?max:19;
if(n%2===0)n-=1;
if(n<min)n=min%2===0?min+1:min;
if(n>hi)n=hi%2===0?hi-1:hi;
if(n%2===0)n-=1;
if(el.value!==String(n))el.value=String(n);
}
function normalizeNumberInput(el){sanitizeNumber(el);enforceNumberMinimum(el);enforceOddCount(el);}
function stepCount(id,dir){
const el=$(id);if(!el)return;
normalizeNumberInput(el);
const min=inputMin(el),max=Number(el.max),hi=Number.isFinite(max)?max:19;
let n=Number(el.value);if(!Number.isFinite(n))n=min;
n+=dir>0?2:-2;
if(n%2===0)n+=dir>0?1:-1;
if(n<min)n=min%2===0?min+1:min;
if(n>hi)n=hi%2===0?hi-1:hi;
el.value=String(n);
previewDismissed=false;
render();
}
function syncCountSteppers(){
document.querySelectorAll('.count-step').forEach(btn=>{
const el=$(btn.dataset.count);if(!el)return;
normalizeNumberInput(el);
const n=Number(el.value),min=inputMin(el),max=Number(el.max),hi=Number.isFinite(max)?max:19;
const dir=Number(btn.dataset.dir);
btn.disabled=dir>0?n>=hi:n<=min;
});
}
function syncAutoInputs(){const m=val('width'),h=val('thick'),angle=val('angle'),ac=val('ac'),bc=val('bc'),bEdge=val('b-edge'),bCenterCount=bc-2;if(Number.isFinite(m)&&Number.isFinite(ac)&&ac>0)$('aw').value=String(Number((m/ac).toFixed(3)));if(Number.isFinite(h)&&Number.isFinite(angle))$('a-edge').value=String(Number((h*Math.tan(angle*Math.PI/180)).toFixed(3)));if(Number.isFinite(m)&&Number.isFinite(bc)&&Number.isFinite(bEdge)&&bCenterCount>0&&m>bEdge*2)$('bt').value=String(Number(((m-bEdge*2)/bCenterCount).toFixed(3)));}
function setupMobilePanels(){
const container=document.querySelector('.workspace-inputs');
const workspace=container?.closest('.workspace');
if(!container||container.querySelector('.mobile-input-group-toggle'))return;
const body=document.createElement('div');body.className='mobile-input-group-body';body.id='mobile-input-group-body';
while(container.firstChild)body.append(container.firstChild);
const showPreview=document.createElement('button');showPreview.type='button';showPreview.className='show-preview';showPreview.textContent='계산하기';showPreview.hidden=true;
const toggle=document.createElement('button');toggle.type='button';toggle.className='mobile-input-group-toggle';toggle.textContent='입력값';
const closeBtn=document.createElement('button');closeBtn.type='button';closeBtn.className='mobile-input-close';closeBtn.textContent='닫기';
const backdrop=document.createElement('button');backdrop.type='button';backdrop.className='mobile-input-backdrop';backdrop.hidden=true;backdrop.setAttribute('aria-label','입력값 메뉴 닫기');
document.body.append(backdrop);
const isMobile=()=>window.matchMedia('(max-width:767px)').matches;
function setExpanded(expanded){
container.dataset.collapsed=String(!expanded);
toggle.setAttribute('aria-expanded',String(expanded));
workspace?.classList.toggle('inputs-collapsed',!expanded);
backdrop.hidden=!isMobile()||!expanded;
}
setExpanded(false);
toggle.setAttribute('aria-controls',body.id);
openInputMenu=()=>setExpanded(true);
toggle.addEventListener('click',()=>setExpanded(toggle.getAttribute('aria-expanded')!=='true'));
closeBtn.addEventListener('click',()=>setExpanded(false));
backdrop.addEventListener('click',()=>setExpanded(false));
showPreview.addEventListener('click',()=>{if(!previewDismissed)return;previewDismissed=false;setExpanded(false);render();});
body.append(showPreview);
container.append(toggle,body,closeBtn);
window.addEventListener('resize',()=>{
if(isMobile()){backdrop.hidden=container.dataset.collapsed!=='false';return;}
backdrop.hidden=true;
});
}
function gcd(a,b){a=Math.abs(a);b=Math.abs(b);while(b){const r=a%b;a=b;b=r}return a||1;}
function whole(v){return Math.abs(v-Math.round(v))<1e-9;}
function compute(){
const m=val('width'),h=val('thick'),angle=val('angle'),n=val(mode==='A'?'ac':mode==='B'?'bc':'cc');
const endsSelected=mode==='B'||mode==='A'&&checked('a-ends');
const edge=endsSelected?val(mode==='A'?'a-edge':'b-edge'):0;
// Every numeric field except angle must stay positive; unchecked optional edge fields are ignored.
const ends=endsSelected&&edge>0;
if([m,h,angle,n,edge].some(v=>!Number.isFinite(v))||m<=0||h<=0||angle<0||angle>=80||!Number.isInteger(n)||n%2===0||n<3||n>19||edge<0||(mode==='B'&&edge<=0)||edge*2>=m)return {error:'부재 치수, 주먹장 개수(홀수) 및 좌/우 주먹장 길이를 확인해 주세요.'};
let step=0,total=0,tooth=0,gap=0,diagonalRequired=true,diagonalCount=n;
if(mode==='A'){
const aw=val('aw');if(!(aw>0))return {error:'주먹장의 길이는 0보다 커야 합니다.'};
if(!ends&&whole(m/n)){step=m/n;total=m;diagonalRequired=false;}else{step=Math.max(Math.floor(m/n)+1,Math.ceil(aw),Math.round(m*1.1/n));total=step*n;}
 }else if(mode==='B'){
if(!(val('bt')>0))return {error:'B형 주먹장 길이를 확인해 주세요.'};
// B형 파란 대각선은 좌/우 주먹장을 제외한 중앙 구간만 계산한다.
const centerWidth=m-2*edge;
diagonalCount=n-2;
if(whole(centerWidth/diagonalCount)){step=centerWidth/diagonalCount;diagonalRequired=false;}else step=Math.max(1,Math.floor(centerWidth/diagonalCount)+1,Math.round(centerWidth*1.1/diagonalCount));
total=diagonalCount*step;
}else{
const t=val('ct');if(n<3||!(t>0)||n*t>=m)return {error:'C형은 주먹장 길이 × 주먹장 개수가 부재 가로보다 작아야 합니다.'};
const horizontalGap=(m-n*t)/(n-1),x=Math.round(t*1000),y=Math.round(horizontalGap*1000),d=gcd(x,y),u=x/d,v=y/d,base=n*u+(n-1)*v;
if(base<=0||base>10000000)return {error:'정수 분할 범위를 초과했습니다.'};
const multiplier=Math.max(1,Math.floor(m/base)+1);tooth=u*multiplier;gap=v*multiplier;total=base*multiplier;
}
const compareWidth=mode==='B'?m-2*edge:m;
if(!((diagonalRequired?total>compareWidth:total>=compareWidth)&&total<10000000))return {error:'대각선 길이 조건을 확인해 주세요.'};
const segments=[];
if(mode==='C'){
const t=val('ct'),horizontalGap=(m-n*t)/(n-1);
for(let i=0;i<2*n-1;i++)segments.push({w:i%2===0?t:horizontalGap,kind:i%2===0?'keep':'cut'});
}else{
if(ends)segments.push({w:edge,kind:'edge'});
const segmentCount=mode==='B'?n-2:n;
for(let i=0;i<segmentCount;i++)segments.push({w:(m-2*edge)/segmentCount,kind:(ends||mode==='B')?(i%2===0?'cut':'keep'):(i%2===0?'keep':'cut')});
if(ends)segments.push({w:edge,kind:'edge'});
}
const cumulative=[0];segments.forEach(s=>cumulative.push(cumulative.at(-1)+s.w));
const marks=mode==='A'||mode==='B'?Array.from({length:diagonalCount+1},(_,i)=>i*step):cumulative.map(v=>v*total/m);
return {m,h,angle,n,diagonalCount,ends,edge,step,total,tooth,gap,segments,cumulative,marks,diagonalRequired};
}
function shape(tag,attrs={},parent=$('drawing'),label){const el=document.createElementNS(svgNS,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));if(label!==undefined)el.textContent=label;parent.append(el);return el;}
function draw(r){
const svg=$('drawing');svg.replaceChildren();const X=39,W=340,Y=248,H=Math.min(88,W*r.h/r.m),centerWidth=mode==='B'?r.m-2*r.edge:r.m;
const diagonalVisible=showDiagonal&&r.diagonalRequired;
const lineX=mode==='B'?X+W*r.edge/r.m:X, lineW=mode==='B'?W*centerWidth/r.m:W;
const rise=Math.min(145,W*Math.sqrt(Math.max(0,r.total*r.total-centerWidth*centerWidth))/r.m),mid=Y+H/2;
const xp=v=>X+W*v/r.m,xd=v=>lineX+lineW*v/r.total;
const slopeActive=showSlope&&r.angle>0,drawingAngle=slopeActive?r.angle:0,tilt=H/2*Math.tan(drawingAngle*Math.PI/180),sgn=checked('reverse')?-1:1,slopeEnds=checked('edge-slope');
const borders=r.cumulative.map((v,i)=>{
let direction=0;if(i>0&&i<r.cumulative.length-1){if(r.ends&&(i===1||i===r.cumulative.length-2))direction=slopeEnds?(i===1?-1:1):0;else direction=i%2===1?-1:1;}direction*=sgn;
return {x:xp(v),top:xp(v)+tilt*direction,bottom:xp(v)-tilt*direction,direction};
});
// 아래쪽 치수선과 마지막 텍스트의 글리프가 SVG 경계에 걸리지 않도록 하단 40px 이상 확보
const dimensionBottom=Y+H+(mode==='B'?54:42);
svg.setAttribute('viewBox',`0 0 420 ${dimensionBottom+28}`);
const defs=shape('defs'),pat=shape('pattern',{id:'joint-hatch',width:8,height:8,patternUnits:'userSpaceOnUse'},defs);
shape('rect',{width:8,height:8,fill:'#fee2e2'},pat);shape('path',{d:'M0 8 L8 0 M0 0 L8 8',stroke:'#dc2626','stroke-width':0.5},pat);
const clip=shape('clipPath',{id:'joint-clip'},defs);shape('rect',{x:X,y:Y,width:W,height:H},clip);
const extensionTop=24;
shape('rect',{x:X,y:extensionTop,width:W,height:Y-extensionTop,fill:'#fb923c','fill-opacity':.13});
shape('rect',{x:X,y:Y,width:W,height:H,fill:'#fb923c','fill-opacity':.13});
shape('text',{x:X+10,y:extensionTop+30,fill:'#ea580c','font-size':24,'font-weight':700},svg,'부재');
const fillGroup=shape('g',{'clip-path':'url(#joint-clip)'});
if(showJoint)r.segments.forEach((s,i)=>{if(s.kind!=='cut'&&s.kind!=='edge')return;const a=borders[i],b=borders[i+1];shape('polygon',{points:`${a.top},${Y} ${b.top},${Y} ${b.bottom},${Y+H} ${a.bottom},${Y+H}`,fill:s.kind==='edge'?'#16a34a':'url(#joint-hatch)','fill-opacity':s.kind==='edge'?.43:1},fillGroup);});
if(showJoint||showSlope)borders.slice(1,-1).forEach(p=>{const hasSlope=slopeActive&&Math.abs(p.direction)>1e-9;shape('line',{x1:hasSlope?p.top:p.x,y1:Y,x2:hasSlope?p.bottom:p.x,y2:Y+H,stroke:hasSlope?'#9333ea':'#dc2626','stroke-width':2.2},fillGroup);});
shape('path',{d:`M${X} ${extensionTop} V${Y+H} M${X+W} ${extensionTop} V${Y+H}`,fill:'none',stroke:'#ea580c','stroke-width':2.4});
r.segments.forEach((s,i)=>{const a=borders[i],b=borders[i+1];const cutTop=showJoint&&s.kind==='cut';const topDash=!cutTop&&(!showJoint||s.kind==='keep'||s.kind==='edge'),bottomDash=showJoint&&s.kind==='cut';const line=(x1,x2,y,dash)=>{const attrs={x1,y1:y,x2,y2:y,stroke:'#ea580c','stroke-width':dash?1.2:2.4};if(dash)attrs['stroke-dasharray']='5 4';shape('line',attrs);};if(showHeight||cutTop)line(a.top,b.top,Y,topDash);line(a.bottom,b.bottom,Y+H,bottomDash);});
if((showDiagonal||showJoint)&&r.segments.length<=13)r.segments.forEach((s,i)=>{const a=borders[i],b=borders[i+1];shape('text',{x:(a.x+b.x)/2,y:Y+H+14,fill:s.kind==='edge'?'#16a34a':'#2563eb','font-size':10,'font-weight':700,'text-anchor':'middle'},svg,fmt(s.w));});
if(showCenter){shape('line',{x1:X,y1:mid,x2:X+W,y2:mid,stroke:'#64748b','stroke-dasharray':'5 4'});shape('text',{x:X+W+7,y:mid+4,fill:'#64748b','font-size':10,'font-weight':700},svg,'중심선');}
if(diagonalVisible){const diagonalPad=24,diagonalBaseY=Y+H,guideTop=Math.max(extensionTop+58,diagonalBaseY-rise-54),diagonalLength=Math.hypot(lineW,rise)||1,diagonalDx=lineW/diagonalLength,diagonalDy=-rise/diagonalLength,diagonalAngle=Math.atan2(-rise,lineW)*180/Math.PI,diagonalEndX=lineX+lineW+diagonalDx*diagonalPad,diagonalEndY=diagonalBaseY-rise+diagonalDy*diagonalPad;
shape('line',{x1:lineX-diagonalDx*diagonalPad,y1:diagonalBaseY-diagonalDy*diagonalPad,x2:diagonalEndX,y2:diagonalEndY,stroke:'#2563eb','stroke-width':1});
r.marks.forEach((v,i)=>{const y=diagonalBaseY-rise*v/r.total;const showGuide=mode==='B'?true:i>0&&i<r.marks.length-1;if(showGuide)shape('line',{x1:xd(v),y1:guideTop,x2:xd(v),y2:diagonalBaseY+16,stroke:'#0d9488','stroke-dasharray':'3 3'});shape('circle',{cx:xd(v),cy:y,r:2.8,fill:'#2563eb'});});
if(r.marks.length<=17){if(view==='each')r.marks.slice(0,-1).forEach((v,i)=>{const next=r.marks[i+1],z=(v+next)/2,x=xd(z),y=diagonalBaseY-rise*z/r.total-8;shape('text',{x,y,fill:'#2563eb','font-size':10,'font-weight':650,'text-anchor':'middle',transform:`rotate(${diagonalAngle} ${x} ${y})`},svg,fmt(next-v));});else (mode==='B'?r.marks.slice(1):r.marks.slice(1,-1)).forEach(v=>{const x=xd(v),y=diagonalBaseY-rise*v/r.total-8;shape('text',{x,y,fill:'#2563eb','font-size':10,'font-weight':650,'text-anchor':'middle',transform:`rotate(${diagonalAngle} ${x} ${y})`},svg,fmt(v));});}
}
let slopeLabelIndex=0;
if(slopeActive)borders.slice(1,-1).forEach(p=>{if(Math.abs(p.direction)<1e-9)return;const labelDir=p.direction*(checked('reverse')?-1:1),x=labelDir>0?p.x+11:p.x-11,y=slopeLabelIndex%2===0?mid-14:mid+20;slopeLabelIndex++;shape('text',{x:Math.max(14,Math.min(406,x)),y,fill:'#9333ea','font-size':11,'font-weight':700,'text-anchor':labelDir>0?'start':'end'},svg,`${fmt(r.angle)}°`);});
if(showHeight){
shape('line',{x1:X-12,y1:Y,x2:X-12,y2:Y+H,stroke:'#ea580c'});
shape('line',{x1:X-17,y1:Y,x2:X-7,y2:Y,stroke:'#ea580c'});
shape('line',{x1:X-17,y1:Y+H,x2:X-7,y2:Y+H,stroke:'#ea580c'});
shape('text',{x:X-17,y:mid+4,fill:'#ea580c','font-size':12,'font-weight':700,'text-anchor':'end'},svg,fmt(r.h));
}
shape('line',{x1:X,y1:Y+H+(mode==='B'?32:20),x2:X+W,y2:Y+H+(mode==='B'?32:20),stroke:'#ea580c'});
shape('line',{x1:X,y1:Y+H+(mode==='B'?27:15),x2:X,y2:Y+H+(mode==='B'?37:25),stroke:'#ea580c'});
shape('line',{x1:X+W,y1:Y+H+(mode==='B'?27:15),x2:X+W,y2:Y+H+(mode==='B'?37:25),stroke:'#ea580c'});
shape('text',{x:210,y:Y+H+(mode==='B'?54:42),fill:'#ea580c','font-size':12,'font-weight':700,'text-anchor':'middle'},svg,`부재 가로 ${fmt(r.m)}`);
}
function detail(label,value,color){return `<div class="detail"><span>${label}</span><strong style="color:${color}">${fmt(value)} mm</strong></div>`;}
function render(){
syncAutoInputs();
const endsSelected=mode==='B'||mode==='A'&&checked('a-ends');
const edge=endsSelected?val(mode==='A'?'a-edge':'b-edge'):0;
const ends=endsSelected&&Number.isFinite(edge)&&edge>0;
for(const t of ['A','B','C']){document.querySelector(`[data-mode="${t}"]`).setAttribute('aria-selected',String(mode===t));$(t.toLowerCase()+'-panel').classList.toggle('hidden',mode!==t);}
$('type-title').textContent=mode==='A'?'A형 · 균등 분할':mode==='B'?'B형 · 좌/우 주먹장 구분':'C형 · 주먹장 고정 / 간격 자동';
$('a-edge-wrap').classList.toggle('hidden',!checked('a-ends'));
$('edge-slope').disabled=!ends;
$('edge-slope-wrap').classList.toggle('unavailable',!ends);
$('edge-slope-wrap').title=ends?'':'좌/우 주먹장이 없는 유형에서는 적용되지 않습니다.';
$('drawing-status').textContent=`${mode}형 · ${checked('reverse')?'반전':'기본'} 방향`;
syncCountSteppers();
document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
const diagonalToggle=$('diagonal-toggle');diagonalToggle.disabled=false;diagonalToggle.setAttribute('aria-pressed',String(showDiagonal));diagonalToggle.textContent=showDiagonal?'대각선 보임':'대각선 숨김';
const heightToggle=$('height-toggle');heightToggle.setAttribute('aria-pressed',String(showHeight));heightToggle.textContent=showHeight?'주먹장 높이 보임':'주먹장 높이 숨김';
const centerToggle=$('center-toggle');centerToggle.setAttribute('aria-pressed',String(showCenter));centerToggle.textContent=showCenter?'중심선 보임':'중심선 숨김';
const jointToggle=$('joint-toggle');jointToggle.setAttribute('aria-pressed',String(showJoint));jointToggle.textContent=showJoint?'주먹장 보임':'주먹장 숨김';
const slopeToggle=$('slope-toggle');slopeToggle.setAttribute('aria-pressed',String(showSlope));slopeToggle.textContent=showSlope?'경사각 보임':'경사각 숨김';
$('drawing').closest('.workspace-preview').classList.toggle('hidden',previewDismissed);
$('drawing').closest('.workspace').classList.toggle('preview-dismissed',previewDismissed);
document.querySelector('.show-preview')?.toggleAttribute('hidden',!previewDismissed);
if(previewDismissed)return;
const r=compute();if(r.error){$('result').innerHTML=`<div class="error">${r.error}</div>`;$('drawing').replaceChildren();return;}
diagonalToggle.disabled=!r.diagonalRequired;diagonalToggle.setAttribute('aria-pressed',String(!!(showDiagonal&&r.diagonalRequired)));diagonalToggle.textContent=r.diagonalRequired?(showDiagonal?'대각선 보임':'대각선 숨김'):'대각선 불필요';
let html=r.diagonalRequired?`<div class="metrics"><div class="metric"><small>대각선 총길이</small><strong>${fmt(r.total)} mm</strong></div><div class="metric"><small>${mode==='C'?'대각선 주먹장 길이':'대각선 균등 분할'}</small><strong>${fmt(mode==='C'?r.tooth:r.step)} mm</strong></div></div>`:`<div class="metrics"><div class="metric"><small>가로 균등 분할</small><strong>${fmt(r.step)} mm</strong></div></div>`;
if(mode==='A'&&endsSelected){html+=detail('좌/우 주먹장 가로 길이 (각각)',r.edge,'#16a34a');}
$('result').innerHTML=html;draw(r);
}
function flipDrawingToggle(key){
if(key==='diagonal')showDiagonal=!showDiagonal;
else if(key==='height')showHeight=!showHeight;
else if(key==='center'){showCenter=!showCenter;if(showCenter)showHeight=true;}
else if(key==='joint'){showJoint=!showJoint;if(showJoint)showHeight=true;}
else if(key==='slope')showSlope=!showSlope;
syncEduFromToggles();
previewDismissed=false;
render();
}
document.querySelectorAll('input').forEach(el=>{
if(el.id==='edu-mode')return;
if(el.type==='number'){
el.addEventListener('keydown',e=>{if(e.key==='-'||e.key==='+'||e.key==='e'||e.key==='E'||(e.key==='.'&&el.step!=='any')||(e.key==='.'&&el.value.includes('.')))e.preventDefault();});
el.addEventListener('paste',()=>requestAnimationFrame(()=>normalizeNumberInput(el)));
}
el.addEventListener('input',()=>{if(el.type==='number')normalizeNumberInput(el);previewDismissed=false;render()});
el.addEventListener('change',()=>{if(el.type==='number')normalizeNumberInput(el);previewDismissed=false;render()});
});
$('edu-mode').addEventListener('change',()=>{
if(eduSyncing)return;
applyEduMode($('edu-mode').checked);
previewDismissed=false;
render();
});
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;previewDismissed=false;render()}));
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;previewDismissed=false;render()}));
document.querySelectorAll('.count-step').forEach(btn=>btn.addEventListener('click',()=>stepCount(btn.dataset.count,Number(btn.dataset.dir))));
$('diagonal-toggle').addEventListener('click',()=>flipDrawingToggle('diagonal'));
$('height-toggle').addEventListener('click',()=>flipDrawingToggle('height'));
$('center-toggle').addEventListener('click',()=>flipDrawingToggle('center'));
$('joint-toggle').addEventListener('click',()=>flipDrawingToggle('joint'));
$('slope-toggle').addEventListener('click',()=>flipDrawingToggle('slope'));
$('figure-fullscreen-toggle').addEventListener('click',()=>{figureFullscreen=!figureFullscreen;const figure=$('drawing').closest('.figure'),button=$('figure-fullscreen-toggle');figure.classList.toggle('is-fullscreen',figureFullscreen);document.body.classList.toggle('drawing-fullscreen-active',figureFullscreen);button.setAttribute('aria-pressed',String(figureFullscreen));button.setAttribute('aria-label',figureFullscreen?'작도 전체보기 닫기':'작도 전체보기');button.textContent=figureFullscreen?'×':'⛶';});
$('reset').addEventListener('click',()=>{for(const [id,v] of Object.entries(defaults)){const el=$(id);if(el.id==='edu-mode')continue;if(el.type==='checkbox')el.checked=v;else el.value=v;}mode='A';view='each';applyEduMode(false);previewDismissed=true;render();document.querySelector('.show-preview')?.removeAttribute('hidden');openInputMenu();});
setupMobilePanels();
render();
})();
