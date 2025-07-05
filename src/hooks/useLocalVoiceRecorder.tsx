import { useState, useRef, useCallback } from 'react';
import { db } from '@/lib/indexedDB';
import { useAuth } from '@/contexts/LocalAuthContext';

interface UseVoiceRecorderProps {
  onTranscription: (text: string) => void;
  onError: (error: string) => void;
}

export const useLocalVoiceRecorder = ({ onTranscription, onError }: UseVoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { user } = useAuth();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        
        // 스트림 정리
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000); // 1초마다 데이터 수집
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      onError('마이크 접근 권한이 필요합니다.');
    }
  }, [onTranscription, onError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      // 사용자 설정에서 OpenAI API 키 가져오기
      if (!user) {
        throw new Error('로그인이 필요합니다.');
      }

      const settings = await db.getSettings(user.id);
      const openaiApiKey = settings?.openai_api_key;

      if (!openaiApiKey) {
        throw new Error('OpenAI API 키가 설정되지 않았습니다. 설정에서 API 키를 입력해주세요.');
      }

      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', 'ko');

      console.log('Calling OpenAI Whisper API directly...');
      
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', errorText);
        throw new Error('음성 변환에 실패했습니다.');
      }

      const result = await response.json();
      console.log('Voice-to-text result:', result);
      
      if (result.text && result.text.trim()) {
        onTranscription(result.text.trim());
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      onError(error instanceof Error ? error.message : '음성 변환 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isRecording,
    isProcessing,
    startRecording,
    stopRecording,
  };
};