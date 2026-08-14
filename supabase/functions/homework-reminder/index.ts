import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.1'

// VAPID keys must be set in your Supabase project's secrets
// Use `supabase secrets set VAPID_PUBLIC_KEY="..." VAPID_PRIVATE_KEY="..."`
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') || ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || ''
const VAPID_SUBJECT = 'mailto:admin@samsidh.com'

webpush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
)

serve(async (req) => {
  try {
    // 1. Init Supabase client with Service Role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 2. Calculate the time window (Homework due in the next 24 hours)
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    
    // 3. Find homework due within the next 24 hours
    const { data: dueHomework, error: hwError } = await supabase
      .from('homework')
      .select('*')
      .gte('due_date', now.toISOString())
      .lte('due_date', tomorrow.toISOString())

    if (hwError) throw hwError
    if (!dueHomework || dueHomework.length === 0) {
      return new Response(JSON.stringify({ message: 'No homework due soon' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let notificationsSent = 0

    // 4. For each homework, check who HAS NOT completed it
    for (const hw of dueHomework) {
      // Get completions for this specific homework
      const { data: completions } = await supabase
        .from('homework_completions')
        .select('student_id')
        .eq('homework_id', hw.id)

      const completedStudentIds = (completions || []).map(c => c.student_id)

      // Find all students in this class
      const { data: students } = await supabase
        .from('students')
        .select('id, guardian_name')
        .eq('class_name', hw.class_name)

      if (!students) continue

      // Filter to only those who haven't completed it
      const uncompletedStudents = students.filter(s => !completedStudentIds.includes(s.id))

      for (const student of uncompletedStudents) {
        // Look up their push subscription
        const { data: subs } = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('student_id', student.id)

        if (!subs || subs.length === 0) continue

        // Send a push notification to each registered device
        for (const sub of subs) {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          }

          try {
            await webpush.sendNotification(
              pushSubscription,
              JSON.stringify({
                title: 'Homework Reminder',
                body: `Don't forget! ${hw.subject} homework "${hw.title}" is due tomorrow.`,
                url: '/#/parent'
              })
            )
            notificationsSent++
          } catch (e) {
            console.error(`Failed to send push to ${student.id}:`, e)
            // If the endpoint is expired, we should delete it from the database (optional cleanup)
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, sent: notificationsSent }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Edge Function Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
