import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import LoadingSpinner from "../components/LoadingSpinner";
import { useAuth } from "../context/AuthContext";
import { getMyEnrollments } from "../services/api";

/*
 * Turns a date into "just now", "5 min ago", "3 days ago", etc.
 */
const timeAgo = (dateValue) => {
  if (!dateValue) return "";

  const seconds = Math.floor(
    (Date.now() - new Date(dateValue).getTime()) / 1000
  );

  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;

  return new Date(dateValue).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const Dashboard = () => {
  const { user } = useAuth();

  const firstName = user?.name?.split(" ")[0] || "Student";

  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /*
   * =========================================
   * LOAD MY ENROLLMENTS
   *
   * showSpinner is false on background refreshes
   * so the page does not flash when you come back
   * to this tab.
   * =========================================
   */

  const loadEnrollments = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      setError("");

      const data = await getMyEnrollments();

      // Ignore enrollments whose course was deleted
      setEnrollments(
        (data.enrollments || []).filter((item) => item.course)
      );
    } catch (err) {
      console.error("Dashboard enrollments error:", err);
      setError(err.message || "Unable to load your courses.");
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEnrollments(true);
  }, [loadEnrollments]);

  /*
   * Refresh automatically when the student comes back
   * to this tab (for example after finishing a lesson).
   */

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") {
        loadEnrollments(false);
      }
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [loadEnrollments]);

  /*
   * =========================================
   * STATS (calculated from real enrollments)
   * =========================================
   */

  const stats = useMemo(() => {
    const total = enrollments.length;

    const completed = enrollments.filter(
      (item) => item.status === "completed"
    ).length;

    const inProgress = total - completed;

    const averageProgress =
      total === 0
        ? 0
        : Math.round(
            enrollments.reduce(
              (sum, item) => sum + (item.progressPercentage || 0),
              0
            ) / total
          );

    return { total, completed, inProgress, averageProgress };
  }, [enrollments]);

  /*
   * =========================================
   * RECENT ACTIVITY (built from enrollment dates)
   * =========================================
   */

  const activities = useMemo(() => {
    const items = [];

    enrollments.forEach((item) => {
      if (item.enrolledAt) {
        items.push({
          id: `enrolled-${item._id}`,
          icon: "📚",
          text: `Enrolled in ${item.course.title}`,
          date: item.enrolledAt,
        });
      }

      if (item.completedAt) {
        items.push({
          id: `completed-${item._id}`,
          icon: "🏆",
          text: `Completed ${item.course.title}`,
          date: item.completedAt,
        });
      }
    });

    return items
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 6);
  }, [enrollments]);

  const visibleCourses = enrollments.slice(0, 4);

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <div className="qpa-container">
          <div className="dashboard-hero-content">
            <div>
              <span className="dashboard-eyebrow">
                STUDENT DASHBOARD
              </span>

              <h1>
                Welcome back,{" "}
                <span>{firstName}.</span>
              </h1>

              <p>
                Keep practicing, track your progress and
                become faster every day.
              </p>
            </div>

            <Link
              to="/courses"
              className="qpa-button qpa-button-primary"
            >
              Explore Courses
            </Link>
          </div>
        </div>
      </section>

      <main className="dashboard-main">
        <div className="qpa-container">

          {/* =================================
              STATS
              ================================= */}

          <section className="dashboard-stats">
            <article className="dashboard-stat-card">
              <div className="dashboard-stat-icon">📚</div>

              <div>
                <span>Enrolled Courses</span>
                <strong>{stats.total}</strong>
              </div>
            </article>

            <article className="dashboard-stat-card">
              <div className="dashboard-stat-icon">⚡</div>

              <div>
                <span>In Progress</span>
                <strong>{stats.inProgress}</strong>
              </div>
            </article>

            <article className="dashboard-stat-card">
              <div className="dashboard-stat-icon">🏆</div>

              <div>
                <span>Completed</span>
                <strong>{stats.completed}</strong>
              </div>
            </article>

            <article className="dashboard-stat-card">
              <div className="dashboard-stat-icon">🎯</div>

              <div>
                <span>Average Progress</span>
                <strong>{stats.averageProgress}%</strong>
              </div>
            </article>
          </section>

          <section className="dashboard-grid">

            {/* =================================
                COURSE PROGRESS
                ================================= */}

            <article className="dashboard-panel dashboard-progress-panel">
              <div className="dashboard-panel-header">
                <div>
                  <span className="dashboard-panel-label">
                    YOUR LEARNING
                  </span>

                  <h2>Course Progress</h2>
                </div>

                <Link to="/courses">
                  View all
                </Link>
              </div>

              {loading ? (
                <div className="dashboard-empty">
                  <LoadingSpinner />
                  <p>Loading your courses...</p>
                </div>
              ) : error ? (
                <div className="dashboard-empty">
                  <div className="dashboard-empty-icon">⚠️</div>

                  <h3>Could not load your courses</h3>

                  <p>{error}</p>

                  <button
                    type="button"
                    className="qpa-button qpa-button-secondary"
                    onClick={() => loadEnrollments(true)}
                  >
                    Try again
                  </button>
                </div>
              ) : visibleCourses.length === 0 ? (
                <div className="dashboard-empty">
                  <div className="dashboard-empty-icon">📖</div>

                  <h3>No courses yet</h3>

                  <p>
                    Enroll in a course to start tracking
                    your learning progress.
                  </p>

                  <Link
                    to="/courses"
                    className="qpa-button qpa-button-secondary"
                  >
                    Browse Courses
                  </Link>
                </div>
              ) : (
                <div className="dashboard-course-list">
                  {visibleCourses.map((item) => {
                    const course = item.course;
                    const progress = Math.round(
                      item.progressPercentage || 0
                    );
                    const isCompleted =
                      item.status === "completed";

                    return (
                      <div
                        className="dashboard-course-item"
                        key={item._id}
                      >
                        <div className="dashboard-course-thumb">
                          {course.thumbnail ? (
                            <img
                              src={course.thumbnail}
                              alt={course.title}
                            />
                          ) : (
                            <span>🎓</span>
                          )}
                        </div>

                        <div className="dashboard-course-info">
                          <h3>{course.title}</h3>

                          <small>
                            {course.category}
                            {course.totalLessons
                              ? ` • ${course.totalLessons} lessons`
                              : ""}
                          </small>

                          <div className="dashboard-progress-row">
                            <div
                              className="dashboard-progress-bar"
                              role="progressbar"
                              aria-valuenow={progress}
                              aria-valuemin={0}
                              aria-valuemax={100}
                            >
                              <span
                                style={{ width: `${progress}%` }}
                              />
                            </div>

                            <strong>{progress}%</strong>
                          </div>
                        </div>

                        <Link
                          to={`/learn/${course.slug}`}
                          className="qpa-button qpa-button-secondary"
                        >
                          {isCompleted
                            ? "Review"
                            : progress > 0
                            ? "Continue"
                            : "Start"}
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </article>

            {/* =================================
                RECENT ACTIVITY
                ================================= */}

            <article className="dashboard-panel dashboard-activity-panel">
              <div className="dashboard-panel-header">
                <div>
                  <span className="dashboard-panel-label">
                    ACTIVITY
                  </span>

                  <h2>Recent Activity</h2>
                </div>
              </div>

              {activities.length === 0 ? (
                <div className="dashboard-empty dashboard-empty-small">
                  <div className="dashboard-empty-icon">✨</div>

                  <h3>Your activity will appear here</h3>

                  <p>
                    Complete lessons and typing tests to
                    build your activity history.
                  </p>
                </div>
              ) : (
                <ul className="dashboard-activity-list">
                  {activities.map((activity) => (
                    <li key={activity.id}>
                      <span className="dashboard-activity-icon">
                        {activity.icon}
                      </span>

                      <div>
                        <p>{activity.text}</p>
                        <small>{timeAgo(activity.date)}</small>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </article>

          </section>

          {/* =================================
              QUICK ACTIONS
              ================================= */}

          <section className="dashboard-quick-section">
            <div className="dashboard-section-heading">
              <div>
                <span className="dashboard-panel-label">
                  QUICK ACTIONS
                </span>

                <h2>Keep moving forward</h2>
              </div>
            </div>

            <div className="dashboard-actions">

              <Link
                to="/courses"
                className="dashboard-action-card"
              >
                <div className="dashboard-action-icon">📚</div>

                <div>
                  <h3>Explore Courses</h3>
                  <p>
                    Find your next course and start
                    learning.
                  </p>
                </div>

                <span>→</span>
              </Link>

              <Link
                to="/leaderboard"
                className="dashboard-action-card"
              >
                <div className="dashboard-action-icon">🏆</div>

                <div>
                  <h3>Leaderboard</h3>
                  <p>
                    See how your performance compares.
                  </p>
                </div>

                <span>→</span>
              </Link>

              <Link
                to="/profile"
                className="dashboard-action-card"
              >
                <div className="dashboard-action-icon">👤</div>

                <div>
                  <h3>Your Profile</h3>
                  <p>
                    Manage your account and personal
                    information.
                  </p>
                </div>

                <span>→</span>
              </Link>

            </div>
          </section>

        </div>
      </main>
    </div>
  );
};

export default Dashboard;
