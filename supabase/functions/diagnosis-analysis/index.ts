import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  id: string;
  speaker: 'doctor' | 'patient';
  content: string;
  timestamp: Date;
}

interface PatientInfo {
  name: string;
  age: string;
}

interface Diagnosis {
  disease: string;
  probability: number;
  symptoms: string[];
  recommendation: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, patientInfo }: { messages: Message[], patientInfo: PatientInfo } = await req.json();

    if (!messages || messages.length === 0) {
      throw new Error('대화 기록이 없습니다.');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API 키가 설정되지 않았습니다.');
    }

    // 대화 내용을 하나의 텍스트로 결합
    const conversationText = messages.map(msg => msg.content).join('\n');

    console.log('Analyzing conversation for patient:', patientInfo.name, patientInfo.age);
    console.log('Conversation length:', conversationText.length);

    const prompt = `
당신은 의료 전문가입니다. 다음 환자의 대화 기록을 분석하여 예상 병명 3개를 제시해주세요.

환자 정보:
- 이름: ${patientInfo.name}
- 나이: ${patientInfo.age}세

대화 기록:
${conversationText}

다음 JSON 형식으로 정확히 3개의 예상 진단을 제공해주세요:
{
  "diagnoses": [
    {
      "disease": "병명 (한국어)",
      "probability": 확률숫자(1-100),
      "symptoms": ["증상1", "증상2", "증상3"],
      "recommendation": "치료 권장사항"
    }
  ]
}

주의사항:
- 확률이 높은 순서대로 정렬해주세요
- 병명은 정확한 의학 용어를 사용해주세요
- 증상은 환자가 언급한 내용을 기반으로 해주세요
- 권장사항은 구체적이고 실용적으로 작성해주세요
- 이것은 참고용이며 실제 진료는 의사와 상담해야 함을 명시해주세요
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: '당신은 경험이 풍부한 의료 전문가입니다. 환자의 증상을 분석하여 가능한 진단을 제시하되, 항상 전문의 상담의 필요성을 강조해주세요.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error(`OpenAI API 오류: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('AI Response:', aiResponse);

    try {
      // JSON 파싱 시도
      const parsedResponse = JSON.parse(aiResponse);
      
      if (!parsedResponse.diagnoses || !Array.isArray(parsedResponse.diagnoses)) {
        throw new Error('Invalid response format');
      }

      const diagnoses: Diagnosis[] = parsedResponse.diagnoses.slice(0, 3); // 최대 3개만

      return new Response(JSON.stringify({ diagnoses }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      console.error('AI Response that failed to parse:', aiResponse);
      
      // JSON 파싱 실패 시 기본 응답 제공
      const fallbackDiagnoses: Diagnosis[] = [
        {
          disease: "추가 검사 필요",
          probability: 80,
          symptoms: ["명확한 진단을 위한 추가 정보 필요"],
          recommendation: "전문의와 직접 상담하여 정확한 진단을 받으시기 바랍니다."
        }
      ];

      return new Response(JSON.stringify({ diagnoses: fallbackDiagnoses }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in diagnosis-analysis function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || '진단 분석 중 오류가 발생했습니다.' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});