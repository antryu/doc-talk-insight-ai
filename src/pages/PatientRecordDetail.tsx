import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, MessageSquare, Brain, Calendar, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type PatientRecord = Tables<'patient_records'>;

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
      const { data: patientRecord, error } = await supabase
        .from('patient_records')
        .select('*')
        .eq('id', recordId)
        .single();

      if (error) throw error;
      
      if (patientRecord) {
        setRecord(patientRecord);
      }
    } catch (error) {
      console.error('Failed to load patient record:', error);
    } finally {
      setLoading(false);
    }
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
            {record.conversation_data && Array.isArray(record.conversation_data) && record.conversation_data.length > 0 ? (
              <div className="space-y-4">
                {record.conversation_data.map((message: any, index) => (
                  <div key={message.id || index} className="p-4 rounded-lg bg-medical-light/50 border">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium text-medical-primary">
                        #{index + 1} 음성인식 결과
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : ''}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  </div>
                ))}
                <div className="mt-4 pt-3 border-t text-sm text-muted-foreground text-center">
                  총 {record.conversation_data.length}개의 음성인식 결과가 기록되었습니다.
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

        {/* 의료법 검토 결과 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-medical-primary" />
              <span>의료법 검토 결과</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {record.medical_law_review ? (
              <MedicalLawReviewDisplay data={record.medical_law_review} />
            ) : (
              <div className="text-center py-8">
                <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">의료법 검토 결과가 없습니다.</p>
                <p className="text-sm text-muted-foreground mt-1">음성인식 완료 후 의료법 검토를 진행해주세요.</p>
              </div>
            )}
          </CardContent>
        </Card>

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

// 의료법 검토 결과 표시 컴포넌트
interface MedicalLawReviewDisplayProps {
  data: any;
}

function MedicalLawReviewDisplay({ data }: MedicalLawReviewDisplayProps) {
  let reviewData;
  try {
    reviewData = typeof data === 'string' ? JSON.parse(data) : data;
  } catch (error) {
    reviewData = data;
  }

  // rawAnalysis에서 실제 분석 내용 추출
  let analysisData = null;
  if (reviewData?.rawAnalysis) {
    try {
      // ```json과 ``` 태그 제거 후 파싱
      const cleanJson = reviewData.rawAnalysis.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      analysisData = JSON.parse(cleanJson);
    } catch (error) {
      console.error('Failed to parse rawAnalysis:', error);
    }
  }

  const getComplianceStatus = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'compliant':
      case '준수':
        return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50', label: '준수' };
      case 'warning':
      case '주의':
        return { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-50', label: '주의' };
      case 'violation':
      case '위반':
        return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50', label: '위반' };
      default:
        return { icon: AlertTriangle, color: 'text-gray-500', bg: 'bg-gray-50', label: '미확인' };
    }
  };

  return (
    <div className="space-y-6">
      {/* 검토 기본 정보 */}
      {reviewData?.reviewDate && (
        <div className="bg-medical-light/20 border rounded-lg p-4">
          <h3 className="font-semibold text-foreground mb-2">검토 정보</h3>
          <div className="text-sm text-muted-foreground">
            <p>검토 일시: {new Date(reviewData.reviewDate).toLocaleString()}</p>
            {reviewData.conversationSummary && (
              <p>대화 요약: {reviewData.conversationSummary.messageCount}개 메시지, {reviewData.conversationSummary.textLength}자</p>
            )}
          </div>
        </div>
      )}

      {analysisData ? (
        <>
          {/* 법적 준수 상태 */}
          {analysisData.compliance && (
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">법적 준수 상태</h3>
              <div className="flex items-start gap-3">
                {(() => {
                  const compliance = getComplianceStatus(analysisData.compliance.status);
                  const Icon = compliance.icon;
                  return (
                    <>
                      <div className={`p-2 rounded-full ${compliance.bg} flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${compliance.color}`} />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{compliance.label}</p>
                        {analysisData.compliance.details && (
                          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                            {analysisData.compliance.details}
                          </p>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* 위험 요소 */}
          {analysisData.risks && Array.isArray(analysisData.risks) && analysisData.risks.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">위험 요소</h3>
              <div className="space-y-2">
                {analysisData.risks.map((risk: string, index: number) => (
                  <div key={index} className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700 leading-relaxed">{risk}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 권장 사항 */}
          {analysisData.recommendations && Array.isArray(analysisData.recommendations) && analysisData.recommendations.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">권장 사항</h3>
              <div className="space-y-2">
                {analysisData.recommendations.map((recommendation: string, index: number) => (
                  <div key={index} className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-blue-700 leading-relaxed">{recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 기록 관련 주의사항 */}
          {analysisData.recordingNotes && Array.isArray(analysisData.recordingNotes) && analysisData.recordingNotes.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">기록 관련 주의사항</h3>
              <div className="space-y-2">
                {analysisData.recordingNotes.map((note: string, index: number) => (
                  <div key={index} className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <MessageSquare className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-yellow-700 leading-relaxed">{note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 의료 행위 */}
          {analysisData.medicalActs && Array.isArray(analysisData.medicalActs) && analysisData.medicalActs.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">확인된 의료 행위</h3>
              <div className="space-y-2">
                {analysisData.medicalActs.map((act: any, index: number) => (
                  <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-700 leading-relaxed">
                      {typeof act === 'string' ? act : JSON.stringify(act)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-background border rounded-lg p-4">
          <h3 className="font-semibold text-foreground mb-3">원본 검토 데이터</h3>
          <pre className="text-sm whitespace-pre-wrap text-muted-foreground">
            {JSON.stringify(reviewData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}