const $ = (selector) => document.querySelector(selector);
let snapshot = null, busy = false;
const number = (value) => value == null ? '无记录' : Number(value).toLocaleString('zh-CN');
const names = {site:'首页',matplotlib:'Matplotlib',ggplot2:'ggplot2',plotly:'Plotly',pyecharts:'pyecharts',charts:'Charts 入口'};
function loginView(show) { $('[data-login]').hidden = !show; $('[data-dashboard]').hidden = show; $('[data-logout]').hidden = show; }
function error(message='') { $('[data-error]').textContent=message; $('[data-error]').hidden=!message; }
async function api(path, body) {
  const response = await fetch('/admin/api/'+path, {credentials:'same-origin',cache:'no-store', ...(body ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)} : {})});
  if (response.status===401) { loginView(true); snapshot=null; throw new Error(path==='login' ? '用户名或密码不正确。' : '请登录后查看统计。'); }
  if (response.status===429) throw new Error('尝试过于频繁，请 15 分钟后重试。');
  if (!response.ok) throw new Error('暂时无法获取数据，请稍后重试。');
  return response.json();
}
function rows(selector, values) { $(selector).replaceChildren(...values.map(cells=>{const tr=document.createElement('tr');for(const value of cells){const td=document.createElement('td');td.textContent=value;tr.append(td)}return tr})); }
function chart() {
  if (!snapshot || $('[data-dashboard]').hidden) return;
  const canvas=$('[data-chart]'), ratio=devicePixelRatio || 1, w=canvas.clientWidth, h=240;
  canvas.width=w*ratio;canvas.height=h*ratio;
  const ctx=canvas.getContext('2d');ctx.scale(ratio,ratio);ctx.clearRect(0,0,w,h);
  const points=snapshot.series,max=Math.max(1,...points.flatMap(p=>[p.views,p.users])), pad=35, plot=w-pad*2;
  ctx.font='11px system-ui';ctx.fillStyle='#a7adb5';ctx.strokeStyle='#30343a';
  for(let step=0;step<4;step++){const y=20+step*55;ctx.beginPath();ctx.moveTo(pad,y);ctx.lineTo(w-pad,y);ctx.stroke();ctx.fillText(number(Math.round(max*(3-step)/3)),0,y+4)}
  for(const [field,color] of [['views','#9ac4ff'],['users','#99ddb9']]){ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();let connected=false;points.forEach((point,index)=>{if(point[field]==null){connected=false;return}const x=pad+index/(points.length-1)*plot,y=185-point[field]/max*165;connected?ctx.lineTo(x,y):ctx.moveTo(x,y);connected=true});ctx.stroke()}
  ctx.fillStyle='#a7adb5';ctx.fillText(points[0].day.slice(5),pad,222);ctx.textAlign='right';ctx.fillText(points.at(-1).day.slice(5),w-pad,222);
}
function render(data) {
  snapshot=data;loginView(false);
  for(const [selector,value] of [['all-users',data.all.users],['today-users',data.today.users],['all-views',data.all.views],['all-exports',data.all.exports]]) $(`[data-metric="${selector}"]`).textContent=number(value);
  $('[data-period]').textContent=`最近 ${data.days} 天：${number(data.period.views)} 次网页访问 · ${number(data.period.users)} 个成功绘图浏览器 · ${number(data.period.renders)} 次绘图 · ${number(data.period.exports)} 次导出`;
  rows('[data-engines]',data.engines.map(p=>[names[p.engine] || p.engine,...['views','users','renders','exports'].map(k=>number(p[k]))]));
  rows('[data-series]',[...data.series].reverse().map(p=>[p.day,...['views','users','renders','exports'].map(k=>number(p[k]))]));
  $('[data-empty]').hidden=Boolean(data.all.renders);
  $('[data-coverage]').textContent=`缺少页面日志的日期显示「无记录」，CSV 留空。历史访问日志从 ${data.traffic_start || '暂无数据'} 开始；最后同步：${data.metadata.traffic_refreshed || '尚未同步'}。使用事件从 ${data.usage_start || '上线后首次有人同意统计'} 开始。统计时区：北京时间。${data.telemetry_enabled ? '' : '匿名使用统计已被服务器硬开关关闭。'}`;
  chart();
}
async function refresh() {if(busy)return;busy=true;error();$('[data-loading]').hidden=false;try{render(await api('summary?days='+$('[data-days]').value))}catch(e){error(e.message)}finally{busy=false;$('[data-loading]').hidden=true}}
$('[data-login-form]').addEventListener('submit',async(e)=>{e.preventDefault();error();const button=$('[data-login-submit]');button.disabled=true;try{await api('login',{username:$('[data-username]').value,password:$('[data-password]').value});$('[data-password]').value='';await refresh()}catch(e){error(e.message)}finally{button.disabled=false}});
$('[data-logout]').addEventListener('click',async()=>{try{await api('logout',{});snapshot=null;loginView(true);error()}catch(e){error(e.message)}});
$('[data-refresh]').addEventListener('click',refresh);$('[data-days]').addEventListener('change',refresh);
$('[data-csv]').addEventListener('click',()=>{if(!snapshot)return;const csv='\uFEFF日期,网页访问次数,成功绘图浏览器,绘图次数,成功导出次数\n'+snapshot.series.map(p=>[p.day,p.views,p.users,p.renders,p.exports].join(',')).join('\n');const a=document.createElement('a'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.href=url;a.download='usage-'+snapshot.series.at(-1).day+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
addEventListener('resize',chart);refresh();
