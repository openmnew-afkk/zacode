import React from 'react';
import { useNavigate } from 'react-router-dom';
import SynthaxAiStudio from '../components/SynthaxAiStudio';

const SynthaxPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div
      className="page"
      style={{
        minHeight: '100vh',
        padding: 'calc(var(--header-safe-top, 50px) + 10px) 16px calc(var(--tabbar-h, 80px) + 28px)',
        maxWidth: 640,
        margin: '0 auto',
      }}
    >
      <SynthaxAiStudio onBackToOracle={() => navigate(-1)} backLabel="Назад" />
    </div>
  );
};

export default SynthaxPage;
