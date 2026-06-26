import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // This connects your global styles

// This connects to the <div id="root"></div> in your public/index.html
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);