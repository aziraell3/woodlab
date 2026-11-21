(()=>{
'use strict';
const $=id=>document.getElementById(id),val=id=>Number($(id).value),checked=id=>$(id).checked;
const fmt=v=>Number.isFinite(v)?Number(v.toFixed(3)).toLocaleString('ko-KR'):'—';
const svgNS='http://www.w3.org/2000/svg';
let mode='A',view='each',previewDismissed=false;
const defaults=Object.fromEntries(Array.from(document.querySelectorAll('input')).map(el=>[el.id,el.type==='checkbox'?el.checked:el.value]));
let openInputMenu=()=>{};
function setupMobilePanels(){
const container=document.querySelector('.workspace-inputs');
if(!container||container.querySelector('.mobile-input-group-toggle'))return;
const body=document.createElement('div');body.className='mobile-input-group-body';body.id='mobile-input-group-body';
while(container.firstChild)body.append(container.firstChild);
const showPreview=document.createElement('button');showPreview.type='button';showPreview.className='show-preview';showPreview.textContent='계산하기';showPreview.hidden=true;
const toggle=document.createElement('button');toggle.type='button';toggle.className='mobile-input-group-toggle';toggle.textContent='입력값';
const backdrop=document.createElement('button');backdrop.type='button';backdrop.className='mobile-input-backdrop';backdrop.hidden=true;backdrop.setAttribute('aria-label','입력값 메뉴 닫기');
document.body.append(backdrop);
function setExpanded(expanded){container.dataset.collapsed=String(!expanded);toggle.setAttribute('aria-expanded',String(expanded));backdrop.hidden=!expanded;}
setExpanded(false);toggle.setAttribute('aria-controls',body.id);
openInputMenu=()=>setExpanded(true);
toggle.addEventListener('click',()=>setExpanded(toggle.getAttribute('aria-expanded')!=='true'));
backdrop.addEventListener('click',()=>setExpanded(false));
showPreview.addEventListener('click',()=>{if(!previewDismissed)return;previewDismissed=false;setExpanded(false);render();});
body.append(showPreview);
container.append(toggle,body);
}
function gcd(a,b){a=Math.abs(a);b=Math.abs(b);while(b){const r=a%b;a=b;b=r}return a||1;}
function compute(){
const m=val('width'),h=val('thick'),angle=val('angle'),n=val(mode==='A'?'ac':mode==='B'?'bc':'cc');
const endsSelected=mode==='B'||mode==='A'&&checked('a-ends');
const edge=endsSelected?val(mode==='A'?'a-edge':'b-edge'):0;
// 0mm is valid: omit zero-width end regions and draw the full center span.
const ends=endsSelected&&edge>0;
if([m,h,angle,n,edge].some(v=>!Number.isFinite(v))||m<=0||h<=0||angle<0||angle>=80||!Number.isInteger(n)||n<1||n>20||edge<0||edge*2>=m)return {error:'부재 치수, 촉 개수 및 좌우 촉 길이를 확인해 주세요.'};
let step=0,total=0,tooth=0,gap=0;
if(mode==='A'){
const aw=val('aw');if(!(aw>0))return {error:'촉의 가로 길이는 0보다 커야 합니다.'};
step=Math.max(Math.floor(m/n)+1,Math.ceil(aw),Math.round(m*1.1/n));total=step*n;
 }else if(mode==='B'){
if(!(val('bt')>0))return {error:'B형 촉 길이를 확인해 주세요.'};
// B형 파란 대각선은 좌우 촉을 제외한 중앙 구간만 계산한다.
const centerWidth=m-2*edge;
step=Math.max(1,Math.floor(centerWidth/n)+1,Math.round(centerWidth*1.1/n));
total=n*step;
}else{
const t=val('ct');if(n<2||!(t>0)||n*t>=m)return {error:'C형은 촉 길이 × 촉 개수가 부재 가로보다 작아야 합니다.'};
const horizontalGap=(m-n*t)/(n-1),x=Math.round(t*1000),y=Math.round(horizontalGap*1000),d=gcd(x,y),u=x/d,v=y/d,base=n*u+(n-1)*v;
if(base<=0||base>10000000)return {error:'정수 분할 범위를 초과했습니다.'};
const multiplier=Math.max(1,Math.floor(m/base)+1);tooth=u*multiplier;gap=v*multiplier;total=base*multiplier;
}
if(!(total>(mode==='B'?m-2*edge:m)&&total<10000000))return {error:'대각선 길이 조건을 확인해 주세요.'};
const segments=[];
if(mode==='C'){
const t=val('ct'),horizontalGap=(m-n*t)/(n-1);
for(let i=0;i<2*n-1;i++)segments.push({w:i%2===0?t:horizontalGap,kind:i%2===0?'keep':'cut'});
}else{
if(ends)segments.push({w:edge,kind:'edge'});
for(let i=0;i<n;i++)segments.push({w:(m-2*edge)/n,kind:(ends||mode==='B')?(i%2===0?'cut':'keep'):(i%2===0?'keep':'cut')});
if(ends)segments.push({w:edge,kind:'edge'});
}
const cumulative=[0];segments.forEach(s=>cumulative.push(cumulative.at(-1)+s.w));
const marks=mode==='A'||mode==='B'?Array.from({length:n+1},(_,i)=>i*step):cumulative.map(v=>v*total/m);
return {m,h,angle,n,ends,edge,step,total,tooth,gap,segments,cumulative,marks};
}
function shape(tag,attrs={},parent=$('drawing'),label){const el=document.createElementNS(svgNS,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));if(label!==undefined)el.textContent=label;parent.append(el);return el;}
function draw(r){
const svg=$('drawing');svg.replaceChildren();const X=39,W=340,Y=226,H=Math.min(88,W*r.h/r.m),centerWidth=mode==='B'?r.m-2*r.edge:r.m;
const lineX=mode==='B'?X+W*r.edge/r.m:X, lineW=mode==='B'?W*centerWidth/r.m:W;
const rise=Math.min(145,W*Math.sqrt(Math.max(0,r.total*r.total-centerWidth*centerWidth))/r.m),mid=Y+H/2;
const xp=v=>X+W*v/r.m,xd=v=>lineX+lineW*v/r.total;
const tilt=H/2*Math.tan(r.angle*Math.PI/180),sgn=checked('reverse')?-1:1,slopeEnds=checked('edge-slope');
const borders=r.cumulative.map((v,i)=>{
let direction=0;if(i>0&&i<r.cumulative.length-1){if(r.ends&&(i===1||i===r.cumulative.length-2))direction=slopeEnds?(i===1?-1:1):0;else direction=i%2===1?-1:1;}direction*=sgn;
return {x:xp(v),top:xp(v)+tilt*direction,bottom:xp(v)-tilt*direction,direction};
});
// 아래쪽 치수선과 마지막 텍스트의 글리프가 SVG 경계에 걸리지 않도록 하단 40px 이상 확보
const dimensionBottom=Y+H+(mode==='B'?54:42);
svg.setAttribute('viewBox',`0 0 420 ${Math.max(390,dimensionBottom+42)}`);
const defs=shape('defs'),pat=shape('pattern',{id:'joint-hatch',width:8,height:8,patternUnits:'userSpaceOnUse'},defs);
shape('rect',{width:8,height:8,fill:'#fee2e2'},pat);shape('path',{d:'M0 8 L8 0 M0 0 L8 8',stroke:'#dc2626','stroke-width':0.5},pat);
const clip=shape('clipPath',{id:'joint-clip'},defs);shape('rect',{x:X,y:Y,width:W,height:H},clip);
shape('text',{x:210,y:20,'text-anchor':'middle','font-size':13,'font-weight':700,fill:'#2563eb'},svg,`대각선 총길이 ${fmt(r.total)} mm`);
const subtitle=mode==='C'?`촉 ${fmt(r.tooth)}mm × ${r.n} / 간격 ${fmt(r.gap)}mm × ${r.n-1}`:mode==='B'?`${fmt(r.step)}mm × ${r.n}등분 · 좌우 촉 제외`:`${fmt(r.step)}mm × ${r.n}등분`;
shape('text',{x:210,y:39,'text-anchor':'middle','font-size':10,fill:'#2563eb'},svg,subtitle);
shape('rect',{x:X,y:Y,width:W,height:H,fill:'#fb923c','fill-opacity':.13});
const fillGroup=shape('g',{'clip-path':'url(#joint-clip)'});
r.segments.forEach((s,i)=>{if(s.kind!=='cut'&&s.kind!=='edge')return;const a=borders[i],b=borders[i+1];shape('polygon',{points:`${a.top},${Y} ${b.top},${Y} ${b.bottom},${Y+H} ${a.bottom},${Y+H}`,fill:s.kind==='edge'?'#16a34a':'url(#joint-hatch)','fill-opacity':s.kind==='edge'?.43:1},fillGroup);});
borders.slice(1,-1).forEach((p,i)=>{const endEdge=r.ends&&(i===0||i===borders.length-3);shape('line',{x1:p.top,y1:Y,x2:p.bottom,y2:Y+H,stroke:endEdge&&!slopeEnds?'#16a34a':'#9333ea','stroke-width':2.2},fillGroup);});
shape('rect',{x:X,y:Y,width:W,height:H,fill:'none',stroke:'#ea580c','stroke-width':2.4});
shape('line',{x1:X,y1:mid,x2:X+W,y2:mid,stroke:'#64748b','stroke-dasharray':'5 4'});
shape('line',{x1:lineX,y1:Y,x2:lineX+lineW,y2:Y-rise,stroke:'#2563eb','stroke-width':2.6});
r.marks.forEach(v=>{shape('line',{x1:xd(v),y1:Y-rise*v/r.total,x2:xd(v),y2:Y,stroke:'#0d9488','stroke-dasharray':'3 3'});shape('circle',{cx:xd(v),cy:Y-rise*v/r.total,r:2.8,fill:'#2563eb'});});
if(r.marks.length<=17){if(view==='each')r.marks.slice(0,-1).forEach((v,i)=>{const next=r.marks[i+1],z=(v+next)/2;shape('text',{x:xd(z),y:Y-rise*z/r.total-12,fill:'#2563eb','font-size':10,'font-weight':650,'text-anchor':'middle'},svg,fmt(next-v));});else r.marks.slice(1).forEach(v=>shape('text',{x:xd(v),y:Y-rise*v/r.total-12,fill:'#2563eb','font-size':10,'font-weight':650,'text-anchor':'middle'},svg,fmt(v)));}
if(r.segments.length<=13)r.segments.forEach((s,i)=>shape('text',{x:xp((r.cumulative[i]+r.cumulative[i+1])/2),y:mid+4,'font-size':10,'font-weight':700,'text-anchor':'middle',fill:s.kind==='cut'?'#b91c1c':s.kind==='edge'?'#15803d':'#1d4ed8'},svg,i+1));
// B형: 초록색 좌우 촉의 실제 가로 길이는 각 영역 바로 아래에 초록색으로 표시한다.
if(mode==='B'&&r.ends){[r.edge/2,r.m-r.edge/2].forEach(x=>shape('text',{x:xp(x),y:Y+H+15,fill:'#16a34a','font-size':11,'font-weight':700,'text-anchor':'middle'},svg,fmt(r.edge)));}
borders.slice(1,-1).forEach(p=>{if(Math.abs(p.direction)<1e-9)return;const x=p.direction>0?p.x+9:p.x-9;shape('text',{x:Math.max(14,Math.min(406,x)),y:mid-12,fill:'#9333ea','font-size':11,'font-weight':700,'text-anchor':p.direction>0?'start':'end'},svg,`${fmt(r.angle)}°`);});
shape('line',{x1:X-12,y1:Y,x2:X-12,y2:Y+H,stroke:'#ea580c'});
shape('text',{x:X-17,y:mid+4,fill:'#ea580c','font-size':10,'text-anchor':'end'},svg,fmt(r.h));
shape('line',{x1:X,y1:Y+H+(mode==='B'?32:20),x2:X+W,y2:Y+H+(mode==='B'?32:20),stroke:'#ea580c'});
shape('line',{x1:X,y1:Y+H+(mode==='B'?27:15),x2:X,y2:Y+H+(mode==='B'?37:25),stroke:'#ea580c'});
shape('line',{x1:X+W,y1:Y+H+(mode==='B'?27:15),x2:X+W,y2:Y+H+(mode==='B'?37:25),stroke:'#ea580c'});
shape('text',{x:210,y:Y+H+(mode==='B'?54:42),fill:'#ea580c','font-size':12,'font-weight':700,'text-anchor':'middle'},svg,`부재 가로 ${fmt(r.m)} mm`);
}
function detail(label,value,color){return `<div class="detail"><span>${label}</span><strong style="color:${color}">${fmt(value)} mm</strong></div>`;}
function render(){
const endsSelected=mode==='B'||mode==='A'&&checked('a-ends');
const edge=endsSelected?val(mode==='A'?'a-edge':'b-edge'):0;
const ends=endsSelected&&Number.isFinite(edge)&&edge>0;
for(const t of ['A','B','C']){document.querySelector(`[data-mode="${t}"]`).setAttribute('aria-selected',String(mode===t));$(t.toLowerCase()+'-panel').classList.toggle('hidden',mode!==t);}
$('type-title').textContent=mode==='A'?'A형 · 균등 분할':mode==='B'?'B형 · 좌우 촉 구분':'C형 · 촉 고정 / 간격 자동';
$('a-edge-wrap').classList.toggle('hidden',!checked('a-ends'));
$('edge-slope').disabled=!ends;
$('edge-slope-wrap').classList.toggle('unavailable',!ends);
$('edge-slope-wrap').title=ends?'':'좌/우 촉이 없는 유형에서는 적용되지 않습니다.';
$('drawing-status').textContent=`${mode}형 · ${checked('reverse')?'반전':'기본'} 방향`;
document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
$('drawing').closest('.workspace-preview').classList.toggle('hidden',previewDismissed);
$('drawing').closest('.workspace').classList.toggle('preview-dismissed',previewDismissed);
document.querySelector('.show-preview')?.toggleAttribute('hidden',!previewDismissed);
if(previewDismissed)return;
const r=compute();if(r.error){$('result').innerHTML=`<div class="error">${r.error}</div>`;$('drawing').replaceChildren();return;}
let html=`<div class="metrics"><div class="metric"><small>대각선 총길이</small><strong>${fmt(r.total)} mm</strong></div><div class="metric"><small>${mode==='C'?'대각선 촉 길이':'대각선 균등 분할'}</small><strong>${fmt(mode==='C'?r.tooth:r.step)} mm</strong></div></div>`;
if(endsSelected){html+=detail('좌우 촉 가로 길이 (각각)',r.edge,'#16a34a');}
if(mode==='B'){html+=detail('중앙 가로 길이 (좌우 촉 제외)',r.m-2*r.edge,'#ea580c');}
if(mode==='C'){html+=detail('가로 촉 사이 간격 (자동)',(r.m-r.n*val('ct'))/(r.n-1),'#dc2626');html+=detail('대각선 촉 사이 간격',r.gap,'#2563eb');html+=detail('남는 여백',0,'#ea580c');}
$('result').innerHTML=html;draw(r);
}
document.querySelectorAll('input').forEach(el=>{el.addEventListener('input',()=>{previewDismissed=false;render()});el.addEventListener('change',()=>{previewDismissed=false;render()})});
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;previewDismissed=false;render()}));
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;previewDismissed=false;render()}));
$('reset').addEventListener('click',()=>{for(const [id,v] of Object.entries(defaults)){const el=$(id);if(el.type==='checkbox')el.checked=v;else el.value=v;}mode='A';view='each';previewDismissed=true;render();document.querySelector('.show-preview')?.removeAttribute('hidden');openInputMenu();});
setupMobilePanels();
render();
})();
