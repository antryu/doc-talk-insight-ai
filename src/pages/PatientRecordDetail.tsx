import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, MessageSquare, Brain, Calendar, CheckCircle, AlertCircle, FileText } from "lucide-react";
import { db, type PatientRecord } from "@/lib/indexedDB";

export default function PatientRecordDetail() {
  const { recordId } = useParams<{ recordId: string }>();
  const [record, setRecord] = useState<PatientRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatientRecord();
  }, [recordId]);

  const loadPatientRecord = async () => {
    if (!recordId) return;
    
    try {
      const patientRecord = await db.getPatientRecord(recordId);
      setRecord(patientRecord);
    } catch (error) {
      console.error('Failed to load patient record:', error);
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-medical-light to-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-medical-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">환자 기록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-medical-light to-background flex items-center justify-center">
        <Card className="text-center">
          <CardContent className="py-12">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">기록을 찾을 수 없습니다</h3>
            <p className="text-muted-foreground mb-6">
              요청하신 환자 기록이 존재하지 않습니다
            </p>
            <Link to="/patient-history">
              <Button variant="outline">
                기록 목록으로 돌아가기
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-light to-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Link to="/patient-history">
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-full bg-medical-light">
                <User className="w-5 h-5 text-medical-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{record.patient_name}</h1>
                <p className="text-sm text-muted-foreground">
                  {record.patient_age}세 · {new Date(record.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
        {/* 음성인식 대화 기록 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-medical-primary" />
              <span>음성인식 대화 기록</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {record.conversation.length > 0 ? (
              <div className="space-y-4">
                {record.conversation.map((message, index) => (
                  <div key={message.id} className="p-4 rounded-lg bg-medical-light/50 border">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-medical-primary">
                        #{index + 1} 음성인식 결과
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  </div>
                ))}
                <div className="mt-4 pt-3 border-t text-sm text-muted-foreground text-center">
                  총 {record.conversation.length}개의 음성인식 결과가 기록되었습니다.
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">음성인식 결과가 없습니다.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI 진단 분석 결과 */}
        {record.diagnoses && record.diagnoses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="w-5 h-5 text-medical-primary" />
                <span>AI 진단 분석 결과</span>
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                분석 일시: {new Date(record.diagnoses[0].analyzed_at).toLocaleString()}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {record.diagnoses.map((diagnosis, index) => (
                  <Card key={index} className="border border-border">
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
              </div>
            </CardContent>
          </Card>
        )}

        {/* 기록 요약 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-medical-primary" />
              <span>기록 요약</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-medium text-sm text-foreground mb-1">환자명</p>
                <p className="text-sm text-muted-foreground">{record.patient_name}</p>
              </div>
              <div>
                <p className="font-medium text-sm text-foreground mb-1">나이</p>
                <p className="text-sm text-muted-foreground">{record.patient_age}세</p>
              </div>
              <div>
                <p className="font-medium text-sm text-foreground mb-1">진료 일시</p>
                <p className="text-sm text-muted-foreground">{new Date(record.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="font-medium text-sm text-foreground mb-1">최종 수정</p>
                <p className="text-sm text-muted-foreground">{new Date(record.updated_at).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}