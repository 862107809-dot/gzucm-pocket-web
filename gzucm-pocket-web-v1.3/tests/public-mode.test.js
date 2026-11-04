'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const net=require('node:net');
const {spawn}=require('node:child_process');
const path=require('node:path');
const findPort=()=>new Promise(resolve=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port));});});
function req(port,p,headers={},method='GET'){
 return new Promise((resolve,reject)=>{const r=http.request({host:'127.0.0.1',port,path:p,method,headers},res=>{let str='';res.on('data',d=>str+=d);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:str}));});r.on('error',reject);r.end();});
}
test('公开模式：HTTPS 代理必需、独立 Secure 会话、跨站 POST 拒绝',async()=>{
 const port=await findPort();
 const p=spawn(process.execPath,['server/server.js'],{cwd:path.join(__dirname,'..'),env:{...process.env,HOST:'127.0.0.1',PORT:String(port),PUBLIC_MODE:'1'},stdio:['ignore','pipe','pipe']});
 try{
  await new Promise((resolve,reject)=>{let n=0;const t=setInterval(async()=>{if(p.exitCode!==null){clearInterval(t);reject(Error('服务端退出'));return;}try{const r=await req(port,'/health');if(r.status===200){clearInterval(t);resolve();}}catch{}if(++n>60){clearInterval(t);reject(Error('启动超时'));}},60);});
  const health=await req(port,'/health');assert.equal(health.status,200);
  const noTLS=await req(port,'/');assert.equal(noTLS.status,426);
  const h={'x-forwarded-proto':'https'};
  const config=await req(port,'/deployment-config.js',h);assert.match(config.body,/GZUCM_PUBLIC=true/);
  const one=await req(port,'/api/session',h),two=await req(port,'/api/session',h);
  assert.equal(one.status,200);assert.equal(two.status,200);
  assert.match(one.headers['set-cookie'][0],/__Host-gzsid=/);
  assert.match(one.headers['set-cookie'][0],/Secure/);
  assert.notEqual(one.headers['set-cookie'][0],two.headers['set-cookie'][0]);
  const cookie=one.headers['set-cookie'][0].split(';')[0];
  const repeat=await req(port,'/api/session',{...h,Cookie:cookie});assert.equal(repeat.headers['set-cookie'],undefined);
  const blocked=await req(port,'/api/logout',{...h,Cookie:cookie,Origin:'https://other.example', 'Content-Type':'application/json'},'POST');assert.equal(blocked.status,403);
  const noOrigin=await req(port,'/api/logout',{...h,Cookie:cookie,'Content-Type':'application/json'},'POST');assert.equal(noOrigin.status,403);
  const own=await req(port,'/api/logout',{...h,Cookie:cookie,Origin:`https://127.0.0.1:${port}`,'Content-Type':'application/json'},'POST');assert.equal(own.status,200);
  const ownSession=JSON.parse((await req(port,'/api/session',{...h,Cookie:two.headers['set-cookie'][0].split(';')[0]})).body);assert.equal(ownSession.connected,false);
  const privacy=await req(port,'/privacy.html',h);assert.equal(privacy.status,200);
 }finally{p.kill('SIGTERM');}
});
