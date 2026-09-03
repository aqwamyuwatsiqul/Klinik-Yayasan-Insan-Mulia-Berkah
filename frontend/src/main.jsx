import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/common/ErrorBoundary';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/*
      ErrorBoundary paling luar — menangkap error apapun termasuk:
      - Lazy import chunk gagal dimuat (deploy baru sementara user masih buka tab lama)
      - Runtime error di komponen manapun
    */}
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
