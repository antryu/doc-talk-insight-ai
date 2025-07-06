import { useState, useRef, useCallback, useEffect } from 'react';

interface Message {
  id: string;
  content: string;
  timestamp: Date;
  type: 'user' | 'assistant';
}

interface UseRealtimeVoiceChatProps {
  onTranscription: (text: string) => void;
  onError: (error: string) => void;
}

// Audio recording class
class AudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  constructor(private onAudioData: (audioData: Float32Array) => void) {}

  async start() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.audioContext = new AudioContext({
        sampleRate: 24000,
      });

      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
      
      this.processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        this.onAudioData(new Float32Array(inputData));
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }

  stop() {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Audio encoding function
const encodeAudioForAPI = (float32Array: Float32Array): string => {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  const uint8Array = new Uint8Array(int16Array.buffer);
  let binary = '';
  const chunkSize = 0x8000;
  
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(binary);
};

// Audio playback queue
class AudioQueue {
  private queue: Uint8Array[] = [];
  private isPlaying = false;
  private audioContext: AudioContext;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  async addToQueue(audioData: Uint8Array) {
    console.log('Adding audio to queue, length:', audioData.length);
    this.queue.push(audioData);
    if (!this.isPlaying) {
      await this.playNext();
    }
  }

  private async playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioData = this.queue.shift()!;

    try {
      const wavData = this.createWavFromPCM(audioData);
      const audioBuffer = await this.audioContext.decodeAudioData(wavData.buffer);
      
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      source.onended = () => this.playNext();
      source.start(0);
    } catch (error) {
      console.error('Error playing audio:', error);
      this.playNext(); // Continue with next segment even if current fails
    }
  }

  private createWavFromPCM(pcmData: Uint8Array): Uint8Array {
    // Convert bytes to 16-bit samples
    const int16Data = new Int16Array(pcmData.length / 2);
    for (let i = 0; i < pcmData.length; i += 2) {
      int16Data[i / 2] = (pcmData[i + 1] << 8) | pcmData[i];
    }
    
    // Create WAV header
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);
    
    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    // WAV header parameters
    const sampleRate = 24000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const byteRate = sampleRate * blockAlign;

    // Write WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + int16Data.byteLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(view, 36, 'data');
    view.setUint32(40, int16Data.byteLength, true);

    // Combine header and data
    const wavArray = new Uint8Array(wavHeader.byteLength + int16Data.byteLength);
    wavArray.set(new Uint8Array(wavHeader), 0);
    wavArray.set(new Uint8Array(int16Data.buffer), wavHeader.byteLength);
    
    return wavArray;
  }
}

export const useRealtimeVoiceChat = ({ onTranscription, onError }: UseRealtimeVoiceChatProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioQueue | null>(null);
  const currentTranscriptRef = useRef<string>('');

  // Initialize audio context and queue
  useEffect(() => {
    const initAudio = async () => {
      try {
        audioContextRef.current = new AudioContext({ sampleRate: 24000 });
        audioQueueRef.current = new AudioQueue(audioContextRef.current);
        console.log('Audio system initialized');
      } catch (error) {
        console.error('Failed to initialize audio system:', error);
        onError('오디오 시스템 초기화 실패');
      }
    };

    initAudio();

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [onError]);

  const connectWebSocket = useCallback(() => {
    try {
      console.log('Connecting to realtime voice chat...');
      
      // Use the correct WebSocket URL for Supabase Edge Function
      wsRef.current = new WebSocket('wss://esnrwamfmjiwwftdiign.functions.supabase.co/realtime-voice-chat');

      wsRef.current.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
      };

      wsRef.current.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log('Received message type:', data.type);

        switch (data.type) {
          case 'session.created':
            console.log('Session created successfully');
            break;

          case 'session.updated':
            console.log('Session updated successfully');
            break;

          case 'input_audio_buffer.speech_started':
            console.log('Speech started detected');
            break;

          case 'input_audio_buffer.speech_stopped':
            console.log('Speech stopped detected');
            break;

          case 'conversation.item.input_audio_transcription.completed':
            console.log('Input transcription completed:', data.transcript);
            if (data.transcript) {
              currentTranscriptRef.current = data.transcript;
              onTranscription(data.transcript);
            }
            break;

          case 'response.audio.delta':
            // Play AI response audio
            if (data.delta && audioQueueRef.current) {
              const binaryString = atob(data.delta);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              await audioQueueRef.current.addToQueue(bytes);
            }
            break;

          case 'response.audio_transcript.delta':
            console.log('AI transcript delta:', data.delta);
            break;

          case 'response.done':
            console.log('Response completed');
            break;

          case 'error':
            console.error('OpenAI error:', data);
            onError(`음성 처리 오류: ${data.error?.message || '알 수 없는 오류'}`);
            break;

          default:
            console.log('Unhandled message type:', data.type);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
        onError('실시간 음성 연결 오류');
      };

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      onError('웹소켓 연결 실패');
    }
  }, [onError, onTranscription]);

  const startRecording = useCallback(async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      onError('웹소켓이 연결되지 않았습니다');
      return;
    }

    try {
      console.log('Starting audio recording...');
      
      const handleAudioData = (audioData: Float32Array) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const encodedAudio = encodeAudioForAPI(audioData);
          wsRef.current.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: encodedAudio
          }));
        }
      };

      audioRecorderRef.current = new AudioRecorder(handleAudioData);
      await audioRecorderRef.current.start();
      setIsRecording(true);
      
      console.log('Audio recording started successfully');
    } catch (error) {
      console.error('Failed to start recording:', error);
      onError('녹음 시작 실패: 마이크 권한을 확인해주세요');
    }
  }, [onError]);

  const stopRecording = useCallback(() => {
    console.log('Stopping audio recording...');
    
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stop();
      audioRecorderRef.current = null;
    }
    
    setIsRecording(false);
    console.log('Audio recording stopped');
  }, []);

  const disconnect = useCallback(() => {
    console.log('Disconnecting realtime voice chat...');
    
    if (isRecording) {
      stopRecording();
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
  }, [isRecording, stopRecording]);

  return {
    isConnected,
    isRecording,
    messages,
    connectWebSocket,
    startRecording,
    stopRecording,
    disconnect
  };
};