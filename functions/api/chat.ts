// OpenAI-uyumlu (chat.completions) LLM API çağrısı yapan Cloudflare Pages Fonksiyonu.
// Önceden Gemini'ye özeldi; artık herhangi bir OpenAI-uyumlu endpoint ile çalışır.
// Gerekli env değişkenleri:
//   LLM_API_URL  - Örn. https://orfi.hyaena.qzz.io:9443/v1/chat/completions
//   LLM_API_KEY  - Bearer token (Authorization: Bearer <KEY>)
//   LLM_MODEL    - Örn. "default" (opsiyonel, yoksa "default" kullanılır)

// Bu endpoint yalnızca POST kabul eder; diğer method'lara 405 döndür
export async function onRequestGet() {
  return new Response(JSON.stringify({ error: 'Method Not Allowed. POST kullanın.' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json', Allow: 'POST' },
  });
}

export async function onRequestPost(context: any) {
  try {
    const { request, env } = context;
    const body = await request.json();

    const { prompt, expectJson, temperature, max_tokens } = body;
    const apiUrl = env.LLM_API_URL || 'https://orfi.hyaena.qzz.io:9443/v1/chat/completions';
    const apiKey = env.LLM_API_KEY || 'fb456ad3f74e273cb5941a5fda68dbbe527b3569a20266078e2d5dcf88815e9a';
    const model = env.LLM_MODEL || 'default';

    if (!apiUrl || !apiKey) {
      return new Response(
        JSON.stringify({
          error: 'Sunucu tarafında LLM_API_URL ve LLM_API_KEY bulunamadı.',
          hint: 'Cloudflare Pages Settings -> Environment variables üzerinden LLM_API_URL ve LLM_API_KEY ekleyin.',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt parametresi gerekli.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const payload: any = {
      model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    };

    if (temperature !== undefined) {
      payload.temperature = temperature;
    }
    if (max_tokens !== undefined) {
      payload.max_tokens = max_tokens;
    }

    // JSON çıktı isteniyorsa response_format dene; proxy bazlı sunucular
    // bunu desteklemeyebilir, o durumda bu alan olmadan yeniden deneriz.
    if (expectJson) {
      payload.response_format = { type: 'json_object' };
    }

    let response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    // response_format desteklenmiyorsa (400) düşür ve yeniden dene
    if (expectJson && response.status === 400) {
      delete payload.response_format;
      response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });
    }

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: await response.text() };
      }
      return new Response(
        JSON.stringify({ error: errorData.error?.message || errorData.message || 'LLM API Hatası' }),
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();

    // OpenAI chat.completions formatı: choices[0].message.content
    const resultText = data?.choices?.[0]?.message?.content;

    if (typeof resultText !== 'string') {
      return new Response(
        JSON.stringify({ error: 'LLM API geçersiz yanıt döndürdü (choices/result bulunamadı).' }),
        {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify({ result: resultText }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Beklenmeyen sunucu hatası' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
