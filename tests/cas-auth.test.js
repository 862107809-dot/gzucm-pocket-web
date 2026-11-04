'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const CAS=require('../server/cas');
test('CAS is disabled without explicit university approval and registered callback',()=>{
 assert.equal(CAS.configuration({}).enabled,false);
 assert.equal(CAS.configuration({CAS_SSO_APPROVED:'1'}).enabled,false);
 assert.equal(CAS.configuration({CAS_REGISTERED_CALLBACK_URL:'https://gzucm-pocket-web.onrender.com/auth/cas/callback'}).enabled,false);
});
test('CAS only enables for an explicitly approved, exact HTTPS callback',()=>{
 const env={CAS_SSO_APPROVED:'1',CAS_REGISTERED_CALLBACK_URL:'https://gzucm-pocket-web.onrender.com/auth/cas/callback'};
 assert.equal(CAS.configuration(env).enabled,true);
 for(const bad of ['http://gzucm-pocket-web.onrender.com/auth/cas/callback',
 'https://gzucm-pocket-web.onrender.com/other',
 'https://gzucm-pocket-web.onrender.com/auth/cas/callback?next=evil',
 'https://gzucm-pocket-web.onrender.com:8443/auth/cas/callback']){
  assert.equal(CAS.configuration({...env,CAS_REGISTERED_CALLBACK_URL:bad}).enabled,false);
 }
});
test('CAS login URL binds the service to the configured callback',()=>{
 const service='https://gzucm-pocket-web.onrender.com/auth/cas/callback';
 const u=new URL(CAS.loginUrl(service));
 assert.equal(u.hostname,'authserver.gzucm.edu.cn');
 assert.equal(u.pathname,'/authserver/login');
 assert.equal(u.searchParams.get('service'),service);
});
test('CAS validates ticket format before outbound requests',()=>{
 assert.equal(CAS.ticketValidFormat('ST-1234567890123456-abcdef'),true);
 assert.equal(CAS.ticketValidFormat(''),false);
 assert.equal(CAS.ticketValidFormat('evil.example'),false);
 assert.equal(CAS.ticketValidFormat('ST-x'),false);
});
test('CAS proof requires CAS authentication success, not arbitrary HTML or failure',()=>{
 assert.equal(CAS.casSuccessXML('<cas:serviceResponse xmlns:cas="http://www.yale.edu/tp/cas"><cas:authenticationSuccess><cas:user>anon</cas:user></cas:authenticationSuccess></cas:serviceResponse>'),true);
 assert.equal(CAS.casSuccessXML('<cas:serviceResponse><cas:authenticationFailure code="INVALID_TICKET">bad</cas:authenticationFailure></cas:serviceResponse>'),false);
 assert.equal(CAS.casSuccessXML('<html>school login</html>'),false);
 assert.equal(CAS.casSuccessXML('<!DOCTYPE foo><cas:serviceResponse><cas:authenticationSuccess></cas:authenticationSuccess></cas:serviceResponse>'),false);
});
test('CAS completion is treated only as identity verification, not a school session',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const s=fs.readFileSync(path.join(__dirname,'..','server','server.js'),'utf8');
 assert.match(s,/pending\.session\.casVerified=true/);
 assert.doesNotMatch(s,/pending\.session\.client\.connected=true/);
 assert.match(s,/casAvailable:CAS_CONFIG\.enabled/);
 assert.match(s,/connected:s\.client\.connected/);
});
