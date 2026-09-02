// Centralized API Base URL configuration for RoboLearn frontend
// Defaults to http://localhost:5000 for local development if VITE_API_URL is not set.
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
