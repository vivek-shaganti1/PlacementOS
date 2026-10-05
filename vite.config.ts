import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Serves the Vercel functions in /api during `npm run dev`, so the assistant works locally too.
function apiDevServer(): Plugin {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      Object.assign(process.env, loadEnv(server.config.mode, process.cwd(), ''))
      server.middlewares.use('/api', async (req, res, next) => {
        const name = (req.url ?? '').split('?')[0].replace(/^\/+|\/+$/g, '')
        if (!/^[a-z][a-z0-9-]*$/.test(name)) return next()
        try {
          const chunks: Buffer[] = []
          for await (const c of req) chunks.push(c as Buffer)
          const headers = new Headers()
          for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
          const request = new Request(`http://localhost${req.originalUrl ?? req.url}`, {
            method: req.method,
            headers,
            body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
          })
          const mod = await server.ssrLoadModule(`/api/${name}.ts`)
          const response: Response = await mod.default(request)
          res.statusCode = response.status
          response.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (e) {
          server.config.logger.error(String(e))
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Local API error' }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), apiDevServer()],
  server: { port: 5199 },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
        },
        // three.js, GSAP and Lenis are left to Rollup's automatic splitting (forcing them into manual chunks drags shared
        // dependencies along and ends up preloading 3D code on every page). Their chunks are only renamed for readability.
        chunkFileNames(chunk) {
          if (chunk.facadeModuleId && !chunk.facadeModuleId.includes('node_modules')) return 'assets/[name]-[hash].js'
          if (chunk.moduleIds.some((id) => id.includes('/node_modules/three/'))) return 'assets/three-[hash].js'
          if (chunk.moduleIds.some((id) => id.includes('/node_modules/gsap/'))) return 'assets/scroll-[hash].js'
          return 'assets/[name]-[hash].js'
        },
      },
    },
  },
})
