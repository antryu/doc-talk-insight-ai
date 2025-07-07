-- updated_at 자동 업데이트 함수 생성
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 의료법 조항 저장 테이블
CREATE TABLE public.medical_law_articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_number TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT, -- 예: 진료행위, 처방전, 의료기록 등
  keywords TEXT[], -- 검색용 키워드
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 진료 기록 테이블 (대화기록 저장)
CREATE TABLE public.patient_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  patient_name TEXT NOT NULL,
  patient_age TEXT NOT NULL,
  conversation_data JSONB NOT NULL, -- ConversationRecorder의 messages 저장
  medical_law_review JSONB, -- 의료법 검토 결과
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS 정책 설정
ALTER TABLE public.medical_law_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_records ENABLE ROW LEVEL SECURITY;

-- 의료법 조항은 모든 인증된 사용자가 조회 가능
CREATE POLICY "Authenticated users can view medical law articles" 
ON public.medical_law_articles 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 관리자만 의료법 조항 생성/수정 가능 (일단 모든 인증된 사용자로 설정)
CREATE POLICY "Authenticated users can manage medical law articles" 
ON public.medical_law_articles 
FOR ALL 
USING (auth.role() = 'authenticated');

-- 환자 기록은 본인만 접근 가능
CREATE POLICY "Users can view their own patient records" 
ON public.patient_records 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own patient records" 
ON public.patient_records 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own patient records" 
ON public.patient_records 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own patient records" 
ON public.patient_records 
FOR DELETE 
USING (auth.uid() = user_id);

-- Storage 버킷 생성 (의료법 PDF 파일용)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('medical-law-documents', 'medical-law-documents', false);

-- Storage 정책 생성
CREATE POLICY "Authenticated users can view medical law documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'medical-law-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload medical law documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'medical-law-documents' AND auth.role() = 'authenticated');

-- 자동 업데이트 타임스탬프 트리거
CREATE TRIGGER update_medical_law_articles_updated_at
BEFORE UPDATE ON public.medical_law_articles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_patient_records_updated_at
BEFORE UPDATE ON public.patient_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();