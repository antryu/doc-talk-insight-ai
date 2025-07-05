
import { convertSpeechToText } from '@/services/naverClovaService';

export async function handleVoiceToText(formData: FormData) {
  try {
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      throw new Error('오디오 파일이 없습니다.');
    }

    const result = await convertSpeechToText(audioFile);
    
    return {
      text: result.text,
      confidence: result.confidence
    };
  } catch (error) {
    console.error('Voice to text conversion error:', error);
    throw error;
  }
}
