
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
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      throw new Error('오디오 파일이 없습니다.');
    }

    console.log('Processing audio file:', audioFile.name, audioFile.size, audioFile.type);

    // OpenAI Whisper API를 위한 FormData 준비
    const whisperFormData = new FormData();
    whisperFormData.append('file', audioFile, 'audio.webm');
    whisperFormData.append('model', 'whisper-1');
    whisperFormData.append('language', 'ko');

    // OpenAI Whisper API 호출
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
      },
      body: whisperFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI Whisper API error:', errorText);
      throw new Error(`API 호출 실패: ${response.status}`);
    }

    const result = await response.json();
    console.log('OpenAI Whisper API response:', result);
    
    if (result.text) {
      return new Response(
        JSON.stringify({
          text: result.text,
          confidence: 0.9
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
