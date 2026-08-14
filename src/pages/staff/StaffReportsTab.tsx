import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Staff, Student, Attendance, DailyGrade } from '../../lib/types';
import { getDateFromFilter, DateFilterType } from '../../lib/dateUtils';
import { PrintableReportCard } from '../../components/PrintableReportCard';
import { Download, Loader2, AlertCircle } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { createPortal } from 'react-dom';
import { format, subDays } from 'date-fns';

interface StaffReportsTabProps {
  staff: Staff;
  assignedClass: string;
}

interface StudentReportData {
  student: Student;
  attendancePercent: number;
  cwAvg: number;
  hwAvg: number;
  activityAvg: number;
  totalScore: number;
}

export const StaffReportsTab: React.FC<StaffReportsTabProps> = ({ staff, assignedClass }) => {
  const [startDate, setStartDate] = useState<string>(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<StudentReportData[]>([]);
  const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);

  // Hidden container for printing
  const printContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, [startDate, endDate, assignedClass]);

  const fetchData = async () => {
    if (!assignedClass) return;
    
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Students
      let query = supabase.from('students').select('*');
      if (assignedClass !== 'All') {
        query = query.eq('class_name', assignedClass);
      }
      
      const { data: studentsData, error: studentsError } = await query;
      if (studentsError) throw studentsError;
      
      const students: Student[] = studentsData || [];

      if (students.length === 0) {
        setReportData([]);
        return;
      }

      const studentIds = students.map(s => s.id);

      // 2. Fetch Attendance
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .in('student_id', studentIds)
        .gte('date', startDate)
        .lte('date', endDate);
        
      if (attendanceError) throw attendanceError;
      const attendances: Attendance[] = attendanceData || [];

      // 3. Fetch Daily Grades
      const { data: gradesData, error: gradesError } = await supabase
        .from('daily_grades')
        .select('*')
        .in('student_id', studentIds)
        .gte('date', startDate)
        .lte('date', endDate);
        
      if (gradesError) throw gradesError;
      const dailyGrades: DailyGrade[] = gradesData || [];

      // 4. Calculate Averages
      const compiledData: StudentReportData[] = students.map(student => {
        const studentAttendances = attendances.filter(a => a.student_id === student.id);
        const presentCount = studentAttendances.filter(a => a.status === 'present' || a.status === 'late').length;
        const totalDays = studentAttendances.length;
        const attendancePercent = totalDays > 0 ? (presentCount / totalDays) * 100 : 0;

        const studentGrades = dailyGrades.filter(g => g.student_id === student.id);
        const gradesCount = studentGrades.length;
        
        let cwAvg = 0;
        let hwAvg = 0;
        let activityAvg = 0;

        if (gradesCount > 0) {
          cwAvg = studentGrades.reduce((sum, g) => sum + (g.cw_stars || 0), 0) / gradesCount;
          hwAvg = studentGrades.reduce((sum, g) => sum + (g.hw_stars || 0), 0) / gradesCount;
          activityAvg = studentGrades.reduce((sum, g) => sum + (g.activity_stars || 0), 0) / gradesCount;
        }

        // Rough total score out of 100 based on attendance (25) + cw (25) + hw (25) + activity (25)
        const attendanceScore = (attendancePercent / 100) * 25;
        const cwScore = (cwAvg / 5) * 25;
        const hwScore = (hwAvg / 5) * 25;
        const activityScore = (activityAvg / 5) * 25;
        const totalScore = attendanceScore + cwScore + hwScore + activityScore;

        return {
          student,
          attendancePercent,
          cwAvg,
          hwAvg,
          activityAvg,
          totalScore,
        };
      });

      // Sort by roll no
      compiledData.sort((a, b) => parseInt(a.student.roll_no || '0') - parseInt(b.student.roll_no || '0'));
      setReportData(compiledData);

    } catch (err: any) {
      console.error("Error fetching report data:", err);
      setError(err.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async (data: StudentReportData) => {
    try {
      setGeneratingPdfId(data.student.id);
      
      const elementId = `report-card-${data.student.id}`;
      const element = document.getElementById(elementId);
      
      if (!element) {
        throw new Error('Report card element not found');
      }

      // Small delay to ensure any images have loaded (though we wait for that ideally)
      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await html2canvas(element, {
        scale: 2, // Higher quality
        useCORS: true, // For external images like supabase storage
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      
      // A4 format: 210 x 297 mm
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${data.student.name.replace(/\s+/g, '_')}_Report.pdf`);
      
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPdfId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-sky-100 overflow-hidden">
      <div className="p-6 border-b border-sky-100 bg-gradient-to-r from-sky-50 to-white flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-sky-900">Student Reports</h2>
          <p className="text-sm text-sky-600 mt-1">Generate performance reports for {assignedClass === 'All' ? 'all classes' : assignedClass}</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-500 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border-gray-300 border p-2 text-sm focus:ring-sky-500 focus:border-sky-500 outline-none"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-500 mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border-gray-300 border p-2 text-sm focus:ring-sky-500 focus:border-sky-500 outline-none"
            />
          </div>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
          </div>
        ) : reportData.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No students found for this class.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-sky-50 text-sky-900 text-sm border-b border-sky-100">
                  <th className="p-4 font-semibold rounded-tl-xl">Roll No</th>
                  <th className="p-4 font-semibold">Student Name</th>
                  {assignedClass === 'All' && <th className="p-4 font-semibold">Class</th>}
                  <th className="p-4 font-semibold text-center">Attendance</th>
                  <th className="p-4 font-semibold text-center">Total Score</th>
                  <th className="p-4 font-semibold text-right rounded-tr-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reportData.map((data) => (
                  <tr key={data.student.id} className="hover:bg-sky-50/50 transition-colors">
                    <td className="p-4 text-sm text-gray-600 font-medium">
                      {data.student.roll_no}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 mr-3 border border-gray-200">
                          {data.student.student_photo_url ? (
                            <img src={data.student.student_photo_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No</div>
                          )}
                        </div>
                        <span className="font-medium text-gray-900">{data.student.name}</span>
                      </div>
                    </td>
                    {assignedClass === 'All' && (
                      <td className="p-4 text-sm text-gray-600">
                        {data.student.class_name}
                      </td>
                    )}
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        data.attendancePercent >= 80 ? 'bg-green-100 text-green-800' : 
                        data.attendancePercent >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {data.attendancePercent.toFixed(0)}%
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-sm font-bold text-gray-700">
                        {data.totalScore.toFixed(1)} <span className="text-gray-400 text-xs font-normal">/ 100</span>
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDownloadPdf(data)}
                        disabled={generatingPdfId === data.student.id}
                        className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-sky-500 to-teal-400 text-white text-sm font-medium rounded-xl hover:from-sky-600 hover:to-teal-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {generatingPdfId === data.student.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-2" />
                            Download PDF
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Hidden Portal for Printable Reports */}
      {createPortal(
        <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', zIndex: -1 }}>
          <div ref={printContainerRef}>
            {reportData.map((data) => (
              <PrintableReportCard 
                key={data.student.id}
                student={data.student}
                timeframe={`${format(new Date(startDate), 'MMM dd, yyyy')} - ${format(new Date(endDate), 'MMM dd, yyyy')}`}
                attendance={data.attendancePercent}
                cwAvg={data.cwAvg}
                hwAvg={data.hwAvg}
                activityAvg={data.activityAvg}
                totalScore={data.totalScore}
              />
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
