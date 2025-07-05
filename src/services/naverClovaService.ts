
const NAVER_CLOVA_CONFIG = {
  clientId: 'h374bmg0e8',
  clientSecret: 'dNSrjVkugEORDdrMQ2Z4TveQPkri2UdRFOhyoeqE',
  invokeUrl: 'https://naveropenapi.apigw.ntruss.com/recog/v1/stt',
};

export interface VoiceRecognitionResult {
  text: string;
  confidence?: number;
}

export const convertSpeechToText = async (audioBlob: Blob): Promise<VoiceRecognitionResult> => {
  try {
    // 오디오를 PCM 포맷으로 변환 (실제 구현에서는 Web Audio API 사용)
    const arrayBuffer = await audioBlob.arrayBuffer();
    
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
    
    if (result.text) {
      return {
        text: result.text,
        confidence: result.confidence || 0.9
      };
    } else {
      throw new Error('음성 인식 결과를 받을 수 없습니다.');
    }
  } catch (error) {
    console.error('Error in convertSpeechToText:', error);
    throw error;
  }
};

// 음성 처리를 위한 유틸리티 함수
export const processAudioForClova = async (audioBlob: Blob): Promise<ArrayBuffer> => {
  // WebM을 PCM으로 변환하는 로직
  // 실제 구현에서는 Web Audio API를 사용하여 적절한 포맷으로 변환
  return await audioBlob.arrayBuffer();
};
