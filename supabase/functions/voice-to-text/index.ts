
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NAVER_CLOVA_CONFIG = {
  clientId: 'h374bmg0e8',
  clientSecret: 'dNSrjVkugEORDdrMQ2Z4TveQPkri2UdRFOhyoeqE',
  invokeUrl: 'https://naveropenapi.apigw.ntruss.com/recog/v1/stt?lang=Kor',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      throw new Error('오디오 파일이 없습니다.');
    }

    console.log('Processing audio file:', audioFile.name, audioFile.size, audioFile.type);

    // 오디오 파일을 ArrayBuffer로 변환
    const arrayBuffer = await audioFile.arrayBuffer();

    // 네이버 클로바 API 호출
    const response = await fetch(NAVER_CLOVA_CONFIG.invokeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-NCP-APIGW-API-KEY-ID': NAVER_CLOVA_CONFIG.clientId,
        'X-NCP-APIGW-API-KEY': NAVER_CLOVA_CONFIG.clientSecret,
      },
      body: arrayBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Naver Clova API error:', errorText);
      throw new Error(`API 호출 실패: ${response.status}`);
    }

    const result = await response.json();
    console.log('Naver Clova API response:', result);
    
    if (result.text) {
      return new Response(
        JSON.stringify({
          text: result.text,
          confidence: result.confidence || 0.9
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      throw new Error('음성 인식 결과를 받을 수 없습니다.');
    }
  } catch (error) {
    console.error('Error in voice-to-text function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
