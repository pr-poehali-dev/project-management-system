import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface Project {
  id: string;
  title: string;
  description: string;
  createdAt: string;
}

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

  useEffect(() => {
    const savedProjects = JSON.parse(localStorage.getItem('projects') || '[]');
    setProjects(savedProjects);
  }, []);

  const handleCreateProject = () => {
    if (!title) {
      toast({ title: 'Ошибка', description: 'Введите название проекта', variant: 'destructive' });
      return;
    }

    const newProject: Project = {
      id: Date.now().toString(),
      title,
      description,
      createdAt: new Date().toISOString(),
    };

    const updatedProjects = [...projects, newProject];
    setProjects(updatedProjects);
    localStorage.setItem('projects', JSON.stringify(updatedProjects));
    
    const defaultStatuses = [
      { id: '1', name: 'К выполнению', projectId: newProject.id },
      { id: '2', name: 'В работе', projectId: newProject.id },
      { id: '3', name: 'Выполнено', projectId: newProject.id },
    ];
    const existingStatuses = JSON.parse(localStorage.getItem('statuses') || '[]');
    localStorage.setItem('statuses', JSON.stringify([...existingStatuses, ...defaultStatuses]));

    setTitle('');
    setDescription('');
    setOpen(false);
    toast({ title: 'Проект создан!', description: 'Новый проект успешно добавлен' });
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Проекты</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{currentUser.name}</span>
            {currentUser.role === 'admin' && (
              <Button variant="outline" onClick={() => navigate('/admin')}>
                <Icon name="Settings" className="mr-2 h-4 w-4" />
                Администрирование
              </Button>
            )}
            <Button variant="ghost" onClick={handleLogout}>
              <Icon name="LogOut" className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">Мои проекты</h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Icon name="Plus" className="mr-2 h-4 w-4" />
                Создать проект
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Новый проект</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Название</Label>
                  <Input
                    id="title"
                    placeholder="Название проекта"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Описание</Label>
                  <Input
                    id="description"
                    placeholder="Описание проекта"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <Button onClick={handleCreateProject} className="w-full">
                  Создать
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-16">
            <Icon name="FolderOpen" className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">Нет проектов</p>
            <p className="text-muted-foreground text-sm">Создайте свой первый проект</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/project/${project.id}`)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon name="Folder" className="h-5 w-5 text-primary" />
                    {project.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {project.description || 'Без описания'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-4">
                    {new Date(project.createdAt).toLocaleDateString('ru-RU')}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Projects;
