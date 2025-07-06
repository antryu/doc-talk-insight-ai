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
  
  let openAISocket: WebSocket | null = null;
  let connectionAttempts = 0;
  const maxRetries = 3;

  const connectToOpenAI = async () => {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY not found');
      socket.close(4000, 'Server configuration error');
      return;
    }

    connectionAttempts++;
    console.log(`OpenAI connection attempt ${connectionAttempts}/${maxRetries}`);

    try {
      // Use a more direct approach - connect without subprotocols first
      const wsUrl = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01`;
      
      // Create WebSocket with manual header injection attempt  
      openAISocket = new WebSocket(wsUrl);

      openAISocket.onopen = () => {
        console.log('OpenAI WebSocket connected - sending auth');
        
        // Send authentication as first message after connection
        const authMessage = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: '당신은 한국어로 대화하는 의료 진료 보조 AI입니다. 환자의 증상을 듣고 간단히 응답해주세요.',
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: { model: 'whisper-1' },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 1000
            },
            temperature: 0.7
          },
          authorization: `Bearer ${openAIApiKey}`,
          'openai-beta': 'realtime=v1'
        };

        if (openAISocket?.readyState === WebSocket.OPEN) {
          openAISocket.send(JSON.stringify(authMessage));
          console.log('Auth message sent to OpenAI');
        }
      };

      openAISocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('OpenAI message:', data.type);
        
        // Handle authentication errors by retrying with different method
        if (data.type === 'error' && data.error?.code === 'missing_beta_header') {
          console.log('Auth failed, trying alternative method...');
          openAISocket?.close();
          
          if (connectionAttempts < maxRetries) {
            setTimeout(() => connectWithAlternativeMethod(), 1000);
          } else {
            socket.close(4003, 'Authentication failed after retries');
          }
          return;
        }

        // Forward successful messages to client
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify(data));
        }
      };

      openAISocket.onclose = (event) => {
        console.log(`OpenAI closed: ${event.code} - ${event.reason}`);
        if (socket.readyState === WebSocket.OPEN) {
          socket.close(event.code, event.reason);
        }
      };

      openAISocket.onerror = (error) => {
        console.error('OpenAI WebSocket error:', error);
        if (connectionAttempts < maxRetries) {
          setTimeout(() => connectWithAlternativeMethod(), 2000);
        } else {
          socket.close(4001, 'Connection failed');
        }
      };

    } catch (error) {
      console.error(`Connection attempt ${connectionAttempts} failed:`, error);
      if (connectionAttempts < maxRetries) {
        setTimeout(() => connectWithAlternativeMethod(), 2000);
      } else {
        socket.close(4002, 'Max retries exceeded');
      }
    }
  };

  const connectWithAlternativeMethod = async () => {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    console.log('Trying alternative connection method...');

    try {
      // Try the documented subprotocol method
      const wsUrl = `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01`;
      openAISocket = new WebSocket(wsUrl, [`realtime`, `openai-insecure-api-key.${openAIApiKey}`]);

      openAISocket.onopen = () => {
        console.log('Alternative method connected successfully');
      };

      openAISocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Alternative method - OpenAI message:', data.type);

        if (data.type === 'session.created') {
          // Send session update after session is created
          const sessionUpdate = {
            type: 'session.update',
            session: {
              modalities: ['text', 'audio'],
              instructions: '당신은 한국어로 대화하는 의료 진료 보조 AI입니다.',
              voice: 'alloy',
              input_audio_format: 'pcm16',
              output_audio_format: 'pcm16',
              input_audio_transcription: { model: 'whisper-1' },
              turn_detection: {
                type: 'server_vad',
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 1000
              }
            }
          };
          openAISocket?.send(JSON.stringify(sessionUpdate));
        }

        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify(data));
        }
      };

      openAISocket.onclose = (event) => {
        console.log(`Alternative method closed: ${event.code}`);
        if (socket.readyState === WebSocket.OPEN) {
          socket.close(event.code, event.reason);
        }
      };

      openAISocket.onerror = (error) => {
        console.error('Alternative method error:', error);
        socket.close(4004, 'Alternative method failed');
      };

    } catch (error) {
      console.error('Alternative method failed:', error);
      socket.close(4005, 'All connection methods failed');
    }
  };

  socket.onopen = () => {
    console.log('Client connected, initializing OpenAI connection...');
    connectToOpenAI();
  };

  socket.onmessage = (event) => {
    if (openAISocket?.readyState === WebSocket.OPEN) {
      openAISocket.send(event.data);
    }
  };

  socket.onclose = () => {
    console.log('Client disconnected');
    openAISocket?.close();
  };

  return response;
});