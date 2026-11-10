import { createContourField, normalizeOptions, DEFAULT_OPTIONS } from './contour-field.mjs';
import { addPNGProject, readPNGProject, addSVGProject, readSVGProject } from './project-format.mjs';
import { photoFromFile } from './photo-field.mjs';

const $ = id => document.getElementById(id), svgNS = 'http://www.w3.org/2000/svg';
const palettes = { dark: { background: '#111416', color: '#b8bdbb' }, light: { background: '#f4f2ed', color: '#434b50' } };
const exportSizes = { '1536x2048': [1536, 2048], '3072x4096': [3072, 4096] };
let theme = 'dark', preset = 'art', editMode = 'none', dragging = null, timerDragging = false;
const field = createContourField({ canvas: $('art') });
const formatTime = t => Math.floor(t / 60).toString().padStart(2, '0') + ':' + (t % 60).toFixed(1).padStart(4, '0');
const message = text => { $('message').textContent = text; };
function slider(id, value, label) { $(id).value = value; $(id + '-out').value = label ?? String(value); }
function drawOverlay() {
  const o = field.getOptions(), overlay = $('edit-overlay'); overlay.replaceChildren(); overlay.classList.toggle('active', editMode !== 'none');
  const handles = editMode === 'none' ? [] : o.field.controls;
  handles.forEach((p,i) => {
    const circle = document.createElementNS(svgNS, 'circle');
    for (const [k,v] of Object.entries({ cx:p[0]*1000, cy:p[1]*1333, r:13, fill:p[3] >= 0 ? '#b9701a' : '#227a78', stroke:'#fff', 'stroke-width':2 })) circle.setAttribute(k,v);
    circle.dataset.kind = 'control'; circle.dataset.index = i; overlay.append(circle);
  });
}
function syncControls() {
  const o = field.getOptions(), f = o.field, s = o.style, light = s.light;
  for (const [id, value, label] of [
    ['scale', f.scale[0], f.scale[0].toFixed(1)], ['bands', f.bands], ['warp', f.warp], ['octaves', f.octaves],
    ['line-width', s.lineWidth, s.lineWidth.toFixed(2)+' px'], ['alpha',s.alpha,Math.round(s.alpha*100)+'%'],
    ['edge',s.edgeFade,Math.round(s.edgeFade*100)+'%'], ['speed',f.speed,f.speed.toFixed(3)],
    ['softness',s.softness], ['fade-inner',s.fade[0]], ['fade-outer',s.fade[1]],
    ['photo-contrast',f.photoContrast,f.photoContrast.toFixed(2)], ['light-speed',light.speed,light.speed.toFixed(2)],
    ['light-angle',light.angle,Math.round(light.angle)+'°'], ['light-width',light.width,Math.round(light.width*100)+'%'],
    ['light-intensity',light.intensity,light.intensity.toFixed(2)],
  ]) slider(id,value,label);
  $('seed').value=f.seed; $('line-color').value=s.color; $('dashed').checked=s.dashed; $('photo-invert').checked=f.photoInvert;
  $('light-enabled').checked=light.enabled; $('light-color').value=light.color;
  $('photo-tools').hidden=!(f.source==='photo' && f.photo); $('source-procedural').setAttribute('aria-pressed',f.source==='procedural');
  $('seed-caption').textContent=(f.source==='photo'?'PHOTO / ':'SEED ')+String(f.seed).padStart(6,'0');
  $('theme-dark').setAttribute('aria-pressed',theme==='dark'); $('theme-light').setAttribute('aria-pressed',theme==='light');
  $('theme-name').textContent=theme==='dark'?'墨黑':'纸白'; $('preset-art').setAttribute('aria-pressed',preset==='art');
  $('preset-quiet').setAttribute('aria-pressed',preset==='quiet');
  for(const mode of ['hill','valley','none']) $('edit-'+mode).setAttribute('aria-pressed',editMode===mode);
  drawOverlay();
}
function update(patch){ field.setOptions(patch); syncControls(); }
function setTheme(next){ theme=next; update({style:palettes[theme]}); }
function applyPreset(next){ preset=next; update(next==='quiet'
  ? {field:{scale:[2.8,3.7333],bands:34,warp:1.1,octaves:3},style:{alpha:.12,lineWidth:.8,edgeFade:.16,light:{enabled:false}}}
  : {field:{scale:[...DEFAULT_OPTIONS.field.scale],bands:48,warp:1.35,octaves:3},style:{...DEFAULT_OPTIONS.style,...palettes[theme],light:{...DEFAULT_OPTIONS.style.light}}}); }
function setEditMode(mode){ editMode=mode; syncControls(); message(mode==='none'?'已结束画面编辑。':'点击画面添加地形控制点，拖动圆点可调位置。'); }
for(const [id,key,group] of [['bands','bands','field'],['warp','warp','field'],['octaves','octaves','field'],['line-width','lineWidth','style'],['alpha','alpha','style'],['edge','edgeFade','style'],['speed','speed','field'],['softness','softness','style'],['photo-contrast','photoContrast','field']])
  $(id).addEventListener('input',e=>update({[group]:{[key]:Number(e.target.value)}}));
for(const [id,key] of [['light-speed','speed'],['light-width','width'],['light-intensity','intensity'],['light-angle','angle']])
  $(id).addEventListener('input',e=>update({style:{light:{[key]:Number(e.target.value)}}}));
for(const [id,index] of [['fade-inner',0],['fade-outer',1]]) $(id).addEventListener('input',e=>{const fade=field.getOptions().style.fade;fade[index]=Number(e.target.value);update({style:{fade}});});
for(const id of ['brush-radius','brush-strength']) $(id).addEventListener('input',()=>{
  slider('brush-radius',$('brush-radius').value,Math.round(Number($('brush-radius').value)*100)+'%');
  slider('brush-strength',$('brush-strength').value,Number($('brush-strength').value).toFixed(2));
});
$('scale').addEventListener('input',e=>{const scale=Number(e.target.value);update({field:{scale:[scale,scale*4/3]}});});
$('seed').addEventListener('change',e=>update({field:{seed:Number(e.target.value)}}));
$('shuffle').addEventListener('click',()=>{const random=new Uint32Array(1);crypto.getRandomValues(random);update({field:{seed:random[0]%1000000}});message('新地形已生成；导出的图片会记录完整参数。');});
$('line-color').addEventListener('input',e=>update({style:{color:e.target.value}}));
$('dashed').addEventListener('change',e=>update({style:{dashed:e.target.checked}}));
$('theme-dark').addEventListener('click',()=>setTheme('dark'));$('theme-light').addEventListener('click',()=>setTheme('light'));
$('preset-art').addEventListener('click',()=>applyPreset('art'));$('preset-quiet').addEventListener('click',()=>applyPreset('quiet'));
$('source-procedural').addEventListener('click',()=>{update({field:{source:'procedural'}});field.renderAt(field.getState().time);message('已切换回程序地形；照片数据暂存在工程中。');});
$('import-photo').addEventListener('click',()=>$('photo-file').click());
$('photo-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;
  try{message('正在读取照片明暗…');const photo=await photoFromFile(file);update({field:{photo,source:'photo',bands:28,speed:0,photoContrast:1,photoInvert:false}});field.renderAt(0);refreshPlayback();message('已生成照片明暗等值线；可继续雕刻。');}
  catch(error){message('照片导入失败：'+error.message);}finally{e.target.value='';}});
$('photo-invert').addEventListener('change',e=>update({field:{photoInvert:e.target.checked}}));
for(const mode of ['hill','valley','none']) $('edit-'+mode).addEventListener('click',()=>setEditMode(mode));
$('undo-control').addEventListener('click',()=>{const edits=field.getOptions().field.controls;edits.pop();update({field:{controls:edits}});});
$('clear-controls').addEventListener('click',()=>update({field:{controls:[]}}));
$('light-enabled').addEventListener('change',e=>update({style:{light:{enabled:e.target.checked}}}));
$('light-color').addEventListener('input',e=>update({style:{light:{color:e.target.value}}}));
const position=e=>{const r=$('edit-overlay').getBoundingClientRect();return [Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))];};
$('edit-overlay').addEventListener('pointerdown',e=>{if(editMode==='none')return;const kind=e.target.dataset.kind,index=Number(e.target.dataset.index),p=position(e);
  if(kind==='control')dragging={kind,index};
  else{const edits=field.getOptions().field.controls;if(edits.length>=12){message('雕刻最多 12 点。');return;}edits.push([p[0],p[1],Number($('brush-radius').value),Number($('brush-strength').value)*(editMode==='valley'?-1:1)]);update({field:{controls:edits}});dragging={kind:'control',index:edits.length-1};}
  $('edit-overlay').setPointerCapture(e.pointerId);e.preventDefault();});
// Pointer events can fire several times per frame; apply only the latest position once per frame.
let pendingDrag=null,dragFrame=0;
function applyDrag(){dragFrame=0;if(!dragging||!pendingDrag)return;const p=pendingDrag;pendingDrag=null;
  const edits=field.getOptions().field.controls;if(!edits[dragging.index])return;edits[dragging.index][0]=p[0];edits[dragging.index][1]=p[1];update({field:{controls:edits}});}
$('edit-overlay').addEventListener('pointermove',e=>{if(!dragging)return;pendingDrag=position(e);if(!dragFrame)dragFrame=requestAnimationFrame(applyDrag);});
for(const type of ['pointerup','pointercancel','lostpointercapture'])$('edit-overlay').addEventListener(type,()=>{if(dragFrame){cancelAnimationFrame(dragFrame);applyDrag();}dragging=null;});
$('reset').addEventListener('click',()=>{theme='dark';preset='art';editMode='none';field.setOptions({...DEFAULT_OPTIONS,field:{...DEFAULT_OPTIONS.field,photo:null,controls:[]}});field.renderAt(0);syncControls();refreshPlayback();message('已恢复最初地形，默认静止。');});
$('play').addEventListener('click',()=>{if(field.getState().requestedRunning)field.stop();else{field.setOptions({motion:true});field.start();}refreshPlayback();});
$('timeline').addEventListener('input',e=>{timerDragging=true;field.renderAt(Number(e.target.value));refreshPlayback();});
$('timeline').addEventListener('change',()=>{timerDragging=false;});
function refreshPlayback(){if(document.hidden)return;const state=field.getState();$('motion-status').textContent=state.backend==='svg'?'静态降级':state.reducedMotion?'系统已减少动态':state.running?'连续变形':'动态已暂停';
  $('play').setAttribute('aria-label',state.requestedRunning?'暂停动态':'播放动态');$('play-icon').textContent=state.requestedRunning?'Ⅱ':'▷';$('time-label').value=formatTime(state.time);if(!timerDragging)$('timeline').value=Math.min(180,state.time);}
const playbackTimer=setInterval(refreshPlayback,200);
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function selectedSize(){return exportSizes[$('export-size').value] || exportSizes['3072x4096'];}
function filename(extension){const suffix=extension==='json'?'':'-'+selectedSize().join('x');return 'contour-'+theme+'-seed'+field.getOptions().field.seed+'-t'+field.getState().time.toFixed(1).replace('.','_')+suffix+'.'+extension;}
function project(){const [width,height]=selectedSize();return {version:2,theme,preset,time:field.getState().time,transparent:$('transparent').checked,output:{width,height},options:field.getOptions()};}
function restore(data){if(![1,2].includes(data?.version)||!data.options||typeof data.options!=='object')throw new Error('这不是工坊导出的工程');
  theme=data.theme==='light'?'light':'dark';preset=data.preset==='quiet'?'quiet':'art';editMode='none';const options=normalizeOptions(data.options,DEFAULT_OPTIONS);options.motion=false;
  const sizeKey=data.output?.width+'x'+data.output?.height;$('export-size').value=exportSizes[sizeKey]?sizeKey:'3072x4096';
  $('transparent').checked=!!data.transparent;field.setOptions(options);field.renderAt(Number(data.time)||0);syncControls();refreshPlayback();}
$('export-png').addEventListener('click',async()=>{const button=$('export-png');button.disabled=true;const [width,height]=selectedSize();message('正在原生渲染 '+width+' × '+height+' PNG…');
  try{const snapshot=project(),raw=await field.exportPNG({width,height,time:snapshot.time,transparent:$('transparent').checked});download(await addPNGProject(raw,snapshot),filename('png'));message(width+' × '+height+' PNG 已导出，图片可回读参数。');}
  catch(error){message('导出未完成：'+error.message);}finally{button.disabled=false;}});
$('export-svg').addEventListener('click',()=>{try{const [width,height]=selectedSize();const svg=addSVGProject(field.exportSVG({width,height,transparent:$('transparent').checked}),project());download(new Blob([svg],{type:'image/svg+xml'}),filename('svg'));message('SVG 已导出并内嵌参数；轮廓是矢量近似。');}catch(error){message('SVG 导出未完成：'+error.message);}});
$('save-settings').addEventListener('click',()=>{download(new Blob([JSON.stringify(project(),null,2)],{type:'application/json'}),filename('json'));message('完整工程参数已保存。');});
$('load-settings').addEventListener('click',()=>$('settings-file').click());
$('settings-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>25*1024*1024)throw new Error('工程文件过大');
  const data=file.name.toLowerCase().endsWith('.png')?await readPNGProject(file):file.name.toLowerCase().endsWith('.svg')?readSVGProject(await file.text()):JSON.parse(await file.text());
  restore(data);message('已恢复参数、雕刻和轮廓光；画面默认静止。');}catch(error){message('无法读取：'+error.message);}finally{e.target.value='';}});
window.addEventListener('pagehide',()=>{field.stop();clearInterval(playbackTimer);});window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
window.contourStudio={field,setTheme,applyPreset,project,restore};syncControls();refreshPlayback();document.documentElement.dataset.ready='true';
