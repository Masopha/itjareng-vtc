// config.js - API configuration for frontend
// This file will be updated during deployment

// For local development
const DEV_API_URL = 'http://localhost:3000';

// For production (will be replaced during build or set in Vercel)
// Replace with your Render backend URL after deployment
const PROD_API_URL = 'https://YOUR-BACKEND-URL.onrender.com';

// Automatically detect environment
const API_BASE_URL = (() => {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('🔧 Using DEV API:', DEV_API_URL);
    return DEV_API_URL;
  }
  console.log('🚀 Using PROD API:', PROD_API_URL);
  return PROD_API_URL;
})();

window.API_BASE_URL = API_BASE_URL;