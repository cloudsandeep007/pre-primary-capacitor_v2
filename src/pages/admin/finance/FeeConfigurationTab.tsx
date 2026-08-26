import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { feeService, FeeCategory, FeeStructure } from '@/services/feeService';
import { showToast } from '@/components/Toast';
import { supabase } from '@/lib/supabase';

interface Props {
  activeYear: string;
}

export function FeeConfigurationTab({ activeYear }: Props) {
  const [categories, setCategories] = useState<FeeCategory[]>([]);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);

  // New Category form
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // New Structure form
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [strClass, setStrClass] = useState('Nursery');
  const [strCategoryId, setStrCategoryId] = useState('');
  const [strAmount, setStrAmount] = useState('');
  const [strFrequency, setStrFrequency] = useState('Monthly');
  const [strDueDate, setStrDueDate] = useState('');

  // Assign form
  const [assignTarget, setAssignTarget] = useState<FeeStructure | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  // Preview counts shown in the assign modal before confirming
  const [assignPreview, setAssignPreview] = useState<{ total: number; newCount: number; skipCount: number } | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const loadAssignPreview = async (structure: FeeStructure) => {
    setIsLoadingPreview(true);
    setAssignPreview(null);
    try {
      // Total students in class
      const { count: total } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .or(`class_name.eq.${structure.class_name},class.eq.${structure.class_name}`);

      // Already assigned
      const { count: skip } = await supabase
        .from('student_fees')
        .select('id', { count: 'exact', head: true })
        .eq('fee_structure_id', structure.id);

      const t = total ?? 0;
      const s = skip ?? 0;
      setAssignPreview({ total: t, newCount: Math.max(0, t - s), skipCount: s });
    } catch {
      setAssignPreview(null); // Preview unavailable — modal still works
    } finally {
      setIsLoadingPreview(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeYear]);

  const loadData = async () => {
    setLoading(true);
    const [cats, structs] = await Promise.all([
      feeService.fetchFeeCategories(),
      feeService.fetchFeeStructures(activeYear)
    ]);
    setCategories(cats);
    setStructures(structs);
    if (cats.length > 0) setStrCategoryId(cats[0].id);
    setLoading(false);
  };

  const handleSaveCategory = async () => {
    if (!catName.trim()) return showToast('error', 'Category name required');
    const success = await feeService.createFeeCategory({ name: catName, description: catDesc, is_active: true });
    if (success) {
      showToast('success', 'Category added');
      setShowCategoryModal(false);
      setCatName('');
      setCatDesc('');
      loadData();
    }
  };

  const handleSaveStructure = async () => {
    if (!strAmount || isNaN(Number(strAmount))) return showToast('error', 'Valid amount is required');
    if (!strCategoryId) return showToast('error', 'Category selection required');
    
    // Find category name for legacy fallback
    const cat = categories.find(c => c.id === strCategoryId);
    
    const success = await feeService.createFeeStructure({
      academic_year: activeYear,
      class_name: strClass,
      category_id: strCategoryId,
      fee_category: cat?.name || 'Unknown', // Legacy fallback
      amount: Number(strAmount),
      frequency: strFrequency,
      due_date: strDueDate || undefined
    });

    if (success) {
      showToast('success', 'Fee structure added successfully');
      setShowStructureModal(false);
      setStrAmount('');
      setStrDueDate('');
      loadData();
    }
  };

  const handleBulkAssign = async () => {
    if (!assignTarget) return;
    setIsAssigning(true);
    const result = await feeService.assignFeeToClass(assignTarget);
    
    if (result.success) {
      showToast(result.count > 0 ? 'success' : 'info', result.message);
      setAssignTarget(null);
    } else {
      showToast('error', result.message);
    }
    setIsAssigning(false);
  };

  if (loading) return <div className="p-8 text-slate-500">Loading configurations...</div>;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Categories Section */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div>
            <h3 className="font-bold text-white">Fee Categories</h3>
            <p className="text-sm text-slate-400">Master list of fee types across all years</p>
          </div>
          <button 
            onClick={() => setShowCategoryModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors text-sm font-medium border border-slate-700"
          >
            <Plus size={16} /> Add Category
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/30 text-slate-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Description</th>
                <th className="p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {categories.length === 0 ? (
                <tr><td colSpan={3} className="p-4 text-center text-slate-500 text-sm">No categories defined yet.</td></tr>
              ) : categories.map(cat => (
                <tr key={cat.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="p-4 text-sm font-medium text-white">{cat.name}</td>
                  <td className="p-4 text-sm text-slate-400">{cat.description || '-'}</td>
                  <td className="p-4 text-sm">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Structures Section */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div>
            <h3 className="font-bold text-white">Fee Structures ({activeYear})</h3>
            <p className="text-sm text-slate-400">Base amounts assigned by class</p>
          </div>
          <button 
            onClick={() => setShowStructureModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl transition-colors text-sm font-bold border border-emerald-500/20"
          >
            <Plus size={16} /> Add Structure
          </button>
        </div>

        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/30 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="p-4 font-medium">Class</th>
                  <th className="p-4 font-medium">Category</th>
                  <th className="p-4 font-medium">Amount</th>
                  <th className="p-4 font-medium">Frequency</th>
                  <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {structures.length === 0 ? (
                  <tr><td colSpan={5} className="p-4 text-center text-slate-500 text-sm">No fee structures for {activeYear}.</td></tr>
                ) : structures.map(st => (
                  <tr key={st.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="p-4 text-sm font-bold text-white">{st.class_name}</td>
                    <td className="p-4 text-sm text-slate-300">{st.category?.name || st.fee_category}</td>
                    <td className="p-4 text-sm text-amber-400 font-mono font-medium">₹{st.amount.toLocaleString()}</td>
                    <td className="p-4 text-sm text-slate-400">{st.frequency}</td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => { setAssignTarget(st); loadAssignPreview(st); }}
                        className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition-colors border border-indigo-500/20"
                        title="Bulk Assign to Class"
                      >
                        <Users size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6">Add Fee Category</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Category Name</label>
                <input 
                  type="text" 
                  value={catName} 
                  onChange={e => setCatName(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                  placeholder="e.g. Library Fee"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Description (Optional)</label>
                <textarea 
                  value={catDesc} 
                  onChange={e => setCatDesc(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all h-24 resize-none"
                  placeholder="What is this fee for?"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setShowCategoryModal(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors font-semibold text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveCategory}
                className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-colors font-bold text-sm shadow-lg shadow-violet-900/20"
              >
                Save Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Structure Modal */}
      {showStructureModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6">Add Fee Structure for {activeYear}</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Class</label>
                  <select 
                    value={strClass} 
                    onChange={e => setStrClass(e.target.value)} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                  >
                    <option value="Pre-Nursery">Pre-Nursery</option>
                    <option value="Nursery">Nursery</option>
                    <option value="LKG">LKG</option>
                    <option value="UKG">UKG</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Frequency</label>
                  <select 
                    value={strFrequency} 
                    onChange={e => setStrFrequency(e.target.value)} 
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Termly">Termly</option>
                    <option value="Yearly">Yearly</option>
                    <option value="One-Time">One-Time</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Fee Category</label>
                <select 
                  value={strCategoryId} 
                  onChange={e => setStrCategoryId(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                >
                  <option value="" disabled>Select a category...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Amount (₹)</label>
                <input 
                  type="number" 
                  min="0"
                  value={strAmount} 
                  onChange={e => setStrAmount(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                  placeholder="e.g. 5000"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">First Due Date (Optional)</label>
                <input 
                  type="date" 
                  value={strDueDate} 
                  onChange={e => setStrDueDate(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setShowStructureModal(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors font-semibold text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveStructure}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors font-bold text-sm shadow-lg shadow-emerald-900/20"
              >
                Save Structure
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {assignTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                <Users size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Bulk Assign Fee</h2>
                <p className="text-sm text-slate-400">Apply this structure to students</p>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-6">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Class Target</span>
                  <span className="text-white font-bold">{assignTarget.class_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Fee Category</span>
                  <span className="text-white font-bold">{assignTarget.category?.name || assignTarget.fee_category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Amount per Student</span>
                  <span className="text-amber-400 font-mono font-bold">₹{assignTarget.amount.toLocaleString()}</span>
                </div>
              </div>
            </div>
            

            {/* Live preview */}
            <div className="mb-6">
              {isLoadingPreview ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm py-3">
                  <Loader2 size={16} className="animate-spin" /> Fetching student count...
                </div>
              ) : assignPreview ? (
                <div className={`rounded-xl p-4 border ${assignPreview.newCount === 0 ? 'bg-amber-950/30 border-amber-500/30' : 'bg-emerald-950/30 border-emerald-500/30'}`}>
                  {assignPreview.newCount > 0 ? (
                    <div className="flex items-start gap-2 text-emerald-400 text-sm">
                      <CheckCircle size={16} className="mt-0.5 shrink-0" />
                      <span>
                        Will create ledgers for <strong className="text-white">{assignPreview.newCount} students</strong> in {assignTarget.class_name}.
                        {assignPreview.skipCount > 0 && (
                          <span className="text-slate-400"> ({assignPreview.skipCount} already assigned → skipped)</span>
                        )}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 text-amber-400 text-sm">
                      <AlertCircle size={16} className="mt-0.5 shrink-0" />
                      <span>All {assignPreview.total} students in {assignTarget.class_name} already have this fee assigned.</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  This will assign the fee to all active students in <strong>{assignTarget.class_name}</strong>. Already-assigned students will be skipped.
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setAssignTarget(null)}
                disabled={isAssigning}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors font-semibold text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleBulkAssign}
                disabled={isAssigning}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors font-bold text-sm shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isAssigning ? 'Assigning...' : 'Assign to Class'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
