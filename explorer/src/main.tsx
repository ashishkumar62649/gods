import React from 'react';
import ReactDOM from 'react-dom/client';
// Cesium ships its widget styles separately — required for the <Viewer> UI.
import 'cesium/Build/Cesium/Widgets/widgets.css';
import App from './App';
import './app.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
