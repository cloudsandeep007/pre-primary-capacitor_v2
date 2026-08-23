import { useState, useEffect } from 'react';
import { Star, Send, ExternalLink } from 'lucide-react';
import { Student } from '@/lib/types';
import { feedbackService } from '@/services/feedbackService';
import { Button } from '@/components/Button';
import { Spinner } from '@/components/Spinner';
import { showToast } from '@/components/Toast';
import { supabase } from '@/lib/supabase';

interface ParentFeedbackTabProps {
  student: Student;
}

export function ParentFeedbackTab({ student }: ParentFeedbackTabProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [googleUrl, setGoogleUrl] = useState<string | null>(null);
  const [isLinkedGoogle, setIsLinkedGoogle] = useState(false);

  useEffect(() => {
    feedbackService.getGoogleReviewUrl().then(setGoogleUrl);
    supabase.auth.getSession().then(({ data }) => {
      setIsLinkedGoogle(data.session?.user.app_metadata.provider === 'google');
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      showToast('error', 'Please select a rating.');
      return;
    }

    setIsSubmitting(true);
    try {
      // In a real app we'd fetch the parent_id securely, but here we can rely on RLS handling the insert if they're a parent,
      // or we just omit parent_id if it's tied to auth.uid() automatically. 
      // For now, passing student_id.
      const session = await supabase.auth.getSession();
      
      await feedbackService.submitFeedback({
        student_id: student.id,
        rating_overall: rating,
        comments,
        is_public_review_clicked: false
      });
      setSubmitted(true);
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleClick = async () => {
    // Ideally update is_public_review_clicked
    if (googleUrl) {
      window.open(googleUrl, '_blank');
    }
  };

  if (submitted) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-2xl shadow-sm text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Star className="w-8 h-8 fill-current" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Thank You!</h3>
        <p className="text-gray-600 mb-8">
          Your feedback has been securely submitted to the school administration. We appreciate your time!
        </p>

        {googleUrl && rating >= 4 && isLinkedGoogle && (
          <div className="border-t border-gray-100 pt-6">
            <p className="text-sm text-gray-500 mb-4">Would you like to share your experience publicly?</p>
            <Button 
              onClick={handleGoogleClick}
              className="w-full flex justify-center items-center gap-2"
              variant="secondary"
            >
              <ExternalLink size={18} />
              Review us on Google
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-2xl shadow-sm">
      <h3 className="text-xl font-bold text-gray-800 mb-2">School Feedback</h3>
      <p className="text-gray-500 text-sm mb-6">
        Your feedback helps us improve. This will be shared privately with the school administration.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
            How would you rate your overall experience?
          </label>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => setRating(star)}
                className="p-1 focus:outline-none transition-transform hover:scale-110"
              >
                <Star
                  className={`w-10 h-10 ${
                    star <= (hoveredRating || rating)
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-200'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Comments (Optional)
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none h-32"
            placeholder="Tell us what you love or what we can improve..."
          />
        </div>

        <Button 
          type="submit" 
          className="w-full flex justify-center items-center gap-2 !bg-teal-600 hover:!bg-teal-700" 
          disabled={isSubmitting || rating === 0}
        >
          {isSubmitting ? <Spinner size={16} className="text-white" /> : <Send size={18} />}
          {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </Button>
      </form>
    </div>
  );
}
