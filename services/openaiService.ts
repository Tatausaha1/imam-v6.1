
/**
 * @license
 * IMAM System - Integrated Madrasah Academic Manager
 * OpenAI Service Integration
 */

export const getOpenAIAdvice = async (prompt: string): Promise<string> => {
  try {
    const response = await fetch('/api-proxy-openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4-turbo", // Menggunakan model stabil, bisa diubah ke gpt-5 jika sudah rilis
        messages: [
          {
            role: "system",
            content: "Anda adalah asisten teknis IMAM (Integrated Madrasah Academic Manager) yang ditenagai oleh GPT. Bantu pengguna memahami fitur aplikasi madrasah dengan sopan."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content;
    }
    return "Maaf, OpenAI tidak memberikan respon.";
  } catch (error) {
    console.error("OpenAI API Error:", error);
    return "Gagal terhubung ke otak GPT. Pastikan kuota API tersedia.";
  }
};
