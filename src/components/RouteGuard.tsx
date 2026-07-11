import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/* Сбрасываем маршрут на главную при каждом запуске */
const RouteGuard: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Всегда открываемся на главной — HashRouter сам посебе хранит '#/'
    navigate('/', { replace: true });
    window.scrollTo(0, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

export default RouteGuard;
