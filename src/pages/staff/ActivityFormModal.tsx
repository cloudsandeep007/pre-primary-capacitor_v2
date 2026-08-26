import { useState } from 'react';
import { X, Save, Camera, Video, Plus, Loader2, Play } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { storageService } from '@/services/storageService';
import { Staff, Student, DailyLogInput, MealStatus, NapStatus, MoodStatus, MediaItem } from '@/lib/types';
import { MEAL_OPTIONS, NAP_OPTIONS, MOOD_OPTIONS } from '@/lib/constants';
import { Button } from '@/components/Button';
import { showToast } from '@/components/Toast';
import { addMockLog } from '@/lib/mockData';
import { logger, generateTraceId } from '@/lib/logger';
import { activityService } from '@/services/activityService';

interface ActivityFormModalProps {
  student: Student;
  staff: Staff;
  onClose: () => void;
  onSaved: () => void;
}

interface LocalMediaItem {
  file?: File;
  preview: string;
  type: 'image' | 'video';
  name: string;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ActivityFormModal({ student, staff, onClose, onSaved }: ActivityFormModalProps) {
  const [meal, setMeal] = useState<MealStatus | null>(null);
  const [nap, setNap] = useState<NapStatus | null>(null);
  const [mood, setMood] = useState<MoodStatus | null>(null);
  const [note, setNote] = useState('');
  const [mediaItems, setMediaItems] = useState<LocalMediaItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newItems: LocalMediaItem[] = [];
    for (const file of files) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      if (!isImage && !isVideo) {
        showToast('error', `Skipped ${file.name}: Only images and videos are supported.`);
        continue;
      }
      const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        showToast('error', `Skipped ${file.name}: Exceeds size limit (${isVideo ? '50MB' : '10MB'}).`);
        continue;
      }
      newItems.push({
        file,
        preview: URL.createObjectURL(file),
        type: isVideo ? 'video' : 'image',
        name: file.name,
      });
    }

    setMediaItems((prev) => [...prev, ...newItems]);
    e.target.value = '';
  };

  const removeMediaItem = (index: number) => {
    setMediaItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!meal && !nap && !mood && !note.trim() && mediaItems.length === 0) {
      showToast('error', 'Please log at least one activity before saving.');
      return;
    }

    setSaving(true);
    const traceId = generateTraceId();
    logger.info('ACTIVITY_SAVE_STARTED', { studentId: student.id, traceId });

    try {
      const uploadedItems: MediaItem[] = [];

      if (mediaItems.length > 0) {
        setUploading(true);
        logger.info('ACTIVITY_PHOTO_UPLOAD_STARTED', { count: mediaItems.length, traceId });
        for (const item of mediaItems) {
          let finalUrl = item.preview;
          if (item.file) {
            let uploaded = false;
            try {
              const fileExt = item.file.name.split('.').pop();
              const fileName = `${student.id}/${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
              const { url, error: uploadError } = await storageService.uploadFileWithName('child-photos', fileName, item.file, traceId);

              if (!uploadError && url) {
                finalUrl = url;
                uploaded = true;
                logger.info('ACTIVITY_PHOTO_UPLOAD_SUCCESS', { fileName, traceId });
              } else {
                logger.warn('ACTIVITY_PHOTO_UPLOAD_FAILED', { error: uploadError, fileName, traceId });
              }
            } catch (err) {
              logger.warn('ACTIVITY_PHOTO_UPLOAD_FAILED', { error: err instanceof Error ? err.message : String(err), traceId });
            }

            if (!uploaded) {
              try {
                finalUrl = await readFileAsDataUrl(item.file);
              } catch (err) {
                logger.warn('BASE64_CONVERSION_FAILED', { 
                  error: err instanceof Error ? err.message : String(err),
                  studentId: student.id 
                });
              }
            }
          }
          uploadedItems.push({
            url: finalUrl,
            type: item.type,
            name: item.name,
          });
        }
        setUploading(false);
      }

      const firstPhoto = uploadedItems.find((m) => m.type === 'image')?.url || null;

      const logEntry: DailyLogInput = {
        student_id: student.id,
        staff_name: staff.name,
        meal_status: meal || null,
        nap_time: nap || null,
        mood: mood || null,
        teacher_notes: note.trim() || null,
        photo_url: firstPhoto,
        media_items: uploadedItems,
        log_date: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
      };

      // Sync to Supabase via the service
      try {
        logger.info('ACTIVITY_DB_INSERT_STARTED', { studentId: student.id, traceId });
        await activityService.createLog(logEntry, traceId);
        logger.info('ACTIVITY_DB_INSERT_SUCCESS', { studentId: student.id, traceId });
      } catch (err) {
        logger.error('ACTIVITY_DB_INSERT_FAILED', { error: err instanceof Error ? err.message : String(err), studentId: student.id, traceId });
        
        // Fallback to local mock storage ONLY if DB fails
        addMockLog({
          student_id: student.id,
          staff_name: staff.name,
          meal_status: meal || null,
          nap_time: nap || null,
          mood: mood || null,
          teacher_notes: note.trim() || null,
          photo_url: firstPhoto,
          media_items: uploadedItems,
          log_date: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
        });
      }

      showToast('success', `Activity logged for ${student.name}!`);
      onSaved();
    } catch (err) {
      logger.error('ACTIVITY_SAVE_FAILED', { 
        error: err instanceof Error ? err.message : String(err),
        studentId: student.id,
        traceId
      });
      showToast('error', 'Could not save activity. Please try again.');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl animate-[slideUp_0.3s_ease-out]">
        {/* Handle bar (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1.5 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10 rounded-t-3xl">
          <div>
            <h2 className="font-bold text-gray-800 text-lg">Log Activity</h2>
            <p className="text-sm text-gray-500">{student.name} · Roll #{student.roll_no}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-6">
          {/* Meal */}
          <ActivitySection title="Meal" icon="🍽️">
            <OptionGrid
              options={MEAL_OPTIONS}
              selected={meal}
              onSelect={(v) => setMeal(v as MealStatus)}
            />
          </ActivitySection>

          {/* Nap */}
          <ActivitySection title="Nap" icon="😴">
            <OptionGrid
              options={NAP_OPTIONS}
              selected={nap}
              onSelect={(v) => setNap(v as NapStatus)}
            />
          </ActivitySection>

          {/* Mood */}
          <ActivitySection title="Mood" icon="😊">
            <OptionGrid
              options={MOOD_OPTIONS}
              selected={mood}
              onSelect={(v) => setMood(v as MoodStatus)}
            />
          </ActivitySection>

          {/* Note */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">📝 Teacher's Note</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Add a note about their day..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none transition-all text-sm resize-none"
            />
          </div>

          {/* Multi-Media Upload (Photos & Videos) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-gray-700">📸 Photos & 🎥 Videos</label>
              {mediaItems.length > 0 && (
                <span className="text-xs font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md">
                  {mediaItems.length} selected
                </span>
              )}
            </div>

            {/* Media thumbnail grid */}
            {mediaItems.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {mediaItems.map((item, idx) => (
                  <div key={idx} className="relative rounded-xl overflow-hidden group border border-gray-200 bg-black/5 aspect-square">
                    {item.type === 'video' ? (
                      <div className="relative w-full h-full bg-slate-900 flex items-center justify-center">
                        <video src={item.preview} className="w-full h-full object-cover opacity-80" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white">
                            <Play size={14} className="fill-white ml-0.5" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <img src={item.preview} alt={item.name} className="w-full h-full object-cover" />
                    )}

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => removeMediaItem(idx)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-rose-600 transition-colors"
                      title="Remove"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Button */}
            <label className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl border-2 border-dashed border-sky-200 bg-sky-50/50 hover:bg-sky-100/50 hover:border-sky-300 cursor-pointer transition-all text-sky-600 font-semibold text-sm">
              <Plus size={18} />
              <span>Add Photos or Videos</span>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleMediaSelect}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-5 py-4 flex gap-3 rounded-b-3xl">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || uploading} className="flex-1">
            {uploading ? (
              <>
                <Loader2 size={18} className="animate-spin mr-2" />
                Uploading Media...
              </>
            ) : saving ? (
              <>
                <Loader2 size={18} className="animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} className="mr-1.5" />
                Save Activity
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ActivitySection({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">{icon} {title}</label>
      {children}
    </div>
  );
}

function OptionGrid({
  options,
  selected,
  onSelect,
}: {
  options: { value: string; label: string; emoji: string; color: string }[];
  selected: string | null;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((option) => {
        const isSelected = selected === option.value;
        return (
          <button
            key={option.value}
            onClick={() => onSelect(option.value)}
            className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all active:scale-95 ${
              isSelected
                ? 'border-transparent ring-2 ring-offset-1 ring-sky-400 shadow-md'
                : 'border-gray-100 hover:border-gray-200 bg-white'
            }`}
            style={isSelected ? { background: option.color } : {}}
          >
            <span className="text-2xl">{option.emoji}</span>
            <span className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-gray-600'}`}>
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
