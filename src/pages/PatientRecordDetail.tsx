import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
                {record.conversation_data.map((message, index) => (
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
        {record.medical_law_review && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="w-5 h-5 text-medical-primary" />
                <span>의료법 검토 결과</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-background border rounded-lg p-4">
                  <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(record.medical_law_review, null, 2)}</pre>
                </div>
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