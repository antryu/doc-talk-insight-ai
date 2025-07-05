import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, FileText, CheckCircle, AlertCircle } from "lucide-react";

interface Message {
  id: string;
  speaker: 'doctor' | 'patient';
  content: string;
  timestamp: Date;
}

interface Diagnosis {
  disease: string;
  probability: number;
  symptoms: string[];
  recommendation: string;
}

interface DiagnosisAnalysisProps {
  messages: Message[];
  patientInfo: { name: string; age: string };
  onSaveDiagnosis: (diagnoses: Diagnosis[]) => void;
}

export default function DiagnosisAnalysis({ messages, patientInfo, onSaveDiagnosis }: DiagnosisAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  const handleAnalyzeDiagnosis = async () => {
    setIsAnalyzing(true);
    
    // 시뮬레이션: 실제로는 GPT API를 사용하여 분석
    setTimeout(() => {
      const mockDiagnoses: Diagnosis[] = [
        {
          disease: "급성 인두염 (Acute Pharyngitis)",
          probability: 85,
          symptoms: ["인후통", "기침", "미열"],
          recommendation: "충분한 휴식과 수분 섭취, 필요시 진통제 복용"
        },
        {
          disease: "감기 (Common Cold)",
          probability: 70,
          symptoms: ["기침", "인후통", "코막힘 가능성"],
          recommendation: "대증 치료, 충분한 휴식"
        },
        {
          disease: "급성 기관지염 (Acute Bronchitis)",
          probability: 45,
          symptoms: ["지속적인 기침", "가래"],
          recommendation: "추가 검사 필요, 증상 모니터링"
        }
      ];
      
      setDiagnoses(mockDiagnoses);
      setIsAnalyzing(false);
      setAnalysisComplete(true);
    }, 3000);
  };

  const handleSaveResults = () => {
    onSaveDiagnosis(diagnoses);
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 80) return "bg-medical-success";
    if (probability >= 60) return "bg-medical-warning";
    return "bg-muted";
  };

  const getProbabilityIcon = (probability: number) => {
    if (probability >= 80) return <CheckCircle className="w-4 h-4" />;
    if (probability >= 60) return <AlertCircle className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* 환자 정보 및 대화 요약 */}
      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-medical-primary" />
            <span>AI 진단 보조 분석</span>
          </CardTitle>
          <CardDescription>
            환자 {patientInfo.name}({patientInfo.age}세)의 대화 내용을 바탕으로 예상 병명을 분석합니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-medical-light p-4 rounded-lg">
            <h4 className="font-medium text-foreground mb-2">대화 요약</h4>
            <p className="text-sm text-muted-foreground">
              총 {messages.length}개의 대화 기록을 분석하여 증상을 파악하고 가능한 진단을 제시합니다.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 분석 결과 */}
      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle>예상 병명 분석 결과</CardTitle>
          <CardDescription>
            AI가 분석한 상위 3개의 예상 진단입니다 (참고용으로만 활용하세요)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!analysisComplete ? (
            <div className="text-center py-8">
              {!isAnalyzing ? (
                <div className="space-y-4">
                  <div className="p-6 bg-medical-light rounded-lg">
                    <Brain className="w-12 h-12 text-medical-primary mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">
                      대화 내용을 분석하여 예상 병명을 도출합니다
                    </p>
                    <Button
                      onClick={handleAnalyzeDiagnosis}
                      className="bg-medical-primary hover:bg-medical-primary/90 text-white"
                    >
                      예상 병명 분석 시작
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="animate-spin w-8 h-8 border-4 border-medical-primary border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-muted-foreground">AI가 대화 내용을 분석하는 중입니다...</p>
                  <div className="bg-medical-light p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      • 증상 키워드 추출 중...<br/>
                      • 의학 데이터베이스 검색 중...<br/>
                      • 진단 확률 계산 중...
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <ScrollArea className="h-96">
                {diagnoses.map((diagnosis, index) => (
                  <Card key={index} className="mb-4 border border-border">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center space-x-2">
                          {getProbabilityIcon(diagnosis.probability)}
                          <span>{diagnosis.disease}</span>
                        </CardTitle>
                        <Badge 
                          className={`${getProbabilityColor(diagnosis.probability)} text-white`}
                        >
                          {diagnosis.probability}% 확률
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <h5 className="font-medium text-sm text-foreground mb-2">주요 증상</h5>
                        <div className="flex flex-wrap gap-2">
                          {diagnosis.symptoms.map((symptom, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {symptom}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h5 className="font-medium text-sm text-foreground mb-2">권장사항</h5>
                        <p className="text-sm text-muted-foreground bg-background p-3 rounded border">
                          {diagnosis.recommendation}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </ScrollArea>
              
              <div className="flex justify-center pt-4 border-t">
                <Button
                  onClick={handleSaveResults}
                  className="bg-medical-success hover:bg-medical-success/90 text-white px-6"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  진단 결과 저장
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}