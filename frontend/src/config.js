// Centralized API Base URL configuration for RoboLearn frontend
// Uses VITE_API_URL env var if set.
// In production builds (PROD), defaults to live Render backend.
// In local development, defaults to http://localhost:5000.
export const API_BASE = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? 'https://robolearn-backend.onrender.com' : 'http://localhost:5000');
