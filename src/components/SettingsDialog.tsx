import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface SettingsDialogProps {
  children: React.ReactNode;
}

export default function SettingsDialog({ children }: SettingsDialogProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            설정
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="profile">프로필</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-medical-light">
                  <User className="w-6 h-6 text-medical-primary" />
                </div>
                <div>
                  <h3 className="font-medium">{user?.user_metadata?.full_name || user?.email}</h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p>가입일: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}