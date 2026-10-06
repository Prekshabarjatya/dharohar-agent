// Languages the guide can speak. Gemma writes in the language; ElevenLabs voices it.
// multilingual_v2 covers en/hi/ta; the other Indian languages need eleven_v3 (checked against the API).
export const LANGUAGES: Record<string, { name: string; tts: 'eleven_multilingual_v2' | 'eleven_v3'; opening: string }> = {
  en: { name: 'English', tts: 'eleven_multilingual_v2', opening: "Namaste. Put your phone in your pocket, and let's walk." },
  hi: { name: 'Hindi', tts: 'eleven_multilingual_v2', opening: 'नमस्ते। अपना फ़ोन जेब में रखिए, और चलिए चलते हैं।' },
  mr: { name: 'Marathi', tts: 'eleven_v3', opening: 'नमस्कार. तुमचा फोन खिशात ठेवा, आणि चला चालूया.' },
  gu: { name: 'Gujarati', tts: 'eleven_v3', opening: 'નમસ્તે. તમારો ફોન ખિસ્સામાં મૂકો, અને ચાલો ચાલીએ.' },
  bn: { name: 'Bengali', tts: 'eleven_v3', opening: 'নমস্কার। আপনার ফোনটি পকেটে রাখুন, আর চলুন হাঁটি।' },
  pa: { name: 'Punjabi', tts: 'eleven_v3', opening: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ। ਆਪਣਾ ਫ਼ੋਨ ਜੇਬ ਵਿੱਚ ਰੱਖੋ, ਅਤੇ ਆਓ ਤੁਰੀਏ।' },
  ta: { name: 'Tamil', tts: 'eleven_multilingual_v2', opening: 'வணக்கம். உங்கள் போனை பாக்கெட்டில் வையுங்கள், நடக்கலாம் வாருங்கள்.' },
  te: { name: 'Telugu', tts: 'eleven_v3', opening: 'నమస్తే. మీ ఫోన్\u200cను జేబులో పెట్టుకోండి, నడుద్దాం రండి.' },
  kn: { name: 'Kannada', tts: 'eleven_v3', opening: 'ನಮಸ್ಕಾರ. ನಿಮ್ಮ ಫೋನ್ ಅನ್ನು ಜೇಬಿನಲ್ಲಿ ಇಡಿ, ಬನ್ನಿ ನಡೆಯೋಣ.' },
  ml: { name: 'Malayalam', tts: 'eleven_v3', opening: 'നമസ്കാരം. നിങ്ങളുടെ ഫോൺ പോക്കറ്റിൽ വയ്ക്കൂ, നമുക്ക് നടക്കാം.' },
};
export const langOf = (l?: string) => (l && LANGUAGES[l] ? l : 'en');
