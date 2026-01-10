import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // 使用 process.cwd() 确保从正确的目录加载 .env 文件
    const env = loadEnv(mode, process.cwd(), '');
    
    // Debug: 打印加载的环境变量
    console.log('Vite loaded GEMINI_API_KEY:', env.GEMINI_API_KEY ? '✅ Found' : '❌ Not found');
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
