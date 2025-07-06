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

      // Convert to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
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
      onTranscription(`환자: ${userText}`);

      // Get AI response
      const { data: aiResponseData, error: aiError } = await supabase.functions.invoke('diagnosis-analysis', {
        body: { 
          text: `환자가 말한 내용: "${userText}". 이에 대해 의료진으로서 간단히 응답해주세요. 추가 질문이나 조언을 해주세요.`
        }
      });

      if (aiError) {
        throw new Error(`AI 응답 오류: ${aiError.message}`);
      }

      const aiResponse = aiResponseData.response?.trim();
      if (aiResponse) {
        console.log('AI response received:', aiResponse);
        onTranscription(`의료진: ${aiResponse}`);
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