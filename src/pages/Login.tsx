import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isLogin) {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const user = users.find((u: any) => u.login === login && u.password === password);

      if (login === 'admin' && password === 'qwerty12+') {
        localStorage.setItem('currentUser', JSON.stringify({ login: 'admin', role: 'admin', name: 'Администратор' }));
        toast({ title: 'Добро пожаловать!', description: 'Вход выполнен успешно' });
        navigate('/');
      } else if (user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
        toast({ title: 'Добро пожаловать!', description: 'Вход выполнен успешно' });
        navigate('/');
      } else {
        toast({ title: 'Ошибка', description: 'Неверный логин или пароль', variant: 'destructive' });
      }
    } else {
      if (!login || !password || !name) {
        toast({ title: 'Ошибка', description: 'Заполните все поля', variant: 'destructive' });
        return;
      }

      const users = JSON.parse(localStorage.getItem('users') || '[]');
      
      if (users.find((u: any) => u.login === login)) {
        toast({ title: 'Ошибка', description: 'Пользователь с таким логином уже существует', variant: 'destructive' });
        return;
      }

      const newUser = { login, password, name, role: 'user' };
      users.push(newUser);
      localStorage.setItem('users', JSON.stringify(users));
      localStorage.setItem('currentUser', JSON.stringify(newUser));
      
      toast({ title: 'Регистрация успешна!', description: 'Добро пожаловать в систему' });
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2">
          <CardTitle className="text-3xl font-bold text-center">
            {isLogin ? 'Вход' : 'Регистрация'}
          </CardTitle>
          <CardDescription className="text-center">
            {isLogin ? 'Войдите в систему управления проектами' : 'Создайте новый аккаунт'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Имя</Label>
                <Input
                  id="name"
                  placeholder="Ваше имя"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="login">Логин</Label>
              <Input
                id="login"
                placeholder="Введите логин"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full">
              {isLogin ? 'Войти' : 'Зарегистрироваться'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? 'Создать аккаунт' : 'Уже есть аккаунт'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
