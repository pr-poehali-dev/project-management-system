import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

const ProjectInvite = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = localStorage.getItem('currentUser');
    
    if (!currentUser) {
      localStorage.setItem('pendingProjectInvite', projectId!);
      navigate('/login');
      return;
    }

    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    const project = projects.find((p: any) => p.id === projectId);
    const user = JSON.parse(currentUser);

    if (!project) {
      navigate('/');
      return;
    }

    if (project.members?.includes(user.login)) {
      navigate(`/project/${projectId}`);
      return;
    }

    const updatedMembers = [...(project.members || []), user.login];
    const updatedProjects = projects.map((p: any) =>
      p.id === projectId ? { ...p, members: updatedMembers } : p
    );
    localStorage.setItem('projects', JSON.stringify(updatedProjects));
    navigate(`/project/${projectId}`);
  }, [projectId, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Присоединение к проекту</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Icon name="Loader2" className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-center">
            Перенаправление...
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectInvite;
