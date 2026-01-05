import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Отладка на экран
const debugEl = document.createElement('div');
debugEl.id = 'debug';
debugEl.style.cssText = 'position:fixed;top:50px;left:10px;right:10px;background:black;color:lime;padding:10px;font-size:12px;z-index:99999;max-height:300px;overflow:auto;white-space:pre-wrap;';
document.body.appendChild(debugEl);

function log(msg: string) {
  const el = document.getElementById('debug');
  if (el) el.textContent += msg + '\n';
  console.log(msg);
}

window.onerror = (msg, src, line) => {
  log(`ERROR: ${msg} at ${src}:${line}`);
};

try {
  log('1. Starting...');
  
  const root = document.getElementById('root');
  log('2. Root element: ' + (root ? 'found' : 'NOT FOUND'));
  
  if (root) {
    log('3. Creating React root...');
    const reactRoot = ReactDOM.createRoot(root);
    
    log('4. Rendering App...');
    reactRoot.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    log('5. Render called');
  }
} catch (e: any) {
  log('CATCH ERROR: ' + e.message + '\n' + e.stack);
}
