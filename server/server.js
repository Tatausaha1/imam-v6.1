
/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

require('dotenv').config();
const express = require('express');
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const WebSocket = require('ws');
const { URLSearchParams, URL } = require('url');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;

// Base URLs
const externalApiBaseUrl = 'https://generativelanguage.googleapis.com';
const openaiApiBaseUrl = 'https://api.openai.com';

// API Keys from Env
const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
const openaiKey = process.env.OPENAI_API_KEY; // Tambahkan OPENAI_API_KEY di file .env Anda

const staticPath = path.join(__dirname,'dist');
const publicPath = path.join(__dirname,'public');

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({extended: true, limit: '50mb'}));
app.set('trust proxy', 1);

const proxyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Terlalu banyak permintaan, coba lagi nanti.'
});

// --- PROXY GEMINI (EXISTING) ---
app.use('/api-proxy', proxyLimiter, async (req, res, next) => {
    if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') return next();
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    try {
        const targetPath = req.url.startsWith('/') ? req.url.substring(1) : req.url;
        const apiUrl = `${externalApiBaseUrl}/${targetPath}`;
        const outgoingHeaders = { 'X-Goog-Api-Key': apiKey, 'Content-Type': 'application/json' };
        const apiResponse = await axios({ method: req.method, url: apiUrl, headers: outgoingHeaders, data: req.body, responseType: 'stream', validateStatus: () => true });
        res.status(apiResponse.status);
        apiResponse.data.pipe(res);
    } catch (error) { res.status(500).json({ error: 'Proxy error' }); }
});

// --- PROXY OPENAI (NEW) ---
app.use('/api-proxy-openai', proxyLimiter, async (req, res) => {
    if (!openaiKey) return res.status(500).json({ error: "OpenAI Key belum dikonfigurasi di server." });
    try {
        const targetPath = req.url.startsWith('/') ? req.url.substring(1) : req.url;
        const apiUrl = `${openaiApiBaseUrl}/${targetPath}`;
        const apiResponse = await axios({
            method: req.method,
            url: apiUrl,
            headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
            data: req.body,
            validateStatus: () => true
        });
        res.status(apiResponse.status).json(apiResponse.data);
    } catch (error) { res.status(500).json({ error: 'OpenAI Proxy Error' }); }
});

app.get('/', (req, res) => {
    const indexPath = path.join(staticPath, 'index.html');
    res.sendFile(indexPath);
});

app.use('/public', express.static(publicPath));
app.use(express.static(staticPath));

app.listen(port, () => {
    console.log(`IMAM Hybrid Server active on port ${port}`);
});
