export interface DebateMessage {
  expertId: string;
  text: string;
  delay: number;
}

export interface ExpertPanelContent {
  expertId: string;
  paragraphs: string[];
}

// API Key'i ve URL'i fonksiyon içinde dinamik alacağız

// Helper: Markdown'ı temizle
function cleanJsonResponse(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  
  cleaned = cleaned.trim();
  
  // Sadece array kısmını al (başındaki ve sonundaki fazlalıkları at)
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    cleaned = cleaned.substring(firstBracket, lastBracket + 1);
  }
  
  // Olası JSON hatalarını manuel düzeltmeye çalış (eksik virgül veya fazla virgül)
  cleaned = cleaned.replace(/}\s*{/g, '},{');
  cleaned = cleaned.replace(/]\s*{/g, '],{');
  cleaned = cleaned.replace(/}\s*]/g, '}]');
  cleaned = cleaned.replace(/,\s*]/g, ']');
  cleaned = cleaned.replace(/,\s*}/g, '}');
  
  return cleaned;
}

async function safeGenerateJson<T>(prompt: string, retries: number = 2): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await callGemini(prompt, true);
      const cleanedResult = cleanJsonResponse(result);
      return JSON.parse(cleanedResult) as T;
    } catch (err: any) {
      console.warn(`JSON Parse attempt ${attempt} failed:`, err.message);
      if (attempt === retries) {
        throw new Error(`Yapay zeka yanıtı anlaşılamadı (JSON Hatası): ${err.message}`);
      }
    }
  }
  throw new Error('Beklenmeyen hata');
}

// Yardımcı fonksiyon: Hem Cloudflare API hem de doğrudan API anahtarı ile çalışabilen akıllı Gemini çağırıcı
async function callGemini(prompt: string, expectJson: boolean = false): Promise<string> {
  // 1. Önce Cloudflare Backend (/api/gemini) üzerinden dene
  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, expectJson, temperature: expectJson ? 0.8 : 0.7 })
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.result) {
        return data.result;
      }
    }
  } catch (err) {
    console.warn("Backend API (/api/gemini) çağrılamadı, yerel anahtar deneniyor...", err);
  }

  // 2. Eğer backend yoksa veya hata verdiyse (Örn: npm run dev modundayken), VITE_GEMINI_API_KEY'i kontrol et
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (apiKey && apiKey !== 'your_gemini_api_key_here') {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`;

    const payload: any = {
      contents: [{ parts: [{ text: prompt }] }],
    };

    if (expectJson) {
      payload.generationConfig = { responseMimeType: 'application/json', temperature: 0.8 };
    } else {
      payload.generationConfig = { temperature: 0.7 };
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Gemini API Hatası');
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }

  throw new Error("API çağrısı başarısız oldu. Lütfen Cloudflare servisinin çalıştığından veya geçerli bir API anahtarınız olduğundan emin olun.");
}

export const aiService = {
  // 1. Tartışma (Debate) Metinlerini Üret
  async generateDebate(topic: string, experts: string[], initialAnalyses: ExpertPanelContent[], language: 'tr' | 'en' = 'tr'): Promise<DebateMessage[]> {
    const contextStr = initialAnalyses.map(a => `${a.expertId} ilk düşüncesi: "${a.paragraphs.join(' ')}"`).join('\n');
    
    const prompt = `Sen bir simülasyon sistemisin. Konu: "${topic}". 
Masadaki uzmanlar: ${experts.join(', ')}.
Uzmanların ilk başta yaptıkları yorumlar şunlar (BUNLARI ASLA TEKRAR ETME):
${contextStr}

Görev: Bu uzmanlar arasında konuyu tartışan, her birinin DİĞERİNİN İLK FİKRİNE doğrudan itiraz ettiği veya geliştirdiği GÜNLÜK VE DOĞAL bir diyalog oluştur.
LÜTFEN ÇOK RESMİ VE ROBOTİK OLMA. İnsanlar toplantılarda nasıl konuşuyorsa öyle yaz. Her uzmanın cevabı ÇOK KISA (maksimum 1-2 cümle) olmalıdır. Uzatmayın.
DİKKAT: Tartışmada her bir uzman SADECE BİR KERE konuşmalıdır. Masadaki her uzman sırayla bir yorum yapacak ve tartışma bitecek.
Lütfen cevabını sadece ve SADECE bir JSON dizisi formatında ver. Başka hiçbir açıklama yazma.
ÖNEMLİ KURALLAR:
1. Her JSON objesinin arasında mutlaka virgül olmalıdır.
2. Metin içinde çift tırnak (") KESİNLİKLE kullanma, gerekirse tek tırnak (') kullan.
3. Çıktı formatı kesinlikle bozuk olmamalı, kusursuz bir JSON olmalı.
4. LÜTFEN BÜTÜN YANITLARINI KESİNLİKLE ${language === 'tr' ? 'TÜRKÇE' : 'İNGİLİZCE'} DİLİNDE YAZ.
5. DİKKAT: ASLA İLK YORUMLARINIZI TEKRAR ETMEYİN VEYA ÖZETLEMEYİN. Doğrudan diğer uzmanın fikrine yeni bir itiraz veya yeni bir çözüm ile karşılık verin. Her mesaj tamamen YENİ bir bakış açısı sunmalıdır.
Örnek format:
[
  { "expertId": "ceo", "text": "${language === 'tr' ? 'Finansın görüşüne tamamen karşıyım.' : 'I completely disagree with finance.'}" },
  { "expertId": "finance", "text": "${language === 'tr' ? 'Fakat riskleri göz ardı edemeyiz.' : 'But we cannot ignore the risks.'}" }
]
Sadece listedeki uzmanların ID'lerini kullan (${experts.join(', ')}).`;

    const parsed = await safeGenerateJson<any[]>(prompt);
    
    // Her uzmanın sadece BİR KERE konuşmasını programatik olarak da garanti altına alalım
    const uniqueMessages = [];
    const seenExperts = new Set();
    for (const msg of parsed) {
      if (!seenExperts.has(msg.expertId) && experts.includes(msg.expertId)) {
        seenExperts.add(msg.expertId);
        uniqueMessages.push(msg);
      }
    }
    
    return uniqueMessages.map((msg: any) => {
      // Mesaj uzunluğuna göre dinamik bekleme süresi hesapla (daha hızlı)
      const textLength = msg.text ? msg.text.length : 50;
      const calculatedDelay = Math.max(1000, Math.min(2500, textLength * 20)); 
      
      return {
        ...msg,
        delay: calculatedDelay + Math.floor(Math.random() * 500)
      };
    });
  },

  // 2. Uzman Panelleri İçin Görüş Üret
  async generateExpertAnalyses(topic: string, experts: string[], language: 'tr' | 'en' = 'tr'): Promise<ExpertPanelContent[]> {
    const prompt = `Sen bir yönetim kurulu simülasyonusun. Konu: "${topic}".
Seçilen uzmanlar: ${experts.join(', ')}.
Görev: Her bir uzman için konuyla ilgili çok spesifik, akıllıca ve profesyonel 2 adet kısa paragraf (görüş) oluştur. Görüşleri kendi perspektiflerinden (örn. finans uzmanı karlılığa, dev teknik altyapıya baksın) yazsınlar.
Lütfen cevabını sadece ve SADECE bir JSON dizisi formatında ver. Başka hiçbir açıklama yazma.
ÖNEMLİ KURALLAR:
1. Her JSON objesinin arasında mutlaka virgül olmalıdır.
2. Paragraf metinleri içinde çift tırnak (") KESİNLİKLE kullanma, gerekirse tek tırnak (') kullan.
3. Çıktı formatı kesinlikle bozuk olmamalı, kusursuz bir JSON olmalı.
4. LÜTFEN BÜTÜN YANITLARINI KESİNLİKLE ${language === 'tr' ? 'TÜRKÇE' : 'İNGİLİZCE'} DİLİNDE YAZ.
Örnek format:
[
  { "expertId": "ceo", "paragraphs": ["${language === 'tr' ? 'İlk paragraf...' : 'First paragraph...'}", "${language === 'tr' ? 'İkinci paragraf...' : 'Second paragraph...'}"] }
]`;

    return await safeGenerateJson<ExpertPanelContent[]>(prompt);
  },

  // 3. Nihai Sentez Raporunu Üret
  async generateSynthesisReport(topic: string, experts: string[], depth: 'low' | 'medium' | 'high', expertAnalyses: ExpertPanelContent[], language: 'tr' | 'en' = 'tr'): Promise<string> {
    const depthInstruction = {
      low: language === 'tr' ? 'Kısa, öz ve sadece ana hatları belirten yüzeysel bir rapor (max 2-3 paragraf).' : 'Short, concise, superficial report outlining main points (max 2-3 paragraphs).',
      medium: language === 'tr' ? 'Orta detaylı, dengeli ve madde işaretleri içeren standart bir rapor.' : 'Medium detail, balanced standard report with bullet points.',
      high: language === 'tr' ? 'Çok detaylı, sebepler ve mantık açısından derinlemesine değerlendirmeler içeren, uzun ve kapsamlı bir yönetim kurulu raporu.' : 'Very detailed, comprehensive board report containing in-depth logic and reasoning.'
    };

    const analysesText = expertAnalyses.map(e => `${e.expertId}: ${e.paragraphs.join(' ')}`).join('\n');

    const prompt = `Sen bir "Yönetim Kurulu Sentez Yapay Zekası"sın. 
Konu: "${topic}". 
Katılımcı Uzmanlar: ${experts.join(', ')}.
Uzmanların Gönderdiği Analizler:
${analysesText}

Görev: Bu analizleri sentezleyerek resmi bir "Yönetim Kurulu Kararı ve Sentez Raporu" yaz. 
Detay seviyesi: ${depthInstruction[depth]}

Raporu lütfen Markdown formatında yaz. Başlıklar, madde işaretleri, kalın metinler vb. kullanarak şık bir rapor oluştur.
Lütfen raporun sonuna tarafsız ve net bir "Sonuç ve Öneriler" bölümü ekle. KESİNLİKLE "ONAYLANDI", "REDDEDİLDİ" veya "REVİZYON GEREKLİ" gibi karar ifadeleri KULLANMA.
ÇOK ÖNEMLİ: RAPORUN TAMAMINI KESİNLİKLE ${language === 'tr' ? 'TÜRKÇE' : 'İNGİLİZCE'} OLARAK YAZ.`;

    const result = await callGemini(prompt, false);
    return result;
  },

  // 4. Uzmana Soru Sor
  async askExpertQuestion(topic: string, role: string, name: string, contextContent: string, question: string, language: 'tr' | 'en' = 'tr'): Promise<string> {
    const prompt = `Sen bir simülasyondaki uzman karakterisin.
Rolün: ${role} - Alanın: ${name}
Ana Konu: "${topic}"
Senin bu konudaki önceki analizin:
"${contextContent}"

Kullanıcı sana kendi alanınla ve analizinle ilgili şu soruyu soruyor:
"${question}"

Görev: Bu soruya sadece kendi uzmanlık perspektifinden, profesyonel, doğrudan ve akıllıca bir cevap ver. Cevabını Markdown formatında (bold, liste vb. kullanarak) verebilirsin. Asla JSON formatı kullanma, normal metin olarak yanıtla.
ÇOK ÖNEMLİ: CEVABINI KESİNLİKLE ${language === 'tr' ? 'TÜRKÇE' : 'İNGİLİZCE'} OLARAK YAZ.`;

    const result = await callGemini(prompt, false);
    return result;
  }
};
