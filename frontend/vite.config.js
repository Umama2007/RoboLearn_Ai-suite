import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const proxyTarget = {
  target: 'http://127.0.0.1:5000',
  changeOrigin: true,
  timeout: 120000, // 2 minutes
  proxyTimeout: 120000 // 2 minutes
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': proxyTarget,
      '/train_teacher': proxyTarget,
      '/ai_chat': proxyTarget,
      '/ai_chat_stream': proxyTarget,
      '/ask_book_teacher_stream': proxyTarget,
      '/generate_flashcards': proxyTarget,
      '/generate_ppt_slides': proxyTarget,
      '/export_ppt': proxyTarget,
      '/generate_flowchart': proxyTarget,
      '/generate_quiz': proxyTarget,
      '/submit_quiz': proxyTarget,
      '/socratic_hint': proxyTarget,
      '/generate_curriculum': proxyTarget,
      '/generate_topic_curriculum': proxyTarget,
      '/download': proxyTarget,
      '/clear_history': proxyTarget,
      '/get_topics': proxyTarget
    }
  }
})
