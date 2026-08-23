import { useState } from 'react';
import { Shield, Users } from 'lucide-react';
import { RoleMatrixTab } from './RoleMatrixTab';
import { UserAccessTab } from './UserAccessTab';

export function RBACManager() {
  const [activeTab, setActiveTab] = useState<'matrix' | 'users'>('matrix');

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`pb-3 px-2 font-medium text-sm flex items-center gap-2 ${
            activeTab === 'matrix' 
              ? 'border-b-2 border-indigo-600 text-indigo-600' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Shield size={16} /> Role & Permission Matrix
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-2 font-medium text-sm flex items-center gap-2 ${
            activeTab === 'users' 
              ? 'border-b-2 border-indigo-600 text-indigo-600' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users size={16} /> User Access Assignment
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        {activeTab === 'matrix' ? <RoleMatrixTab /> : <UserAccessTab />}
      </div>
    </div>
  );
}
