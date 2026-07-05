import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/* Сбрасываем маршрут на главную при каждом холодном запуске приложения */
const RouteGuard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const bootKey = 'tc_boot';
    const alreadyBooted = sessionStorage.getItem(bootKey);

    if (!alreadyBooted) {
      sessionStorage.setItem(bootKey, '1');
      if (location.pathname !== '/') {
        navigate('/', { replace: true });
      }
      window.scrollTo(0, 0);
    }
  }, [navigate, location.pathname]);

  return null;
};

export default RouteGuard;
