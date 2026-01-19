/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 * Developed by: Akhmad Arifin (Lead Developer & System Architect)
 * NIP: 19901004 202521 1012
 * Role: Fullstack & UI/UX Engineer
 * Description: Mengembangkan solusi teknologi pendidikan untuk efisiensi dan transparansi manajemen madrasah.
 * Copyright (c) 2025 MAN 1 Hulu Sungai Tengah. All rights reserved.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './components/App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);