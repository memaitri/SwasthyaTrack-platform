# Railway Deployment Guide

This project is configured for Railway deployment with both frontend and backend together.

## Prerequisites

1. Railway account
2. GitHub repository connected to Railway
3. Environment variables configured

## Environment Variables

Set these in your Railway dashboard:

```
DATABASE_URL=your_neon_database_url
JWT_SECRET=your_jwt_secret_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
NODE_ENV=production
```

## Deployment Process

1. **Connect Repository**: Link your GitHub repo to Railway
2. **Set Environment Variables**: Add all required env vars in Railway dashboard
3. **Deploy**: Railway will automatically:
   - Install dependencies
   - Build the client (React app)
   - Build the server (TypeScript compilation)
   - Start the server with `npm start`

## Build Process

Railway runs these commands automatically:
1. `npm install` - Install all dependencies
2. `npm run build` - Build both client and server
   - `npm run build:client` - Builds React app to `/dist`
   - `npm run build:server` - Compiles TypeScript server to `/server/dist`
3. `npm start` - Starts the production server

## Health Checks

The app includes health check endpoints:
- `/` - Basic status check
- `/health` - Detailed health information

## File Structure

```
/dist/                 # Built React app (served by Express)
/server/dist/          # Compiled TypeScript server
/server/index.ts       # Main server entry point
railway.toml           # Railway configuration
Procfile              # Alternative process definition
```

## Troubleshooting

1. **Build Fails**: Check that all dependencies are in `package.json`
2. **Database Connection**: Verify `DATABASE_URL` is set correctly
3. **Static Files**: Ensure client builds to `/dist` directory
4. **Port Issues**: Railway automatically sets `PORT` environment variable

## Local Development

```bash
npm run dev          # Start both client and server in development
npm run dev:client   # Start only React dev server
npm run dev:server   # Start only Express server
```