
import React from 'react';
import ScreenList from './ScreenList';
import SettingsPanel from './SettingsPanel';

export default function Sidebar() {
  const [activeTab, setActiveTab] = React.useState('screens');

  return (
    <aside className="w-80 bg-white border-r border-rose-200 flex flex-col">
      <div className="flex border-b border-rose-200">
        <button
          onClick={() => setActiveTab('screens')}
          className={`flex-1 p-3 text-sm font-semibold transition-colors ${
            activeTab === 'screens' ? 'bg-rose-100 text-pink-700' : 'text-slate-500 hover:bg-rose-100/50'
          }`}
        >
          Telas
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 p-3 text-sm font-semibold transition-colors ${
            activeTab === 'settings' ? 'bg-rose-100 text-pink-700' : 'text-slate-500 hover:bg-rose-100/50'
          }`}
        >
          Configurações
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'screens' && <ScreenList />}
        {activeTab === 'settings' && <SettingsPanel />}
      </div>
    </aside>
  );
}
