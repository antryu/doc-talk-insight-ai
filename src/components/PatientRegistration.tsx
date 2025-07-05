import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { User, UserCheck } from "lucide-react";

interface PatientRegistrationProps {
  onStartRecording: (patientInfo: { name: string; age: string; consent: boolean }) => void;
}

export default function PatientRegistration({ onStartRecording }: PatientRegistrationProps) {
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [consent, setConsent] = useState(false);

  const handleStartRecording = () => {
    if (patientName && patientAge && consent) {
      onStartRecording({
        name: patientName,
        age: patientAge,
        consent: consent
      });
    }
  };

  const isFormValid = patientName && patientAge && consent;

  return (
    <Card className="w-full max-w-lg mx-auto shadow-[var(--shadow-card)]">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-medical-light">
            <User className="w-8 h-8 text-medical-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl text-foreground">환자 정보 입력</CardTitle>
        <CardDescription className="text-muted-foreground">
          진료를 시작하기 위해 환자 정보를 입력해주세요
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="patient-name" className="text-sm font-medium text-foreground">
            환자 이름
          </Label>
          <Input
            id="patient-name"
            placeholder="환자 이름을 입력하세요"
            value={patientName}
            onChange={(e) => setPatientName(e.target.value)}
            className="bg-background border-border"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="patient-age" className="text-sm font-medium text-foreground">
            나이
          </Label>
          <Input
            id="patient-age"
            type="number"
            placeholder="나이를 입력하세요"
            value={patientAge}
            onChange={(e) => setPatientAge(e.target.value)}
            className="bg-background border-border"
          />
        </div>

        <div className="flex items-center space-x-3 p-4 bg-medical-light rounded-lg border border-border">
          <Checkbox
            id="consent"
            checked={consent}
            onCheckedChange={(checked) => setConsent(checked === true)}
            className="data-[state=checked]:bg-medical-primary data-[state=checked]:border-medical-primary"
          />
          <div className="flex-1">
            <Label htmlFor="consent" className="text-sm font-medium text-foreground cursor-pointer">
              개인정보 수집 및 대화 저장 동의
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              진료 목적의 대화 내용 저장에 동의합니다
            </p>
          </div>
          {consent && <UserCheck className="w-5 h-5 text-medical-success" />}
        </div>

        <Button
          onClick={handleStartRecording}
          disabled={!isFormValid}
          className="w-full bg-medical-primary hover:bg-medical-primary/90 text-white font-medium py-3"
        >
          진료 시작
        </Button>
      </CardContent>
    </Card>
  );
}