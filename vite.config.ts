import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      {
        name: 'local-api-chat-middleware',
        configureServer(server) {
          server.middlewares.use('/api/chat', async (req, res, next) => {
            if (req.method !== 'POST') {
              return next()
            }

            let body = ''
            req.on('data', chunk => {
              body += chunk
            })

            req.on('end', async () => {
              try {
                const parsed = JSON.parse(body || '{}')
                const apiUrl =
                  process.env.LLM_API_URL ||
                  env.VITE_LLM_API_URL ||
                  env.LLM_API_URL ||
                  'https://orfi.hyaena.qzz.io:9443/v1/chat/completions'
                const apiKey =
                  process.env.LLM_API_KEY ||
                  env.VITE_LLM_API_KEY ||
                  env.LLM_API_KEY ||
                  'fb456ad3f74e273cb5941a5fda68dbbe527b3569a20266078e2d5dcf88815e9a'
                const model =
                  process.env.LLM_MODEL ||
                  env.VITE_LLM_MODEL ||
                  env.LLM_MODEL ||
                  'default'

                if (!parsed.prompt) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Prompt parametresi gerekli.' }))
                  return
                }

                const payload: any = {
                  model,
                  messages: [{ role: 'user', content: parsed.prompt }],
                }
                if (parsed.expectJson) {
                  payload.response_format = { type: 'json_object' }
                }
                if (parsed.temperature !== undefined) {
                  payload.temperature = parsed.temperature
                }

                let upstreamRes = await fetch(apiUrl, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                  },
                  body: JSON.stringify(payload),
                })

                // response_format desteklenmiyorsa (400) düşür ve yeniden dene
                if (parsed.expectJson && upstreamRes.status === 400) {
                  delete payload.response_format
                  upstreamRes = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify(payload),
                  })
                }

                if (!upstreamRes.ok) {
                  let errorData: any = {}
                  try {
                    errorData = await upstreamRes.json()
                  } catch {
                    errorData = { message: await upstreamRes.text() }
                  }
                  res.statusCode = upstreamRes.status
                  res.setHeader('Content-Type', 'application/json')
                  res.end(
                    JSON.stringify({
                      error:
                        errorData.error?.message ||
                        errorData.message ||
                        'LLM API Hatası',
                    })
                  )
                  return
                }

                const data = await upstreamRes.json()
                const resultText = data?.choices?.[0]?.message?.content || ''

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ result: resultText }))
              } catch (err: any) {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(
                  JSON.stringify({
                    error: err.message || 'Yerel proxy sunucu hatası',
                  })
                )
              }
            })
          })
        },
      },
    ],
  }
})
