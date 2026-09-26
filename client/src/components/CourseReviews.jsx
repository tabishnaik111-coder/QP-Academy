import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import {
  getCourseReviews,
  getMyCourseReview,
  saveCourseReview,
  deleteCourseReview,
} from "../services/api";

const MAX_COMMENT_LENGTH = 1000;

const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/*
 * Read-only stars (0 to 5).
 */
const Stars = ({ value }) => (
  <span
    className="course-reviews-stars"
    role="img"
    aria-label={`${value} out of 5 stars`}
  >
    {[1, 2, 3, 4, 5].map((star) => (
      <i
        key={star}
        className={
          star <= Math.round(value)
            ? "fa-solid fa-star"
            : "fa-regular fa-star"
        }
      />
    ))}
  </span>
);

const emptySummary = {
  average: 0,
  count: 0,
  breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
};

/*
 * Props:
 *  courseId         - the course being reviewed
 *  onSummaryChange  - called with { average, count } after a
 *                     review is saved or deleted, so the
 *                     course page header can update.
 */
const CourseReviews = ({ courseId, onSummaryChange }) => {
  const { user } = useAuth();

  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState(emptySummary);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [canReview, setCanReview] = useState(false);
  const [myReview, setMyReview] = useState(null);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");

  const [saving, setSaving] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState("");

  /*
   * =========================================
   * LOAD PUBLIC REVIEWS
   * =========================================
   */

  const loadReviews = useCallback(async () => {
    try {
      setError("");

      const data = await getCourseReviews(courseId);

      setReviews(data.reviews || []);
      setSummary(data.summary || emptySummary);
    } catch (err) {
      console.error("Reviews loading error:", err);
      setError(err.message || "Unable to load reviews.");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (courseId) {
      setLoading(true);
      loadReviews();
    }
  }, [courseId, loadReviews]);

  /*
   * =========================================
   * LOAD MY REVIEW + PERMISSION
   * =========================================
   */

  useEffect(() => {
    if (!courseId || !user) {
      setCanReview(false);
      setMyReview(null);
      setRating(0);
      setComment("");
      return;
    }

    let cancelled = false;

    const loadMine = async () => {
      try {
        const data = await getMyCourseReview(courseId);

        if (cancelled) return;

        setCanReview(data.canReview === true);
        setMyReview(data.review || null);
        setRating(data.review?.rating || 0);
        setComment(data.review?.comment || "");
      } catch (err) {
        console.error("My review loading error:", err);

        if (!cancelled) {
          setCanReview(false);
          setMyReview(null);
        }
      }
    };

    loadMine();

    return () => {
      cancelled = true;
    };
  }, [courseId, user]);

  /*
   * =========================================
   * SAVE / DELETE
   * =========================================
   */

  const updateSummary = (newSummary) => {
    if (!newSummary) return;

    setSummary(newSummary);

    if (onSummaryChange) {
      onSummaryChange({
        average: newSummary.average,
        count: newSummary.count,
      });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setFormMessage("");
    setFormError("");

    if (rating < 1) {
      setFormError("Please choose a star rating.");
      return;
    }

    try {
      setSaving(true);

      const data = await saveCourseReview(courseId, {
        rating,
        comment,
      });

      setMyReview(data.review);
      updateSummary(data.summary);
      setFormMessage("Thank you! Your review has been saved.");

      await loadReviews();
    } catch (err) {
      console.error("Save review error:", err);
      setFormError(err.message || "Unable to save your review.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete your review?")) return;

    setFormMessage("");
    setFormError("");

    try {
      setSaving(true);

      const data = await deleteCourseReview(courseId);

      setMyReview(null);
      setRating(0);
      setComment("");
      updateSummary(data.summary);
      setFormMessage("Your review has been deleted.");

      await loadReviews();
    } catch (err) {
      console.error("Delete review error:", err);
      setFormError(err.message || "Unable to delete your review.");
    } finally {
      setSaving(false);
    }
  };

  const shownRating = hoverRating || rating;

  return (
    <section className="course-reviews" id="reviews">
      <div className="course-reviews-heading">
        <span className="course-panel-eyebrow">Reviews</span>

        <h2>What students say</h2>
      </div>

      {/* =================================
          SUMMARY
          ================================= */}

      <div className="course-reviews-summary">
        <div className="course-reviews-average">
          <strong>
            {Number(summary.average || 0).toFixed(1)}
          </strong>

          <Stars value={summary.average || 0} />

          <span>
            {summary.count}{" "}
            {summary.count === 1 ? "review" : "reviews"}
          </span>
        </div>

        <div className="course-reviews-breakdown">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = summary.breakdown?.[star] || 0;

            const percent =
              summary.count > 0
                ? Math.round((count / summary.count) * 100)
                : 0;

            return (
              <div
                className="course-reviews-bar-row"
                key={star}
              >
                <span>{star} ★</span>

                <div className="course-reviews-bar">
                  <span style={{ width: `${percent}%` }} />
                </div>

                <small>{count}</small>
              </div>
            );
          })}
        </div>
      </div>

      {/* =================================
          REVIEW FORM
          ================================= */}

      <div className="course-reviews-form-card">
        {!user ? (
          <p className="course-reviews-note">
            <Link to="/login">Log in</Link> and enroll in this
            course to leave a review.
          </p>
        ) : !canReview ? (
          <p className="course-reviews-note">
            Enroll in this course to leave a review.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <h3>
              {myReview ? "Update your review" : "Rate this course"}
            </h3>

            <div
              className="course-reviews-star-input"
              role="radiogroup"
              aria-label="Your rating"
              onMouseLeave={() => setHoverRating(0)}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  role="radio"
                  aria-checked={rating === star}
                  aria-label={`${star} star${star > 1 ? "s" : ""}`}
                  className={
                    star <= shownRating ? "active" : ""
                  }
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                >
                  <i
                    className={
                      star <= shownRating
                        ? "fa-solid fa-star"
                        : "fa-regular fa-star"
                    }
                  />
                </button>
              ))}
            </div>

            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              maxLength={MAX_COMMENT_LENGTH}
              rows={4}
              placeholder="Share what you liked or what could be better (optional)"
            />

            <div className="course-reviews-form-footer">
              <small>
                {comment.length}/{MAX_COMMENT_LENGTH}
              </small>

              <div className="course-reviews-form-actions">
                {myReview && (
                  <button
                    type="button"
                    className="qpa-btn qpa-btn-secondary"
                    onClick={handleDelete}
                    disabled={saving}
                  >
                    Delete
                  </button>
                )}

                <button
                  type="submit"
                  className="qpa-btn qpa-btn-primary"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : myReview
                    ? "Update review"
                    : "Submit review"}
                </button>
              </div>
            </div>

            {formError && (
              <p className="course-reviews-error">{formError}</p>
            )}

            {formMessage && (
              <p className="course-reviews-success">
                {formMessage}
              </p>
            )}
          </form>
        )}
      </div>

      {/* =================================
          REVIEW LIST
          ================================= */}

      {loading ? (
        <p className="course-reviews-note">Loading reviews...</p>
      ) : error ? (
        <p className="course-reviews-error">{error}</p>
      ) : reviews.length === 0 ? (
        <p className="course-reviews-note">
          No reviews yet. Be the first to review this course.
        </p>
      ) : (
        <ul className="course-reviews-list">
          {reviews.map((review) => (
            <li key={review.id}>
              <div className="course-reviews-avatar">
                {review.profileImage ? (
                  <img
                    src={review.profileImage}
                    alt={review.name}
                  />
                ) : (
                  <span>
                    {review.name?.charAt(0)?.toUpperCase()}
                  </span>
                )}
              </div>

              <div className="course-reviews-body">
                <div className="course-reviews-meta">
                  <strong>{review.name}</strong>

                  <Stars value={review.rating} />

                  <small>{formatDate(review.createdAt)}</small>
                </div>

                {review.comment && <p>{review.comment}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default CourseReviews;
