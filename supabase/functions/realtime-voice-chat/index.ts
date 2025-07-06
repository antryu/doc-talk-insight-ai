import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  console.log('WebSocket connection established');
  
  let openAISocket: WebSocket | null = null;
  let sessionConfigured = false;

  socket.onopen = () => {
    console.log('Client WebSocket connected');
    
    // OpenAI Realtime API 연결
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OpenAI API key not found');
      socket.close(4000, 'Server configuration error');
      return;
    }

    try {
      // OpenAI Realtime API는 특별한 서브프로토콜 방식을 사용합니다
      openAISocket = new WebSocket(
        `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01`,
        [`realtime`, `openai-insecure-api-key.${openAIApiKey}`, `openai-beta.realtime=v1`]
      );

      openAISocket.onopen = () => {
        console.log('OpenAI WebSocket connected');
      };

      openAISocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Received from OpenAI:', data.type);

        // 세션 생성 완료 시 설정 업데이트
        if (data.type === 'session.created' && !sessionConfigured) {
          console.log('Session created, sending configuration...');
          
          const sessionUpdate = {
            type: 'session.update',
            session: {
              modalities: ['text', 'audio'],
              instructions: '당신은 한국어로 대화하는 의료 진료 보조 AI입니다. 환자의 증상을 듣고 간단히 응답해주세요. 친근하고 전문적으로 대화하되, 진단은 하지 말고 증상 청취에 집중해주세요.',
              voice: 'alloy',
              input_audio_format: 'pcm16',
              output_audio_format: 'pcm16',
              input_audio_transcription: {
                model: 'whisper-1'
              },
              turn_detection: {
                type: 'server_vad',
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 1000
              },
              temperature: 0.7,
              max_response_output_tokens: 500
            }
          };
          
          openAISocket?.send(JSON.stringify(sessionUpdate));
          sessionConfigured = true;
        }

        // 클라이언트로 메시지 전달
        socket.send(JSON.stringify(data));
      };

      openAISocket.onclose = (event) => {
        console.log('OpenAI WebSocket closed:', event.code, event.reason);
        socket.close(event.code, event.reason);
      };

      openAISocket.onerror = (error) => {
        console.error('OpenAI WebSocket error:', error);
        socket.close(4001, 'OpenAI connection error');
      };

    } catch (error) {
      console.error('Failed to connect to OpenAI:', error);
      socket.close(4002, 'Failed to connect to OpenAI');
    }
  };

  socket.onmessage = (event) => {
    if (openAISocket && openAISocket.readyState === WebSocket.OPEN) {
      console.log('Forwarding client message to OpenAI');
      openAISocket.send(event.data);
    } else {
      console.log('OpenAI socket not ready, dropping message');
    }
  };

  socket.onclose = (event) => {
    console.log('Client WebSocket closed:', event.code, event.reason);
    if (openAISocket) {
      openAISocket.close();
    }
  };

  socket.onerror = (error) => {
    console.error('Client WebSocket error:', error);
    if (openAISocket) {
      openAISocket.close();
    }
  };

  return response;
});