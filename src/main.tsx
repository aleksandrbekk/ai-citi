// Отлов ошибок для мобильных устройств
window.onerror = function(msg, _url, line, col, error) {
  document.body.innerHTML = '<pre style="color:red;padding:20px;background:#000;font-size:14px;">Error: ' + msg + '\nLine: ' + line + '\nCol: ' + col + '\n' + (error?.stack || '') + '</pre>';
  return false;
};

window.addEventListener('unhandledrejection', function(e) {
  document.body.innerHTML = '<pre style="color:red;padding:20px;background:#000;font-size:14px;">Promise Error: ' + e.reason + '\n' + (e.reason?.stack || '') + '</pre>';
});

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
