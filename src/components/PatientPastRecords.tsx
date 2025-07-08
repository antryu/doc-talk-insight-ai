import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Calendar, FileText, Clock, ChevronRight, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

type PatientRecord = Tables<'patient_records'>;

interface PatientPastRecordsProps {
  patientName: string;
  currentRecordId?: string;
}

// 이름과 나이가 모두 동일한 기록들만 보여주는 함수
function getRecordsWithSameNameAndAge(records: PatientRecord[], currentPatientName: string): PatientRecord[] {
  // 현재 환자와 이름이 같은 기록들만 필터링
  const sameNameRecords = records.filter(record => record.patient_name === currentPatientName);
  
  if (sameNameRecords.length === 0) return [];
  
  // 현재 환자의 나이를 찾기 위해 가장 최근 기록 사용
  const currentPatientAge = sameNameRecords[0].patient_age;
  
  // 이름과 나이가 모두 동일한 기록들만 필터링
  const sameNameAndAgeRecords = sameNameRecords.filter(record => 
    record.patient_name === currentPatientName && record.patient_age === currentPatientAge
  );
  
  // 10분 이내 중복 제거 (기존 로직 유지)
  const grouped = new Map<string, PatientRecord[]>();
  
  sameNameAndAgeRecords.forEach(record => {
    const date = new Date(record.created_at);
    const tenMinuteInterval = Math.floor(date.getTime() / (10 * 60 * 1000));
    const key = `${record.patient_name}-${record.patient_age}-${tenMinuteInterval}`;
    
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(record);
  });
  
  // 각 그룹에서 가장 최근 기록만 선택
  const uniqueRecords: PatientRecord[] = [];
  grouped.forEach(group => {
    const latest = group.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    uniqueRecords.push(latest);
  });
  
  return uniqueRecords.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export default function PatientPastRecords({ patientName, currentRecordId }: PatientPastRecordsProps) {
  const [pastRecords, setPastRecords] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const loadPatientHistory = useCallback(async () => {
    if (!user) return;
    
    console.log('=== loadPatientHistory 함수 호출 ===');
    console.log('환자명:', patientName);
    console.log('현재 기록 ID:', currentRecordId);
    console.log('사용자 ID:', user.id);
    
    setLoading(true);
    try {
      const query = supabase
        .from('patient_records')
        .select('*')
        .eq('user_id', user.id) // 현재 사용자의 기록만
        .eq('patient_name', patientName) // 같은 환자명
        .order('created_at', { ascending: false });
      
      // 현재 진료 기록이 있고 유효한 UUID인 경우에만 제외
      if (currentRecordId && currentRecordId.trim() !== '') {
        console.log('현재 진료 기록 제외:', currentRecordId);
        query.neq('id', currentRecordId);
      }
      
      const { data: records, error } = await query;

      console.log('조회 결과:', records);
      console.log('조회 오류:', error);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // 중복 기록 제거 (같은 날짜/시간대의 유사한 기록들)
      const uniqueRecords = records ? getRecordsWithSameNameAndAge(records, patientName) : [];
      setPastRecords(uniqueRecords);
      console.log('과거 기록 개수:', uniqueRecords.length);
      console.log('기록 ID들:', uniqueRecords.map(r => r.id));
    } catch (error) {
      console.error('Failed to load patient history:', error);
    } finally {
      setLoading(false);
    }
  }, [user, patientName, currentRecordId]);

  useEffect(() => {
    if (user && patientName) {
      console.log('=== useEffect 실행 ===', { patientName, currentRecordId, userId: user.id });
      loadPatientHistory();
    }
  }, [loadPatientHistory]); // loadPatientHistory를 의존성에 추가

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="w-5 h-5 text-medical-primary" />
            <span>{patientName} 환자의 과거 기록</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-medical-primary border-t-transparent rounded-full"></div>
            <span className="ml-2 text-muted-foreground">기록을 불러오는 중...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="w-5 h-5 text-medical-primary" />
          <span>{patientName} 환자의 과거 기록</span>
          <Badge variant="secondary" className="ml-auto">
            {pastRecords.length}건
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pastRecords.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">과거 기록이 없습니다</h3>
            <p className="text-muted-foreground">
              {patientName} 환자는 신규 환자로 과거 진료 기록이 존재하지 않습니다.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {pastRecords.map((record, index) => (
                <div key={record.id} className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Calendar className="w-4 h-4 text-medical-primary" />
                        <span className="text-sm font-medium">
                          {new Date(record.created_at).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            weekday: 'short'
                          })}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          #{pastRecords.length - index}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(record.created_at).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <FileText className="w-3 h-3" />
                          <span>
                            {record.conversation_data && Array.isArray(record.conversation_data) 
                              ? `${record.conversation_data.length}개 음성기록`
                              : '음성기록 없음'
                            }
                          </span>
                        </div>
                      </div>

                      {/* 의료법 검토 상태 */}
                      <div className="flex items-center space-x-2 mb-2">
                        {record.medical_law_review ? (
                          <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
                            의료법 검토 완료
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            의료법 검토 미완료
                          </Badge>
                        )}
                      </div>

                      {/* 대화 내용 미리보기 */}
                      {record.conversation_data && Array.isArray(record.conversation_data) && record.conversation_data.length > 0 && (
                        <div className="mt-2 p-2 bg-muted/30 rounded text-xs text-muted-foreground">
                          <p className="line-clamp-2">
                            {(() => {
                              const firstMessage = record.conversation_data[0] as any;
                              const content = firstMessage?.content || '내용 없음';
                              return content.length > 100 ? `${content.substring(0, 100)}...` : content;
                            })()}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <Link to={`/patient-record/${record.id}`}>
                      <Button variant="ghost" size="icon" className="flex-shrink-0">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}