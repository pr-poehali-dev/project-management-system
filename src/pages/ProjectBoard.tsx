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
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';
import { DndContext, DragEndEvent, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors, DragOverEvent, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Task {
  id: string;
  title: string;
  description: string;
  deadline: string;
  assignee: string;
  tags: string[];
  statusId: string;
  projectId: string;
  comments: CommentType[];
  completed: boolean;
}

interface CommentType {
  id: string;
  text: string;
  author: string;
  createdAt: string;
  parentId: string | null;
  replies?: CommentType[];
}

interface Status {
  id: string;
  name: string;
  projectId: string;
}

const CommentThread = ({ 
  comment, 
  onReply, 
  level = 0 
}: { 
  comment: CommentType; 
  onReply: (parentId: string) => void;
  level?: number;
}) => {
  return (
    <div className={`${level > 0 ? 'ml-6 mt-2' : ''}`}>
      <Card>
        <CardContent className="p-3">
          <div className="flex justify-between items-start mb-1">
            <span className="font-semibold text-sm">{comment.author}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(comment.createdAt).toLocaleString('ru-RU')}
            </span>
          </div>
          <p className="text-sm mb-2">{comment.text}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onReply(comment.id)}
            className="h-7 text-xs"
          >
            <Icon name="Reply" className="h-3 w-3 mr-1" />
            Ответить
          </Button>
        </CardContent>
      </Card>
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-2 mt-2">
          {comment.replies.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              onReply={onReply}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const DroppableColumn = ({ statusId, children, isOver }: { statusId: string; children: React.ReactNode; isOver: boolean }) => {
  const { setNodeRef } = useDroppable({
    id: statusId,
    data: {
      type: 'column',
      statusId
    }
  });

  return (
    <div
      ref={setNodeRef}
      data-droppable-id={statusId}
      className={`min-h-[200px] transition-all ${isOver ? 'ring-2 ring-primary ring-offset-2' : ''}`}
    >
      {children}
    </div>
  );
};

const SortableTaskCard = ({ 
  task, 
  onClick, 
  onToggleComplete 
}: { 
  task: Task; 
  onClick: () => void; 
  onToggleComplete: (e: React.MouseEvent) => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: task.id,
    data: {
      type: 'task',
      task
    }
  });

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
            {task.tags && task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {task.tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
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
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'completed'>('all');
  const [tagInput, setTagInput] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [filteredTags, setFilteredTags] = useState<string[]>([]);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    deadline: '',
    assignee: '',
    tags: [] as string[],
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

  useEffect(() => {
    const allProjectTags = JSON.parse(localStorage.getItem(`projectTags_${id}`) || '[]');
    setAvailableTags(allProjectTags);
  }, [id, tasks]);

  useEffect(() => {
    if (tagInput) {
      const filtered = availableTags.filter((tag) =>
        tag.toLowerCase().includes(tagInput.toLowerCase())
      );
      setFilteredTags(filtered);
    } else {
      setFilteredTags([]);
    }
  }, [tagInput, availableTags]);

  const loadData = () => {
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    const foundProject = projects.find((p: any) => p.id === id);
    setProject(foundProject);

    const allStatuses = JSON.parse(localStorage.getItem('statuses') || '[]');
    const projectStatuses = allStatuses.filter((s: Status) => s.projectId === id);
    setStatuses(projectStatuses);

    const allTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const projectTasks = allTasks.filter((t: Task) => t.projectId === id).map((t: Task) => ({
      ...t,
      tags: t.tags || [],
      completed: t.completed || false,
    }));
    setTasks(projectTasks);

    const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
    setUsers([{ login: 'admin', name: 'Администратор' }, ...allUsers]);

    const allProjectTags = new Set<string>();
    projectTasks.forEach((task: Task) => {
      task.tags?.forEach((tag) => allProjectTags.add(tag));
    });
    const projectTagsArray = Array.from(allProjectTags);
    localStorage.setItem(`projectTags_${id}`, JSON.stringify(projectTagsArray));
    setAvailableTags(projectTagsArray);
  };

  const buildCommentTree = (comments: CommentType[]): CommentType[] => {
    const commentMap = new Map<string, CommentType>();
    const roots: CommentType[] = [];

    comments.forEach((comment) => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    comments.forEach((comment) => {
      const node = commentMap.get(comment.id)!;
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId);
        if (parent) {
          parent.replies!.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over) {
      const overId = over.id as string;
      if (statuses.some((s) => s.id === overId)) {
        setOverId(overId);
      } else {
        const overTask = tasks.find((t) => t.id === overId);
        if (overTask) {
          setOverId(overTask.statusId);
        }
      }
    } else {
      setOverId(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);

    if (!over) return;

    const taskId = active.id as string;
    let targetStatusId = over.id as string;

    if (!statuses.some((s) => s.id === targetStatusId)) {
      const overTask = tasks.find((t) => t.id === targetStatusId);
      if (overTask) {
        targetStatusId = overTask.statusId;
      }
    }

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
    setTaskForm({ title: '', description: '', deadline: '', assignee: '', tags: [], statusId });
    setSelectedTask(null);
    setIsTaskDialogOpen(true);
  };

  const handleDeleteTask = () => {
    if (!selectedTask) return;

    const allTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const updatedTasks = allTasks.filter((t: Task) => t.id !== selectedTask.id);
    localStorage.setItem('tasks', JSON.stringify(updatedTasks));
    
    loadData();
    setIsTaskDialogOpen(false);
    setSelectedTask(null);
    toast({ title: 'Задача удалена', description: 'Задача успешно удалена' });
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

    const allProjectTags = new Set(availableTags);
    taskForm.tags.forEach((tag) => allProjectTags.add(tag));
    localStorage.setItem(`projectTags_${id}`, JSON.stringify(Array.from(allProjectTags)));

    loadData();
    setTaskForm({ title: '', description: '', deadline: '', assignee: '', tags: [], statusId: '' });
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
      tags: task.tags || [],
      statusId: task.statusId,
    });
    setIsTaskDialogOpen(true);
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !taskForm.tags.includes(trimmedTag)) {
      setTaskForm({ ...taskForm, tags: [...taskForm.tags, trimmedTag] });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTaskForm({ ...taskForm, tags: taskForm.tags.filter((tag) => tag !== tagToRemove) });
  };

  const handleAddComment = () => {
    if (!newComment || !selectedTask) return;

    const comment: CommentType = {
      id: Date.now().toString(),
      text: newComment,
      author: currentUser.name,
      createdAt: new Date().toISOString(),
      parentId: replyingTo,
    };

    const allTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
    const updatedTasks = allTasks.map((t: Task) =>
      t.id === selectedTask.id ? { ...t, comments: [...(t.comments || []), comment] } : t
    );
    
    localStorage.setItem('tasks', JSON.stringify(updatedTasks));
    loadData();
    setSelectedTask({ ...selectedTask, comments: [...(selectedTask.comments || []), comment] });
    setNewComment('');
    setReplyingTo(null);
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

  const handleDeleteStatus = (statusId: string) => {
    const statusTasks = tasks.filter((t) => t.statusId === statusId);
    if (statusTasks.length > 0) {
      toast({ title: 'Ошибка', description: 'Нельзя удалить статус с задачами', variant: 'destructive' });
      return;
    }

    const allStatuses = JSON.parse(localStorage.getItem('statuses') || '[]');
    const updatedStatuses = allStatuses.filter((s: Status) => s.id !== statusId);
    localStorage.setItem('statuses', JSON.stringify(updatedStatuses));
    setStatuses(updatedStatuses.filter((s: Status) => s.projectId === id));
    toast({ title: 'Статус удалён', description: 'Колонка успешно удалена' });
  };

  const getFilteredTasks = () => {
    let filtered = tasks;

    switch (filterMode) {
      case 'active':
        filtered = filtered.filter((t) => !t.completed);
        break;
      case 'completed':
        filtered = filtered.filter((t) => t.completed);
        break;
    }

    if (filterAssignee !== 'all') {
      filtered = filtered.filter((t) => t.assignee === filterAssignee);
    }

    if (filterTag !== 'all') {
      filtered = filtered.filter((t) => t.tags?.includes(filterTag));
    }

    return filtered;
  };

  if (!project) return null;

  const activeTask = tasks.find((t) => t.id === activeId);
  const filteredTasks = getFilteredTasks();

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
        <div className="mb-6 flex gap-4 items-center flex-wrap">
          <Tabs value={filterMode} onValueChange={(v) => setFilterMode(v as any)}>
            <TabsList>
              <TabsTrigger value="all">Все</TabsTrigger>
              <TabsTrigger value="active">Активные</TabsTrigger>
              <TabsTrigger value="completed">Закрытые</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Icon name="Filter" className="mr-2 h-4 w-4" />
            Фильтры
          </Button>

          {showFilters && (
            <>
              <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Исполнитель" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все исполнители</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.login} value={user.name}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterTag} onValueChange={setFilterTag}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Тег" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все теги</SelectItem>
                  {availableTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>

        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCorners} 
          onDragStart={handleDragStart} 
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6 overflow-x-auto pb-4">
            {statuses.map((status) => {
              const statusTasks = filteredTasks.filter((task) => task.statusId === status.id);
              const isColumnOver = overId === status.id;
              
              return (
                <SortableContext 
                  key={status.id} 
                  items={statusTasks.map((t) => t.id)} 
                  strategy={verticalListSortingStrategy}
                >
                  <div 
                    id={status.id} 
                    className="min-w-[320px] flex-shrink-0"
                    data-status-id={status.id}
                  >
                    <Card className={`h-full transition-all ${isColumnOver ? 'ring-2 ring-primary shadow-lg' : ''}`}>
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
                        {statusTasks.length === 0 && (
                          <Button
                            variant="outline"
                            className="w-full mt-3"
                            onClick={() => handleCreateTask(status.id)}
                          >
                            <Icon name="Plus" className="mr-2 h-4 w-4" />
                            Добавить задачу
                          </Button>
                        )}
                      </CardHeader>
                      {statusTasks.length > 0 && (
                        <CardContent className="space-y-3">
                          <DroppableColumn statusId={status.id} isOver={isColumnOver}>
                            {statusTasks.map((task) => (
                              <div key={task.id} className="mb-3">
                                <SortableTaskCard
                                  task={task}
                                  onClick={() => handleTaskClick(task)}
                                  onToggleComplete={(e) => handleToggleComplete(task.id, e)}
                                />
                              </div>
                            ))}
                          </DroppableColumn>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => handleCreateTask(status.id)}
                          >
                            <Icon name="Plus" className="mr-2 h-4 w-4" />
                            Добавить задачу
                          </Button>
                        </CardContent>
                      )}
                    </Card>
                  </div>
                </SortableContext>
              );
            })}

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
          <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <DialogTitle>{selectedTask ? 'Редактировать задачу' : 'Новая задача'}</DialogTitle>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Статус:</Label>
              <Select
                value={taskForm.statusId}
                onValueChange={(value) => setTaskForm({ ...taskForm, statusId: value })}
              >
                <SelectTrigger className="w-[180px] h-8">
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
          </DialogHeader>
          <div className="space-y-4">
            {selectedTask && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="completed"
                    checked={selectedTask.completed}
                    onCheckedChange={(checked) => {
                      const allTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
                      const updatedTasks = allTasks.map((t: Task) =>
                        t.id === selectedTask.id ? { ...t, completed: !!checked } : t
                      );
                      localStorage.setItem('tasks', JSON.stringify(updatedTasks));
                      setSelectedTask({ ...selectedTask, completed: !!checked });
                      loadData();
                    }}
                  />
                  <Label
                    htmlFor="completed"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {selectedTask.completed ? 'Закрыто' : 'Активно'}
                  </Label>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Icon name="Trash2" className="mr-2 h-4 w-4" />
                      Удалить
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Удалить задачу?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Это действие нельзя отменить. Задача будет удалена навсегда.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Отмена</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteTask}>
                        Удалить
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
            
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
              <Label htmlFor="tags">Теги</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {taskForm.tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="relative">
                <Input
                  id="tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Введите тег и нажмите Enter"
                />
                {filteredTags.length > 0 && tagInput && (
                  <Card className="absolute z-10 w-full mt-1">
                    <CardContent className="p-2">
                      {filteredTags.map((tag, idx) => (
                        <div
                          key={idx}
                          className="p-2 hover:bg-accent cursor-pointer rounded"
                          onClick={() => {
                            if (!taskForm.tags.includes(tag)) {
                              setTaskForm({ ...taskForm, tags: [...taskForm.tags, tag] });
                            }
                            setTagInput('');
                          }}
                        >
                          {tag}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {selectedTask && (
              <div className="space-y-3 pt-4 border-t">
                <Label>Комментарии</Label>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {buildCommentTree(selectedTask.comments || []).map((comment) => (
                    <CommentThread
                      key={comment.id}
                      comment={comment}
                      onReply={(parentId) => setReplyingTo(parentId)}
                    />
                  ))}
                </div>
                {replyingTo && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Ответ на комментарий</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyingTo(null)}
                    >
                      Отменить
                    </Button>
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    placeholder={replyingTo ? "Написать ответ..." : "Добавить комментарий..."}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }}
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