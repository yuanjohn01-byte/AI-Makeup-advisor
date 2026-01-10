/**
 * 注意：Gemini API Key 已经移至服务端中转，以支持中国境内免翻墙访问。
 * 
 * 本地开发：
 * 1. 在项目根目录创建 .env 文件，添加 GEMINI_API_KEY=你的密钥
 * 2. 运行 npm run dev
 * 
 * 部署至 Vercel：
 * 1. 在 Vercel 项目设置中的 Environment Variables 处添加 GEMINI_API_KEY
 * 2. 同时添加 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY
 */

// 这个文件现在主要用于本地开发测试或非 Vercel 环境的配置
window.__APP_CONFIG__ = {
  // GEMINI_API_KEY 现在通过环境变量管理，不再建议在这里明文填写
};
