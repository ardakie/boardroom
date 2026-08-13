export async function onRequestPost(context: any) {
  try {
    const { request, env } = context;
    const body = await request.json();
    
    const { prompt, expectJson, temperature } = body;
    const apiKey = env.GEMINI_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Sunucu tarafında GEMINI_API_KEY bulunamadı." }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt parametresi gerekli." }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const payload: any = {
      contents: [{ parts: [{ text: prompt }] }]
    };

    payload.generationConfig = {};
    if (expectJson) {
      payload.generationConfig.responseMimeType = 'application/json';
    }
    if (temperature !== undefined) {
      payload.generationConfig.temperature = temperature;
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      return new Response(JSON.stringify({ error: errorData.error?.message || 'Gemini API Hatası' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    const resultText = data.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ result: resultText }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || "Beklenmeyen sunucu hatası" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
