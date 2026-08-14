import React from 'react';
import { Student } from '../lib/types';
import { Logo } from './Logo';

interface PrintableReportCardProps {
  student: Student;
  timeframe: string;
  attendance: number;
  cwAvg: number;
  hwAvg: number;
  activityAvg: number;
  totalScore: number;
}

export const PrintableReportCard: React.FC<PrintableReportCardProps> = ({
  student,
  timeframe,
  attendance,
  cwAvg,
  hwAvg,
  activityAvg,
  totalScore,
}) => {
  return (
    <div
      className="bg-white text-gray-900 p-8 flex flex-col items-center justify-start mx-auto shadow-2xl relative space-y-6"
      style={{
        width: '794px', // A4 width at 96 PPI
        height: '1123px', // A4 height
        boxSizing: 'border-box',
        border: '8px double #14b8a6', // teal-500
      }}
      id={`report-card-${student.id}`}
    >
      {/* Header */}
      <div className="w-full flex flex-col items-center border-b-4 border-sky-500 pb-4">
        <div className="w-32 h-auto mb-2">
          <Logo />
        </div>
        <p className="text-lg text-teal-600 mt-2 font-bold tracking-wide uppercase">
          Performance Report
        </p>
        <p className="text-sm text-gray-500 mt-1 font-medium">
          {timeframe}
        </p>
      </div>

      {/* Student Details */}
      <div className="w-full flex items-center justify-between mb-8 bg-sky-50 p-6 rounded-2xl border border-sky-100 shadow-sm">
        <div className="flex flex-col space-y-3">
          <div className="text-xl font-bold text-gray-800">
            Student Name: <span className="text-sky-700">{student.name}</span>
          </div>
          <div className="text-lg font-semibold text-gray-700">
            Roll Number: <span className="text-sky-700">{student.roll_no}</span>
          </div>
          <div className="text-lg font-semibold text-gray-700">
            Class: <span className="text-sky-700">{student.class_name}</span>
          </div>
        </div>
        <div className="w-28 h-28 rounded-xl overflow-hidden border-4 border-teal-400 bg-gray-200 flex-shrink-0">
          {student.student_photo_url ? (
            <img
              src={student.student_photo_url}
              alt={student.name}
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              No Photo
            </div>
          )}
        </div>
      </div>

      {/* Metrics Section */}
      <div className="w-full flex-grow flex flex-col items-center">
        <h2 className="text-2xl font-bold text-gray-800 border-b-2 border-teal-500 pb-2 mb-6 inline-block">
          Academic & Activity Metrics
        </h2>
        
        <div className="w-full grid grid-cols-2 gap-6 px-4">
          {/* Attendance */}
          <div className="bg-white p-5 rounded-2xl border-2 border-sky-200 flex flex-col items-center shadow-sm">
            <span className="text-base text-gray-500 font-semibold mb-2">Attendance</span>
            <span className="text-3xl font-bold text-sky-600">{attendance.toFixed(1)}%</span>
          </div>

          {/* Classwork */}
          <div className="bg-white p-5 rounded-2xl border-2 border-teal-200 flex flex-col items-center shadow-sm">
            <span className="text-base text-gray-500 font-semibold mb-2">Classwork (Avg Stars)</span>
            <span className="text-3xl font-bold text-teal-600">{cwAvg.toFixed(1)} / 5</span>
          </div>

          {/* Homework */}
          <div className="bg-white p-5 rounded-2xl border-2 border-purple-200 flex flex-col items-center shadow-sm">
            <span className="text-base text-gray-500 font-semibold mb-2">Homework (Avg Stars)</span>
            <span className="text-3xl font-bold text-purple-600">{hwAvg.toFixed(1)} / 5</span>
          </div>

          {/* Activity */}
          <div className="bg-white p-5 rounded-2xl border-2 border-rose-200 flex flex-col items-center shadow-sm">
            <span className="text-base text-gray-500 font-semibold mb-2">Activity (Avg Stars)</span>
            <span className="text-3xl font-bold text-rose-600">{activityAvg.toFixed(1)} / 5</span>
          </div>
        </div>

        {/* Total Score */}
        <div className="mt-8 bg-gradient-to-r from-sky-500 to-teal-400 p-[2px] rounded-2xl w-2/3">
          <div className="bg-white rounded-2xl p-4 text-center">
            <span className="text-lg font-bold text-gray-700 block mb-1">Overall Performance Score</span>
            <span className="text-3xl font-extrabold text-sky-600">
              {totalScore.toFixed(1)} / 100
            </span>
          </div>
        </div>
      </div>

      {/* Footer / Signatures */}
      <div className="w-full flex justify-between items-end mt-auto pt-4 pb-2 border-t-2 border-gray-200 px-4">
        <div className="flex flex-col items-center">
          <div className="w-32 border-b border-gray-500 mb-2"></div>
          <span className="text-sm font-medium text-gray-500">Date</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-40 border-b border-gray-500 mb-2"></div>
          <span className="text-sm font-medium text-gray-500">Class Teacher Signature</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-40 border-b border-gray-500 mb-2"></div>
          <span className="text-sm font-medium text-gray-500">Principal Signature</span>
        </div>
      </div>
    </div>
  );
};
