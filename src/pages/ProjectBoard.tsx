import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import { DndContext, DragEndEvent, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Task {
  id: string;
  title: string;
  description: string;
  deadline: string;
  assignee: string;
  tag: string;
  statusId: string;
  projectId: string;
  comments: Comment[];
  completed: boolean;
}

interface Comment {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

interface Status {
  id: string;
  name: string;
  projectId: string;
}

const SortableTaskCard = ({ task, onClick, onToggleComplete }: { task: Task; onClick: () => void; onToggleComplete: (e: React.MouseEvent) => void }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isOverdue = task.deadline && new Date(task.deadline) < new Date();

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className="cursor-pointer hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-3 mb-2">
            <div onClick={onToggleComplete} className="mt-1">
              <Checkbox checked={task.completed} />
            </div>
            <div className="flex-1" onClick={onClick}>
              <h4 className={`font-semibold mb-2 ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                {task.title}
              </h4>
            </div>
          </div>
          <div onClick={onClick} className="space-y-2">
            {task.deadline && (
              <div className={`flex items-center gap-2 text-sm ${isOverdue && !task.completed ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                <Icon name="Calendar" className="h-4 w-4" />
                <span>{new Date(task.deadline).toLocaleDateString('ru-RU')}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon name="User" className="h-4 w-4" />
              <span>{task.assignee || 'Не назначен'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const ProjectBoard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<any>(null);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [newStatusName, setNewStatusName] = useState('');
  const [newComment, setNewComment] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    deadline: '',
    assignee: '',
    tag: '',
    statusId: '',
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = () => {
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    const foundProject = projects.find((p: any) => p.id === id);
    setProject(foundProject);

    const allStatuses = JSON.parse(localStorage.getItem('statuses') || '[]');
    const projectStatuses = allStatuses.filter((s: Status) => s.projectId === id);
    setStatuses(projectStatuses);

    const allTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const projectTasks = allTasks.filter((t: Task) => t.projectId === id);
    setTasks(projectTasks);

    const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
    setUsers([{ login: 'admin', name: 'Администратор' }, ...allUsers]);
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = active.id as string;
    const targetStatusId = over.id as string;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (task.statusId !== targetStatusId && statuses.some((s) => s.id === targetStatusId)) {
      const allTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
      const updatedTasks = allTasks.map((t: Task) =>
        t.id === taskId ? { ...t, statusId: targetStatusId } : t
      );
      localStorage.setItem('tasks', JSON.stringify(updatedTasks));
      loadData();
      toast({ title: 'Задача перемещена', description: 'Статус обновлен' });
    }
  };

  const handleToggleComplete = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const allTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const updatedTasks = allTasks.map((t: Task) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    localStorage.setItem('tasks', JSON.stringify(updatedTasks));
    loadData();
  };

  const handleCreateTask = (statusId: string) => {
    setTaskForm({ title: '', description: '', deadline: '', assignee: '', tag: '', statusId });
    setSelectedTask(null);
    setIsTaskDialogOpen(true);
  };

  const handleSaveTask = () => {
    if (!taskForm.title) {
      toast({ title: 'Ошибка', description: 'Введите название задачи', variant: 'destructive' });
      return;
    }

    const allTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    
    if (selectedTask) {
      const updatedTasks = allTasks.map((t: Task) =>
        t.id === selectedTask.id ? { ...t, ...taskForm } : t
      );
      localStorage.setItem('tasks', JSON.stringify(updatedTasks));
    } else {
      const newTask: Task = {
        id: Date.now().toString(),
        ...taskForm,
        projectId: id!,
        comments: [],
        completed: false,
      };
      const updatedTasks = [...allTasks, newTask];
      localStorage.setItem('tasks', JSON.stringify(updatedTasks));
    }

    loadData();
    setTaskForm({ title: '', description: '', deadline: '', assignee: '', tag: '', statusId: '' });
    setIsTaskDialogOpen(false);
    toast({ title: 'Готово!', description: selectedTask ? 'Задача обновлена' : 'Задача создана' });
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setTaskForm({
      title: task.title,
      description: task.description,
      deadline: task.deadline,
      assignee: task.assignee,
      tag: task.tag,
      statusId: task.statusId,
    });
    setIsTaskDialogOpen(true);
  };

  const handleAddComment = () => {
    if (!newComment || !selectedTask) return;

    const comment: Comment = {
      id: Date.now().toString(),
      text: newComment,
      author: currentUser.name,
      createdAt: new Date().toISOString(),
    };

    const allTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const updatedTasks = allTasks.map((t: Task) =>
      t.id === selectedTask.id ? { ...t, comments: [...(t.comments || []), comment] } : t
    );
    
    localStorage.setItem('tasks', JSON.stringify(updatedTasks));
    loadData();
    setSelectedTask({ ...selectedTask, comments: [...(selectedTask.comments || []), comment] });
    setNewComment('');
  };

  const handleAddStatus = () => {
    const newStatus: Status = {
      id: Date.now().toString(),
      name: 'Новый статус',
      projectId: id!,
    };
    const allStatuses = JSON.parse(localStorage.getItem('statuses') || '[]');
    const updatedStatuses = [...allStatuses, newStatus];
    localStorage.setItem('statuses', JSON.stringify(updatedStatuses));
    setStatuses([...statuses, newStatus]);
  };

  const handleRenameStatus = (statusId: string) => {
    if (!newStatusName) return;
    
    const allStatuses = JSON.parse(localStorage.getItem('statuses') || '[]');
    const updatedStatuses = allStatuses.map((s: Status) =>
      s.id === statusId ? { ...s, name: newStatusName } : s
    );
    localStorage.setItem('statuses', JSON.stringify(updatedStatuses));
    setStatuses(updatedStatuses.filter((s: Status) => s.projectId === id));
    setEditingStatusId(null);
    setNewStatusName('');
  };

  if (!project) return null;

  const activeTask = tasks.find((t) => t.id === activeId);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <Icon name="ArrowLeft" className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">{project.title}</h1>
          </div>
          <span className="text-sm text-muted-foreground">{currentUser.name}</span>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-6 overflow-x-auto pb-4">
            {statuses.map((status) => (
              <SortableContext key={status.id} items={tasks.filter((t) => t.statusId === status.id).map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <div id={status.id} className="min-w-[320px] flex-shrink-0">
                  <Card className="h-full">
                    <CardHeader className="pb-3">
                      {editingStatusId === status.id ? (
                        <div className="flex gap-2">
                          <Input
                            value={newStatusName}
                            onChange={(e) => setNewStatusName(e.target.value)}
                            onBlur={() => handleRenameStatus(status.id)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRenameStatus(status.id)}
                            autoFocus
                          />
                        </div>
                      ) : (
                        <CardTitle
                          className="cursor-pointer hover:text-primary transition-colors"
                          onClick={() => {
                            setEditingStatusId(status.id);
                            setNewStatusName(status.name);
                          }}
                        >
                          {status.name}
                        </CardTitle>
                      )}
                    </CardHeader>
                    <CardContent
                      className="space-y-3 min-h-[200px]"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {}}
                      data-status-id={status.id}
                    >
                      {tasks
                        .filter((task) => task.statusId === status.id)
                        .map((task) => (
                          <SortableTaskCard
                            key={task.id}
                            task={task}
                            onClick={() => handleTaskClick(task)}
                            onToggleComplete={(e) => handleToggleComplete(task.id, e)}
                          />
                        ))}
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => handleCreateTask(status.id)}
                      >
                        <Icon name="Plus" className="mr-2 h-4 w-4" />
                        Добавить задачу
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </SortableContext>
            ))}

            <div className="min-w-[320px] flex-shrink-0">
              <Button
                variant="outline"
                className="w-full h-full min-h-[200px] border-dashed"
                onClick={handleAddStatus}
              >
                <Icon name="Plus" className="mr-2 h-5 w-5" />
                Добавить колонку
              </Button>
            </div>
          </div>

          <DragOverlay>
            {activeTask ? (
              <Card className="w-[320px] opacity-90 rotate-3">
                <CardContent className="p-4">
                  <h4 className="font-semibold">{activeTask.title}</h4>
                </CardContent>
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTask ? 'Редактировать задачу' : 'Новая задача'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status">Статус</Label>
              <Select
                value={taskForm.statusId}
                onValueChange={(value) => setTaskForm({ ...taskForm, statusId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                      {status.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Название</Label>
              <Input
                id="title"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deadline">Срок</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={taskForm.deadline}
                  onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignee">Исполнитель</Label>
                <Select
                  value={taskForm.assignee}
                  onValueChange={(value) => setTaskForm({ ...taskForm, assignee: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.login} value={user.name}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tag">Тег</Label>
              <Input
                id="tag"
                value={taskForm.tag}
                onChange={(e) => setTaskForm({ ...taskForm, tag: e.target.value })}
                placeholder="frontend, backend..."
              />
            </div>

            {selectedTask && (
              <div className="space-y-3 pt-4 border-t">
                <Label>Комментарии</Label>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {selectedTask.comments?.map((comment) => (
                    <Card key={comment.id}>
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold text-sm">{comment.author}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleString('ru-RU')}
                          </span>
                        </div>
                        <p className="text-sm">{comment.text}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Добавить комментарий..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <Button onClick={handleAddComment}>
                    <Icon name="Send" className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <Button onClick={handleSaveTask} className="w-full">
              Сохранить
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectBoard;
