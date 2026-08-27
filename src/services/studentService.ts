import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { auditLog } from '@/lib/audit';
import { Student } from '@/lib/types';
import { AppError, handleSupabaseError } from '@/lib/errors';
import { getMockStudents } from '@/lib/mockData';

/**
 * Normalizes a database record into a typed Student object
 */
const normalizeStudent = (data: any, fallbackRoll?: string): Student => {
  return {
    id: data.id || String(data.roll_no || data.roll_number),
    roll_no: String(data.roll_no || data.roll_number || fallbackRoll || ''),
    pin: String(data.pin || '1234'),
    name: data.name || 'Student',
    class_name: data.class_name || data.class || 'Nursery',
    guardian_name: data.guardian_name,
    parent_phone: data.parent_phone,
    student_photo_url: data.student_photo_url,
    parent_photo_url: data.parent_photo_url,
  };
};

/**
 * Service to handle Student operations.
 * Abstracts the complex schema fallbacks (roll_no vs roll_number, class_name vs class)
 * away from the UI components.
 */
export const studentService = {
  /**
   * Fetch all students, optionally filtered by class.
   */
  async fetchAllStudents(className?: string): Promise<Student[]> {
    try {
      let query = supabase.from('students').select('*');
      
      if (className && className !== 'All') {
        // Handle both schema variations for class filtering
        query = query.or(`class_name.eq.${className},class.eq.${className}`);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return (data as any[]).map(record => normalizeStudent(record)) || [];
    } catch (err) {
      const appErr = handleSupabaseError(err, 'STUDENT-001', { operation: 'SELECT', resource: 'students' });
      logger.error('STUDENT_SERVICE_FETCH_ALL_FAILED', { error: appErr });
      return [];
    }
  },

  /**
   * Find a specific student safely by UUID, roll_no, or roll_number.
   */
  async findStudentByRollOrId(identifier: string): Promise<Student | null> {
    const cleanId = identifier.trim();
    try {
      let studentData: any = null;
      const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(cleanId);

      // Attempt 1: Fetch by exact UUID
      if (isUuid) {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq('id', cleanId)
          .maybeSingle();
        if (error) throw error;
        if (data) studentData = data;
      }

      // Attempt 2: Fetch by roll_no or roll_number
      if (!studentData) {
        let res = await supabase
          .from('students')
          .select('*')
          .or(`roll_no.eq.${cleanId},roll_number.eq.${cleanId}`)
          .maybeSingle();

        // Attempt 3: Fetch by just roll_no
        if (res.error || !res.data) {
          res = await supabase
            .from('students')
            .select('*')
            .eq('roll_no', cleanId)
            .maybeSingle();
        }

        // Attempt 4: Fetch by just roll_number
        if (res.error || !res.data) {
          res = await supabase
            .from('students')
            .select('*')
            .eq('roll_number', cleanId)
            .maybeSingle();
        }

        if (res.error) throw res.error;
        if (res.data) {
          studentData = res.data;
        }
      }

      if (studentData) {
        return normalizeStudent(studentData, cleanId);
      }

      // Final Fallback: Check mock data
      const mockStudent = getMockStudents().find((s) => s.roll_no === cleanId || s.id === cleanId);
      return mockStudent || null;

    } catch (err) {
      const appErr = handleSupabaseError(err, 'STUDENT-001', { operation: 'SELECT', resource: 'students' });
      logger.warn('STUDENT_SERVICE_SEARCH_EXCEPTION', { error: appErr });
      return null;
    }
  },

  /**
   * Creates a new student record, handling schema inconsistencies (legacy table columns).
   */
  async createStudent(studentPayload: Partial<Student>, traceId?: string): Promise<Student | null> {
    try {
      // Primary payload targeting newer schema
      const primaryPayload = {
        name: studentPayload.name,
        roll_no: studentPayload.roll_no,
        class_name: studentPayload.class_name,
        pin: studentPayload.pin,
        guardian_name: studentPayload.guardian_name,
        parent_phone: studentPayload.parent_phone,
        student_photo_url: studentPayload.student_photo_url,
        parent_photo_url: studentPayload.parent_photo_url,
      };

      let inserted: any = null;
      
      const { data: res1, error: err1 } = await supabase
        .from('students')
        .insert(primaryPayload)
        .select()
        .single();

      if (!err1 && res1) {
        inserted = res1;
      } else {
        logger.warn('STUDENT_SERVICE_INSERT_PRIMARY_FAILED_RETRYING_LEGACY', { error: err1?.message, traceId });
        
        // Legacy payload targeting older schema
        const legacyPayload = {
          name: studentPayload.name,
          roll_number: studentPayload.roll_no,
          class: studentPayload.class_name,
          pin: studentPayload.pin,
          guardian_name: studentPayload.guardian_name,
          parent_phone: studentPayload.parent_phone,
          student_photo_url: studentPayload.student_photo_url,
          parent_photo_url: studentPayload.parent_photo_url,
          emergency_contact_number: (studentPayload as any).emergency_contact_number,
          blood_group: (studentPayload as any).blood_group,
          parent_email: (studentPayload as any).parent_email,
        };

        const { data: res2, error: err2 } = await supabase
          .from('students')
          .insert(legacyPayload)
          .select()
          .single();

        if (!err2 && res2) {
          inserted = res2;
        } else {
          logger.error('STUDENT_SERVICE_INSERT_FAILED', { error: err2?.message, traceId });
          return null;
        }
      }

      const normalized = normalizeStudent(inserted, studentPayload.roll_no);

      // ── Parent Seeding ────────────────────────────────────────────────────────
      // If a parent email was provided, ensure a parent record exists in the
      // public.parents table and is linked to this student via student_parents.
      // This is required for the verify_and_link_parent RPC to succeed on
      // Google/PIN login. Without this, the parent cannot log in.
      const parentEmail = (studentPayload as any).parent_email?.trim()?.toLowerCase();
      if (parentEmail && inserted?.id) {
        try {
          // Upsert parent — safe if already exists (e.g., sibling onboarding)
          const { data: parentRow, error: parentErr } = await supabase
            .from('parents')
            .upsert(
              {
                email: parentEmail,
                name: studentPayload.guardian_name || 'Parent',
                phone: studentPayload.parent_phone || null,
              },
              { onConflict: 'email', ignoreDuplicates: false }
            )
            .select('id')
            .single();

          if (parentErr) {
            // Non-fatal — log and continue. Student was created successfully.
            logger.warn('STUDENT_SERVICE_PARENT_UPSERT_FAILED', {
              error: parentErr.message,
              parentEmail,
              traceId,
            });
          } else if (parentRow?.id) {
            // Link parent to student via junction table
            const { error: linkErr } = await supabase
              .from('student_parents')
              .upsert(
                {
                  student_id: inserted.id,
                  parent_id: parentRow.id,
                  relationship_type: 'Guardian',
                  is_primary: true,
                },
                { onConflict: 'student_id,parent_id', ignoreDuplicates: true }
              );

            if (linkErr) {
              logger.warn('STUDENT_SERVICE_PARENT_LINK_FAILED', {
                error: linkErr.message,
                parentId: parentRow.id,
                studentId: inserted.id,
                traceId,
              });
            } else {
              logger.info('STUDENT_SERVICE_PARENT_SEEDED', {
                parentEmail,
                parentId: parentRow.id,
                studentId: inserted.id,
                traceId,
              });
            }
          }
        } catch (parentSeedErr) {
          // Non-fatal — student creation succeeded; parent seeding is best-effort
          logger.warn('STUDENT_SERVICE_PARENT_SEED_EXCEPTION', {
            error: String(parentSeedErr),
            parentEmail,
            traceId,
          });
        }
      }
      // ─────────────────────────────────────────────────────────────────────────

      // Audit: student was successfully created
      auditLog({
        actor_type: 'parent',
        action: 'STUDENT_CREATED',
        resource_type: 'student',
        resource_id: normalized.id,
        metadata: {
          class_name: normalized.class_name,
          roll_no: normalized.roll_no,
          parent_email_seeded: !!parentEmail,
          traceId,
        },
      });

      return normalized;
    } catch (err) {
      const appErr = handleSupabaseError(err, 'STUDENT-002', { operation: 'INSERT', resource: 'students' });
      logger.error('STUDENT_SERVICE_CREATE_EXCEPTION', { error: appErr, traceId });
      return null;
    }
  },

  async deleteStudent(id: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      logger.error('STUDENT_DELETE_ERROR', { error: err });
      return false;
    }
  },

  async updateStudent(id: string, updates: Partial<Student>): Promise<boolean> {
    try {
      const { error } = await supabase.from('students').update(updates).eq('id', id);
      if (error) throw error;
      return true;
    } catch (err) {
      logger.error('STUDENT_UPDATE_ERROR', { error: err });
      return false;
    }
  }
};

