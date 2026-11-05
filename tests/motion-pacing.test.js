'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const css=fs.readFileSync(path.join(__dirname,'..','styles.css'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');

function durationFor(selector,property){
 const escape=s=>s.replace(/[.*+?^$\{\}()|[\]\\]/g,'\\$&');
 // Match one authored declaration, not a full stylesheet parser.
 const re=new RegExp(escape(selector)+'\\s*\\{[^}]*'+property+'\\s*:\\s*[^;]*?\\.([0-9]+)s','m');
 const hit=css.match(re);
 assert.ok(hit,selector+' '+property+' is not defined');
 return Number('0.'+hit[1])*1000;
}
function animationDuration(selector){
 return durationFor(selector,'animation');
}
test('full-surface press is instant while visible release lasts over half a second',()=>{
 assert.ok(animationDuration('#app .pocket-full-press')>=300);
 assert.ok(animationDuration('#app .pocket-full-release')>=500);
 assert.ok(animationDuration('#app .pocket-full-card.pocket-full-release')>=500);
 assert.match(css,/@keyframes pocketFullSurfacePress\{\s*0%\{scale:1\.065;/);
});
test('entire centered Dock and horizontal selectors use calm springs',()=>{
 assert.ok(animationDuration('.bottom-nav.is-dock-releasing')>=480);
 assert.ok(animationDuration('.bottom-nav.is-dock-settling')>=500);
 assert.ok(animationDuration(':is(.segmented,.schedule-view-switch).liquid-selector.is-horizontal-rail.is-rail-releasing')>=500);
 assert.ok(animationDuration(':is(.segmented,.schedule-view-switch).liquid-selector.is-horizontal-rail.is-rail-settling')>=550);
 assert.match(css,/\.bottom-nav\{\s*scale:1;\s*transform-origin:center center/);
 assert.match(css,/\.liquid-selector\.is-horizontal-rail\{[^}]*transform-origin:center center/s);
});
test('page, popover, and dialog are animated long enough to see their transitions',()=>{
 assert.ok(animationDuration('.page.page-enter')>=580);
 assert.ok(animationDuration('.safari-floating-menu')>=450);
 assert.ok(animationDuration('.safari-floating-menu.is-closing')>=400);
 assert.ok(animationDuration('.modal-card.liquid-dialog-opening')>=550);
 assert.ok(animationDuration('.modal-card.liquid-dialog-closing')>=450);
 assert.match(app,/liquidDialogFrames\(rect,origin,false,580\)/);
 assert.match(app,/liquidDialogFrames\(rect,origin,true,460\)/);
});
test('switch thumb has a spring after touch, but dragging remains immediate',()=>{
 assert.match(css,/\.switch\[role="switch"\]::after\{[^}]*transform \.56s/s);
 assert.match(css,/\.switch\[role="switch"\]\.is-dragging::after\{\s*transition:width/);
 assert.match(app,/p\.button\.style\?\.setProperty\?\.\('--switch-thumb-x'/);
 assert.match(css,/\.liquid-selector > \.liquid-choice-highlight\.is-dragging\{\s*transition:none!important;/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
