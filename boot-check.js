/* Small fallback shown only if the main interface fails to start. */
(() => {
 'use strict';
 let errorInfo = '';
 window.addEventListener('error', (event) => {
   if (event && event.message) errorInfo = String(event.message).slice(0,180);
 }, true);
 window.addEventListener('unhandledrejection', (event) => {
   if (!errorInfo && event && event.reason) errorInfo = String(event.reason.message || event.reason).slice(0,180);
 });
 setTimeout(() => {
   const root = document.querySelector('#app');
   if (!root || !root.querySelector('.boot')) return;
   root.replaceChildren();
   const panel = document.createElement('section');
   panel.style.cssText = 'max-width:640px;margin:12vh auto;padding:30px;border:1px solid #ffffff55;border-radius:22px;background:#ffffff18;backdrop-filter:blur(16px);font:16px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#e5f3ec';
   const title = document.createElement('h1');
   title.textContent = '页面初始化遇到问题';
   title.style.cssText = 'font-size:24px;margin:0 0 12px';
   const note = document.createElement('p');
   note.textContent = '可以尝试按 Ctrl + Shift + R 强制刷新，或使用无痕窗口打开。如果反复出现，请将下方错误信息截图反馈。';
   const detail = document.createElement('p');
   detail.style.cssText = 'font-size:13px;opacity:.8;overflow-wrap:anywhere';
   detail.textContent = errorInfo ? '错误信息：'+errorInfo : '原因未定位：脚本未完成执行，可能是缓存或资源加载问题。';
   const link = document.createElement('a');
   link.href = '/?reload=' + Date.now();
   link.textContent = '重新加载最新页面';
   link.style.cssText = 'display:inline-block;background:#d6ebdf;color:#123928;padding:10px 17px;border-radius:12px;text-decoration:none;font-weight:600';
   panel.append(title,note,detail,link);
   root.append(panel);
 }, 7000);
})();
