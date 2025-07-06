import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  content: string;
  timestamp: Date;
  type: 'user' | 'assistant';
}

interface UseSimpleVoiceChatProps {
  onTranscription: (text: string) => void;
  onError: (error: string) => void;
}

export const useSimpleVoiceChat = ({ onTranscription, onError }: UseSimpleVoiceChatProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      console.log('Starting simple voice recording...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        console.log('Recording stopped, processing audio...');
        await processAudio();
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      console.log('Recording started successfully');
    } catch (error) {
      console.error('Failed to start recording:', error);
      onError('녹음 시작 실패: 마이크 권한을 확인해주세요');
    }
  }, [onError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      console.log('Stopping recording...');
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
      
      // Stop all tracks
      mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
    }
  }, [isRecording]);

  const processAudio = async () => {
    try {
      if (audioChunksRef.current.length === 0) {
        throw new Error('녹음된 오디오가 없습니다');
      }

      console.log('Processing audio chunks:', audioChunksRef.current.length);
      
      // Create audio blob
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      console.log('Audio blob created, size:', audioBlob.size);
      
      if (audioBlob.size === 0) {
        throw new Error('녹음된 오디오가 비어있습니다');
      }

      // Convert to base64 safely (avoid stack overflow for large files)
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = '';
      const chunkSize = 0x8000; // 32KB chunks to avoid stack overflow
      
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      
      const base64Audio = btoa(binary);
      
      console.log('Audio converted to base64, calling voice-to-text function...');

      // Call voice-to-text function
      const { data: transcriptionData, error: transcriptionError } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: base64Audio }
      });

      if (transcriptionError) {
        throw new Error(`음성 인식 오류: ${transcriptionError.message}`);
      }

      const userText = transcriptionData.text?.trim();
      if (!userText) {
        throw new Error('음성에서 텍스트를 추출할 수 없습니다');
      }

      console.log('Transcription successful:', userText);
      onTranscription(userText);

      // Get AI response (for real-time conversation only, not recorded)
      const { data: aiResponseData, error: aiError } = await supabase.functions.invoke('simple-chat', {
        body: { 
          text: userText
        }
      });

      if (aiError) {
        console.log('AI 응답 오류:', aiError.message);
        // AI 응답 실패해도 녹음은 정상 진행
        return;
      }

      const aiResponse = aiResponseData.response?.trim();
      if (aiResponse) {
        console.log('AI response received (not recorded):', aiResponse);
        // AI 응답은 콘솔에만 표시하고 기록에는 저장하지 않음
      }

    } catch (error) {
      console.error('Audio processing failed:', error);
      onError(error instanceof Error ? error.message : '음성 처리 중 오류가 발생했습니다');
    } finally {
      setIsProcessing(false);
      audioChunksRef.current = [];
    }
  };

  return {
    isRecording,
    isProcessing,
    messages,
    startRecording,
    stopRecording
  };
};