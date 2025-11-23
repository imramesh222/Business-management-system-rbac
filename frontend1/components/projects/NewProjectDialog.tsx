'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ProjectForm } from './ProjectForm';

interface NewProjectDialogProps {
  onProjectCreated?: () => void;
  organizationId: string;
  isSuperAdmin?: boolean;
  isOrgAdmin?: boolean;
  currentUser?: any;
}

export function NewProjectDialog({ 
  onProjectCreated, 
  organizationId, 
  isSuperAdmin = false, 
  isOrgAdmin = false,
  currentUser 
}: NewProjectDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
    if (onProjectCreated) {
      onProjectCreated();
    }
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Button clicked, opening dialog');
    setOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="default" 
          size="sm" 
          className="ml-2"
          onClick={handleButtonClick}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <ProjectForm 
            onSuccess={handleSuccess} 
            onCancel={() => setOpen(false)}
            organizationId={organizationId}
            isSuperAdmin={isSuperAdmin}
            isOrgAdmin={isOrgAdmin}
            currentUser={currentUser}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
