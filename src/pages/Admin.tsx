import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface User {
  login: string;
  name: string;
  role: string;
}

const Admin = () => {
  const [users, setUsers] = useState<User[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

  useEffect(() => {
    if (currentUser.role !== 'admin') {
      toast({ title: 'Доступ запрещен', description: 'У вас нет прав доступа', variant: 'destructive' });
      navigate('/');
      return;
    }

    const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
    setUsers([{ login: 'admin', name: 'Администратор', role: 'admin' }, ...allUsers]);
  }, []);

  const handleDeleteUser = (login: string) => {
    if (login === 'admin') {
      toast({ title: 'Ошибка', description: 'Нельзя удалить администратора', variant: 'destructive' });
      return;
    }

    const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
    const updatedUsers = allUsers.filter((u: User) => u.login !== login);
    localStorage.setItem('users', JSON.stringify(updatedUsers));
    setUsers([{ login: 'admin', name: 'Администратор', role: 'admin' }, ...updatedUsers]);
    toast({ title: 'Удалено', description: 'Пользователь удален' });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <Icon name="ArrowLeft" className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Администрирование</h1>
          </div>
          <span className="text-sm text-muted-foreground">{currentUser.name}</span>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="Users" className="h-5 w-5" />
              Управление пользователями
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Логин</TableHead>
                  <TableHead>Имя</TableHead>
                  <TableHead>Роль</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.login}>
                    <TableCell className="font-medium">{user.login}</TableCell>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role === 'admin' ? 'Администратор' : 'Пользователь'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {user.login !== 'admin' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user.login)}
                        >
                          <Icon name="Trash2" className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {users.length === 1 && (
              <div className="text-center py-8 text-muted-foreground">
                Пока нет зарегистрированных пользователей
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Admin;
