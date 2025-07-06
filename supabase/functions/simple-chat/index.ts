import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    
    if (!text) {
      throw new Error('텍스트가 제공되지 않았습니다');
    }

    console.log('Processing medical chat:', text.substring(0, 100) + '...');

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API 키가 설정되지 않았습니다');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `당신은 친절한 의료진입니다. 환자의 말을 듣고 다음과 같이 응답해주세요:

1. 환자의 증상에 공감하며 친근하게 응답
2. 추가로 궁금한 점이나 관련 증상에 대해 질문
3. 간단한 조언이나 주의사항 제공
4. 진단은 하지 말고, 증상 청취에 집중
5. 한국어로 자연스럽게 대화
6. 50-100자 정도의 간결한 응답

예시:
- "복통이 있으시는군요. 언제부터 아프기 시작하셨나요?"
- "열이 나신다고 하셨는데, 몇 도 정도 되시는지 확인해보셨나요?"
- "충분한 휴식을 취하시는 것이 중요해요. 다른 불편한 증상은 없으신가요?"`
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API error:', response.status, errorData);
      throw new Error(`OpenAI API 오류: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content?.trim();

    if (!aiResponse) {
      throw new Error('AI 응답을 받을 수 없습니다');
    }

    console.log('AI response generated successfully:', aiResponse.substring(0, 50) + '...');

    return new Response(JSON.stringify({ 
      response: aiResponse,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Simple chat error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});