import React, { useEffect } from 'react';

export const ResetPasswordCodePage: React.FC = () => {
  useEffect(()=>{
    // Просто перенаправляем на основной многошаговый экран, сохраняя параметры.
    const params = window.location.search;
    window.location.replace(`/reset-password${params}`);
  },[]);
  return <div className="text-center text-sm text-muted-foreground mt-20">Перенаправление...</div>;
};

export default ResetPasswordCodePage;
