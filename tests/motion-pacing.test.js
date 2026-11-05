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
test('ordinary button and card taps use only shadow/brightness with no rebound',()=>{
 const final=css.slice(css.indexOf('/* NO-BOUNCE CLICK FEEDBACK v1'));
 assert.ok(final.length>1000);
 assert.match(final,/#app \.pocket-full-press,[\s\S]*?animation:none!important;\s*scale:1!important;\s*transform:none!important;/);
 assert.match(final,/#app \.pocket-full-release,[\s\S]*?animation:none!important;/);
 assert.match(final,/#app \.pocket-full-card\.pocket-full-release/);
 assert.match(final,/transition:filter \.16s ease-out,box-shadow \.18s ease-out/);
 assert.match(final,/\.bottom-item:not\(\.is-scrubbed\):is\(:active,\.is-pressed\)/);
 assert.match(final,/\.bottom-item\.is-landing\{/);
 assert.match(final,/animation:none!important;/);
});
test('Dock and segmented click travel is monotone, while swipe and switch retain motion',()=>{
 const final=css.slice(css.indexOf('/* NO-BOUNCE CLICK FEEDBACK v1'));
 assert.match(final,/\.bottom-liquid-indicator\.is-moving \.bottom-liquid-surface\{\s*animation:none!important;/);
 assert.match(final,/\.bottom-nav:is\(\.is-dock-releasing,\.is-dock-settling\)/);
 assert.match(final,/\.liquid-selector:is\(\.is-rail-releasing,\.is-rail-settling\)/);
 assert.match(final,/\.bottom-nav\.is-dock-dragging \.bottom-item\.is-scrubbed/);
 assert.match(app,/const frames=liquidDropFrames\(startX,startW,targetX,targetW\)/);
 assert.match(app,/pendingBottomSwipeGeometry/);
 assert.match(css,/@keyframes pocketDockGlassReturn/);
 assert.match(css,/@keyframes pocketNaturalConfirmation/);
 assert.match(css,/@keyframes pocketSwitchThumbBounce/);
});

test('anchored popovers move briskly while page and dialog keep their existing pacing',()=>{
 assert.ok(animationDuration('.page.page-enter')>=580);
 assert.match(css,/animation:glassPopoverBloom \.34s cubic-bezier\(\.22,\.85,\.32,1\) both;/);
 assert.match(css,/animation:glassPopoverReturn \.27s cubic-bezier\(\.32,0,\.72,\.48\) both!important;/);
 assert.match(app,/setTimeout\(finish,305\)/);
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
