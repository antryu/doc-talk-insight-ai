import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

interface Message {
  id: string;
  content: string;
  timestamp: string;
}

interface ReviewRequest {
  recordId: string;
  conversationData: Message[];
  patientInfo: {
    name: string;
    age: string;
    consent: boolean;
  };
}

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
    console.log('Medical law review started');
    
    const { recordId, conversationData, patientInfo }: ReviewRequest = await req.json();
    
    if (!recordId || !conversationData || !patientInfo) {
      throw new Error('필수 데이터가 누락되었습니다');
    }

    console.log('Reviewing conversation for patient:', patientInfo.name);
    console.log('Message count:', conversationData.length);

    // Supabase 클라이언트 초기화
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. 대화 내용을 하나의 텍스트로 결합
    const conversationText = conversationData
      .map(msg => msg.content)
      .join('\n');

    console.log('Conversation text length:', conversationText.length);

    // 2. OpenAI를 사용해 의료 행위 및 잠재적 법적 이슈 추출
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API 키가 설정되지 않았습니다');
    }

    const analysisPrompt = `
다음은 의료진과 환자 간의 대화 기록입니다. 한국 의료법 관점에서 검토해 주세요:

환자 정보:
- 이름: ${patientInfo.name}
- 나이: ${patientInfo.age}세

대화 내용:
${conversationText}

다음 사항들을 JSON 형태로 분석해 주세요:
1. 의료 행위 식별 (진단, 처방, 의료 상담 등)
2. 의료법 준수 여부 검토 (관련 조항 명시)
3. 잠재적 법적 위험 요소 (관련 조항 명시)
4. 권장 사항 및 개선점
5. 의무기록 작성 시 주의사항

**중요**: 의료법 관련 사항을 언급할 때는 반드시 구체적인 조항(예: 의료법 제12조 제1항)을 명시해주세요.

JSON 형식:
{
  "medicalActs": [
    {
      "act": "확인된 의료 행위",
      "relatedArticles": ["관련 의료법 조항 (예: 의료법 제12조 제1항)"]
    }
  ],
  "compliance": {
    "status": "compliant|warning|violation",
    "details": "준수 상태 상세 설명",
    "relatedArticles": ["관련 의료법 조항"]
  },
  "risks": [
    {
      "risk": "잠재적 위험 요소",
      "relatedArticles": ["관련 의료법 조항"]
    }
  ],
  "recommendations": [
    {
      "recommendation": "권장 사항",
      "relatedArticles": ["관련 의료법 조항"]
    }
  ],
  "recordingNotes": [
    {
      "note": "의무기록 작성 시 주의사항",
      "relatedArticles": ["관련 의료법 조항"]
    }
  ]
}
`;

    console.log('Sending analysis request to OpenAI...');

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
            content: '당신은 한국 의료법 전문가입니다. 의료진과 환자 간의 대화를 분석하여 법적 준수 사항을 검토하는 역할을 합니다.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API error:', response.status, errorData);
      throw new Error(`OpenAI API 오류: ${response.status}`);
    }

    const aiData = await response.json();
    const reviewResult = aiData.choices[0]?.message?.content?.trim();

    if (!reviewResult) {
      throw new Error('AI 분석 결과를 받을 수 없습니다');
    }

    console.log('AI analysis completed');

    // 3. JSON 파싱 시도
    let parsedResult;
    try {
      // ```json과 ``` 태그 제거 후 파싱
      let cleanJson = reviewResult;
      
      // markdown 코드블록 제거
      if (cleanJson.includes('```json')) {
        cleanJson = cleanJson.replace(/```json\s*/g, '').replace(/```[\s\S]*$/g, '').trim();
      }
      
      // JSON 부분만 추출 (첫 번째 {부터 마지막 }까지)
      const jsonStart = cleanJson.indexOf('{');
      const jsonEnd = cleanJson.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanJson = cleanJson.substring(jsonStart, jsonEnd + 1);
      }
      
      parsedResult = JSON.parse(cleanJson);
      console.log('Successfully parsed AI response');
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('Raw AI response:', reviewResult);
      // JSON 파싱 실패 시 텍스트 형태로 저장
      parsedResult = {
        rawAnalysis: reviewResult,
        parseError: parseError.message,
        timestamp: new Date().toISOString()
      };
    }

    // 4. 메타데이터 추가
    const finalResult = {
      ...parsedResult,
      reviewDate: new Date().toISOString(),
      patientInfo: {
        name: patientInfo.name,
        age: patientInfo.age
      },
      conversationSummary: {
        messageCount: conversationData.length,
        textLength: conversationText.length
      }
    };

    console.log('Medical law review completed successfully');

    return new Response(JSON.stringify(finalResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Medical law review error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});