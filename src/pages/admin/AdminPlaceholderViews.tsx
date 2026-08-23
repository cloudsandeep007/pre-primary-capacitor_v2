import React from 'react';
import { BookOpen, DollarSign, Megaphone, Calendar, Settings, FileText, Download } from 'lucide-react';

export function AdminCommunicationView() {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Communication Hub</h1>
          <p className="text-sm text-slate-500 mt-1">Send announcements and notifications</p>
        </div>
        <button className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors">
          + New Announcement
        </button>
      </div>
      <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-16 h-16 bg-sky-50 rounded-full flex items-center justify-center text-sky-400 mb-4">
          <Megaphone size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-700">Communication System Offline</h2>
        <p className="text-slate-500 mt-2 max-w-md">The unified parent-teacher messaging system is scheduled for the next release phase.</p>
      </div>
    </div>
  );
}

export function AdminEventsView() {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Events & Activities</h1>
          <p className="text-sm text-slate-500 mt-1">Manage school calendar, sports, and cultural events</p>
        </div>
        <button className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-900 text-sm font-bold rounded-xl shadow-sm transition-colors">
          + Schedule Event
        </button>
      </div>
      <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mb-4">
          <Calendar size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-700">Calendar Integration Pending</h2>
        <p className="text-slate-500 mt-2 max-w-md">The master school calendar and event tracking system will be activated soon.</p>
      </div>
    </div>
  );
}

