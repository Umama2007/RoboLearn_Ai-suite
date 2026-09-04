// Centralized API Base URL configuration for RoboLearn frontend
// Uses VITE_API_URL env var if set.
// In production builds (PROD), defaults to live Render backend.
// In local development, defaults to http://localhost:5000.
export const API_BASE = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? 'https://robolearn-backend.onrender.com' : 'http://localhost:5000');

/**
 * Enhanced fetch wrapper with automatic retry for server cold starts,
 * authorization header injection, and friendly error reporting.
 */
export async function fetchWithRetry(url, options = {}, retries = 2, delayMs = 2000) {
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const headers = new Headers(options.headers || {});
      
      // Inject Authorization header from cached session if not explicitly set
      const savedUserStr = localStorage.getItem('education_user');
      if (savedUserStr && !headers.has('Authorization')) {
        try {
          const userObj = JSON.parse(savedUserStr);
          if (userObj?.id) {
            headers.set('Authorization', `Bearer ${userObj.id}`);
          }
        } catch (e) {}
      }

      const mergedOptions = {
        ...options,
        headers,
        credentials: options.credentials || 'include'
      };

      const res = await fetch(url, mergedOptions);
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        // Wait before next retry (gives sleeping Render instance time to wake up)
        await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
      }
    }
  }

  // If all attempts failed, throw a descriptive, actionable error
  const isNetworkFailure = lastError?.message?.toLowerCase().includes('failed to fetch') ||
    lastError?.name === 'TypeError';

  if (isNetworkFailure) {
    throw new Error('Could not reach backend server. The AI backend may be waking up from sleep or experiencing network delays. Please retry in a few moments.');
  }

  throw lastError || new Error('Network request failed');
}
