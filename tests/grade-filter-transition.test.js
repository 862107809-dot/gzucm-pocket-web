'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const start=app.indexOf('function renderGradesContent(){');
const end=app.indexOf('/* Week/month switches are DOM-local:',start);
assert.ok(start>=0&&end>start,'local grade renderer exists');
test('grade filter redraws only inner grade page, retaining Dock and sidebar',()=>{
 const calls=[],state={view:'grades',prefs:{language:'zh'}},page={};
 const fn=new Function('$','state','render','snapshotLiquidSelectors','gradesPage','enhanceLiquidSelectors','window','restoreSurfaceBounce',
 app.slice(start,end)+'return renderGradesContent;')(
 ()=>page,state,()=>calls.push('full-render'),
 ()=>{calls.push('snapshot');return new Map([['grade-type',{}]])},
 ()=>'<section>updated grade</section>',
 (_,prior)=>{assert.equal(prior.has('grade-type'),true);calls.push('enhance')},
 {GZUCM_I18N:{apply:()=>calls.push('translate')}},
 ()=>calls.push('restore'));
 fn();
 assert.equal(page.innerHTML,'<section>updated grade</section>');
 assert.deepEqual(calls,['snapshot','enhance','translate','restore']);
});
test('grade and credit changes skip full render and skip reselecting the same mode',()=>{
 assert.match(app,/if\(state\.gradeTab!==target\.dataset\.gradeTab\)\{state\.gradeTab=target\.dataset\.gradeTab;renderGradesContent\(\);\}/);
 assert.match(app,/if\(state\.creditMode!==target\.dataset\.credit\)\{state\.creditMode=target\.dataset\.credit;renderGradesContent\(\);\}/);
});
