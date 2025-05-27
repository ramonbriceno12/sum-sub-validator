// src/index.ts
import express, {
    Request,
    Response,
    NextFunction,
    RequestHandler,
    ErrorRequestHandler,
  } from 'express';
  import cors from 'cors';
  import fetch from 'node-fetch';
  import crypto from 'crypto';
  import path from 'path';
  import dotenv from 'dotenv';
  dotenv.config();
  
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));
  
  // GET / → serve public/index.html
  const rootHandler: RequestHandler = (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  };
  app.get('/', rootHandler);
  
  const APP_TOKEN  = process.env.SUMSUB_APP_TOKEN!;
  const APP_SECRET = process.env.SUMSUB_APP_SECRET!;
  const API_URL    = 'https://api.sumsub.com';
  const PORT       = process.env.PORT || 5000;
  
  if (!APP_TOKEN || !APP_SECRET) {
    console.error('❌ Missing SUMSUB_APP_TOKEN or SUMSUB_APP_SECRET in .env');
    process.exit(1);
  }
  
  // helper: UNIX-seconds timestamp
  function getTs(): string {
    return Math.floor(Date.now() / 1000).toString();
  }
  
  // helper: HMAC-SHA256 signature
  function signRequest(
    ts: string,
    method: 'GET' | 'POST',
    pathWithQuery: string,
    body: string = ''
  ): string {
    const payload = ts + method + pathWithQuery + body;
    return crypto.createHmac('sha256', APP_SECRET).update(payload).digest('hex');
  }
  
  interface ApplicantResponse { id: string; [key: string]: any }
  interface TokenResponse     { token: string; [key: string]: any }
  
  // GET /sumsub/init → create applicant + SDK token
  const initHandler: RequestHandler = async (req, res, next) => {
    try {
      const externalUserId = '123456';
  
      // 1) Create applicant
      const applicantPath = '/resources/applicants?levelName=id-and-liveness';
      const applicantBody = JSON.stringify({ externalUserId });
      const ts1 = getTs();
      const sig1 = signRequest(ts1, 'POST', applicantPath, applicantBody);
  
      const applicantRes = await fetch(API_URL + applicantPath, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Token': APP_TOKEN,
          'X-App-Access-Ts': ts1,
          'X-App-Access-Sig': sig1,
        },
        body: applicantBody,
      });
      if (!applicantRes.ok) {
        throw new Error(`Applicant creation failed: ${await applicantRes.text()}`);
      }
      const applicant = (await applicantRes.json()) as ApplicantResponse;
      const userId    = applicant.id;
  
      // 2) Generate SDK access token
      const tokenPath = '/resources/accessTokens/sdk';
      const tokenReq  = { ttlInSecs: 600, userId, levelName: 'id-and-liveness' };
      const tokenBody = JSON.stringify(tokenReq);
      const ts2       = getTs();
      const sig2      = signRequest(ts2, 'POST', tokenPath, tokenBody);
  
      const tokenRes = await fetch(API_URL + tokenPath, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-App-Token': APP_TOKEN,
          'X-App-Access-Ts': ts2,
          'X-App-Access-Sig': sig2,
        },
        body: tokenBody,
      });
      if (!tokenRes.ok) {
        throw new Error(`Token creation failed: ${await tokenRes.text()}`);
      }
      const { token } = (await tokenRes.json()) as TokenResponse;
  
      // 3) Respond
      res.json({ token, userId, externalUserId });
    } catch (err: any) {
      next(err);
    }
  };
  app.get('/sumsub/init', initHandler);
  
  // Error‐handler with explicit types
  const errorHandler: ErrorRequestHandler = (
    err,
    req,
    res,
    next
  ) => {
    console.error(err);
    res.status(500).json({ error: err.message || 'Internal error' });
  };
  app.use(errorHandler);
  
  app.listen(PORT, () => {
    console.log(`🚀 Server listening on http://localhost:${PORT}`);
  });
  