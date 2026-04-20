import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { submitRideReview } from '../../../services/api/ridesApi'
import { useToast } from '../../../shared/ui/Toast'
import { getErrorMessage } from '../../../shared/lib/errors'

export function RatingModal({ rideId, onComplete }) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const { addToast } = useToast()

  const reviewMutation = useMutation({
    mutationFn: (data) => submitRideReview(rideId, data),
    onSuccess: () => {
      addToast({
        title: 'Thank you!',
        message: 'Your review has been submitted successfully.',
        variant: 'success',
      })
      onComplete()
    },
    onError: (error) => {
      // If already submitted, just close the modal
      if (error?.response?.status === 400 && error?.response?.data?.detail?.includes('already submitted')) {
         onComplete()
         return
      }
      addToast({
        title: 'Submission Failed',
        message: getErrorMessage(error),
        variant: 'error',
      })
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    reviewMutation.mutate({ rating, comment })
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content rating-card">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
          <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700 }}>How was your ride?</h2>
          <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>Your feedback helps us improve.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="rating-stars">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className={`star-btn ${rating >= star ? 'active' : ''}`}
              >
                ★
              </button>
            ))}
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.9rem' }}>
              Add a comment (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us about your experience..."
              rows={4}
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '12px',
                border: '2px solid #e5e7eb',
                fontSize: '1rem',
                transition: 'border-color 0.2s',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={reviewMutation.isPending}
            style={{
              width: '100%',
              padding: '1rem',
              backgroundColor: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '1.1rem',
              cursor: reviewMutation.isPending ? 'wait' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.2), 0 2px 4px -1px rgba(59, 130, 246, 0.1)',
            }}
          >
            {reviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease-out;
        }
        .modal-content {
          background: #fff;
          padding: 2.5rem;
          border-radius: 24px;
          width: 90%;
          max-width: 450px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .rating-stars {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 2rem;
        }
        .star-btn {
          background: none;
          border: none;
          font-size: 2.5rem;
          color: #e5e7eb;
          cursor: pointer;
          transition: transform 0.2s, color 0.2s;
          padding: 0.25rem;
        }
        .star-btn:hover {
          transform: scale(1.1);
        }
        .star-btn.active {
          color: #fbbf24;
        }
        textarea:focus {
          border-color: #3b82f6;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
