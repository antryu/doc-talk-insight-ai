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
    console.log('Non-WebSocket request received');
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  console.log('WebSocket upgrade request received');
  const { socket, response } = Deno.upgradeWebSocket(req);
  
  let openAISocket: WebSocket | null = null;
  let sessionConfigured = false;

  socket.onopen = async () => {
    console.log('Client WebSocket connected successfully');
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY environment variable not found');
      socket.close(4000, 'Server configuration error');
      return;
    }

    console.log('Attempting to connect to OpenAI Realtime API...');
    
    try {
      // OpenAI Realtime API requires specific WebSocket subprotocols
      // Use the correct format for authentication
      const wsUrl = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01`;
      const protocols = [
        'realtime',
        `openai-insecure-api-key.${openAIApiKey}`,
        'openai-beta.realtime=v1'
      ];
      
      openAISocket = new WebSocket(wsUrl, protocols);

      openAISocket.onopen = () => {
        console.log('OpenAI WebSocket connected successfully');
        
        // Send additional authentication if needed
        try {
          const authEvent = {
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
          
          openAISocket?.send(JSON.stringify(authEvent));
          console.log('Session configuration sent to OpenAI');
          sessionConfigured = true;
        } catch (error) {
          console.error('Failed to send session configuration:', error);
        }
      };

      openAISocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received from OpenAI:', data.type);

          // Forward all messages to client
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(data));
          }
        } catch (error) {
          console.error('Error processing OpenAI message:', error);
        }
      };

      openAISocket.onclose = (event) => {
        console.log('OpenAI WebSocket closed:', event.code, event.reason);
        if (socket.readyState === WebSocket.OPEN) {
          socket.close(event.code, event.reason);
        }
      };

      openAISocket.onerror = (error) => {
        console.error('OpenAI WebSocket error:', error);
        if (socket.readyState === WebSocket.OPEN) {
          socket.close(4001, 'OpenAI connection error');
        }
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