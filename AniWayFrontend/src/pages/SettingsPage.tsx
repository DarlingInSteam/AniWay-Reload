import React, { useState } from 'react';
import SecuritySection from '@/components/settings/SecuritySection';

interface TabDef { key: string; label: string; render: () => React.ReactNode }

const tabs: TabDef[] = [
  { key: 'profile', label: 'Профиль', render: () => <div className="text-sm text-muted-foreground">Раздел профиля (в разработке)</div> },
  { key: 'security', label: 'Безопасность', render: () => <SecuritySection /> },
];

export const SettingsPage: React.FC = () => {
  const [active, setActive] = useState('security');
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 text-white">
      <h1 className="text-2xl font-bold mb-6">Настройки</h1>
      <div className="flex gap-2 mb-8 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={()=>setActive(t.key)}
            className={`px-4 py-2 rounded text-sm font-medium border transition-colors whitespace-nowrap ${active===t.key? 'bg-primary border-primary text-white' : 'bg-card/40 border-border/40 hover:bg-card/60'}`}>{t.label}</button>
        ))}
      </div>
      <div>
        {tabs.find(t=>t.key===active)?.render()}
      </div>
    </div>
  );
};

export default SettingsPage;
