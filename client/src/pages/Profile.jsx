import { useCallback, useEffect, useState } from "react";

import { getProfileOverview } from "../services/api.js";

const defaultStatistics = {
  bestWpm: 0,
  bestAccuracy: 0,
  bestScore: 0,
  testsCompleted: 0,
  averageWpm: 0,
  averageAccuracy: 0,
  practiceMinutes: 0,
  lessonsCompleted: 0,
  coursesEnrolled: 0,
  coursesCompleted: 0,
  currentStreak: 0,
  longestStreak: 0,
  activeDays: 0,
};

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

const formatPracticeTime = (minutes) => {
  if (!minutes) return "0 min";

  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest ? `${hours} h ${rest} min` : `${hours} h`;
};

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [statistics, setStatistics] = useState(defaultStatistics);
  const [trend, setTrend] = useState([]);
  const [recentResults, setRecentResults] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /*
   * =========================================
   * LOAD PROFILE
   *
   * showSpinner is false for silent background
   * refreshes, so the page does not flash.
   * =========================================
   */

  const loadProfile = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      setError("");

      const data = await getProfileOverview();

      setProfile(data.profile);
      setStatistics({ ...defaultStatistics, ...data.statistics });
      setTrend(data.trend || []);
      setRecentResults(data.recentResults || []);
    } catch (err) {
      console.error("Profile loading error:", err);
      setError(err.message || "Unable to load profile.");
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile(true);
  }, [loadProfile]);

  /*
   * Refresh automatically when the student comes back
   * to this tab, for example after finishing a lesson.
   */

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") {
        loadProfile(false);
      }
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [loadProfile]);

  if (loading) {
    return (
      <main className="profile-page">
        <section className="qpa-section">
          <div className="qpa-container">
            <div className="profile-state">
              <i className="fa-solid fa-spinner fa-spin" />
              <h2>Loading profile...</h2>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (error && !profile) {
    return (
      <main className="profile-page">
        <section className="qpa-section">
          <div className="qpa-container">
            <div className="profile-state profile-error">
              <i className="fa-solid fa-triangle-exclamation" />

              <h2>Unable to load profile</h2>

              <p>{error}</p>

              <button
                type="button"
                className="qpa-btn qpa-btn-primary"
                onClick={() => loadProfile(true)}
              >
                <i className="fa-solid fa-rotate-right" />
                Try Again
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const initials =
    profile?.name
      ?.split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "Q";

  const maxWpm = Math.max(1, ...trend.map((point) => point.wpm));

  const statCards = [
    {
      icon: "fa-gauge-high",
      label: "Best WPM",
      value: statistics.bestWpm,
    },
    {
      icon: "fa-bullseye",
      label: "Best Accuracy",
      value: `${statistics.bestAccuracy}%`,
    },
    {
      icon: "fa-star",
      label: "Best Score",
      value: statistics.bestScore,
    },
    {
      icon: "fa-keyboard",
      label: "Attempts",
      value: statistics.testsCompleted,
    },
    {
      icon: "fa-chart-line",
      label: "Average WPM",
      value: statistics.averageWpm,
    },
    {
      icon: "fa-chart-pie",
      label: "Average Accuracy",
      value: `${statistics.averageAccuracy}%`,
    },
    {
      icon: "fa-fire",
      label: "Current Streak",
      value: `${statistics.currentStreak} ${
        statistics.currentStreak === 1 ? "day" : "days"
      }`,
    },
    {
      icon: "fa-circle-check",
      label: "Lessons Completed",
      value: statistics.lessonsCompleted,
    },
  ];

  return (
    <main className="profile-page">
      <section className="profile-hero qpa-section">
        <div className="qpa-container">
          <div className="profile-header-card">
            <div className="profile-avatar">
              {profile?.profileImage ? (
                <img
                  src={profile.profileImage}
                  alt={profile.name}
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>

            <div className="profile-header-info">
              <span className="qpa-badge">
                <i className="fa-solid fa-user" />
                Student Profile
              </span>

              <h1>{profile?.name}</h1>

              <p>{profile?.email}</p>

              <div className="profile-chips">
                <span>
                  <i className="fa-solid fa-book-open" />
                  {statistics.coursesEnrolled}{" "}
                  {statistics.coursesEnrolled === 1
                    ? "course"
                    : "courses"}{" "}
                  enrolled
                </span>

                <span>
                  <i className="fa-solid fa-trophy" />
                  {statistics.coursesCompleted} completed
                </span>

                <span>
                  <i className="fa-regular fa-clock" />
                  {formatPracticeTime(statistics.practiceMinutes)}{" "}
                  practiced
                </span>

                {profile?.memberSince && (
                  <span>
                    <i className="fa-regular fa-calendar" />
                    Member since {formatDate(profile.memberSince)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="profile-content qpa-section-sm">
        <div className="qpa-container">
          <div className="profile-section-heading">
            <span className="qpa-badge">Performance</span>

            <h2>Your Statistics</h2>

            <p>
              Track your progress and improve your typing
              performance.
            </p>
          </div>

          <div className="profile-stat-grid">
            {statCards.map((card) => (
              <div className="profile-stat-card" key={card.label}>
                <div className="profile-stat-icon">
                  <i className={`fa-solid ${card.icon}`} />
                </div>

                <span>{card.label}</span>

                <strong>{card.value}</strong>
              </div>
            ))}
          </div>

          {statistics.longestStreak > 0 && (
            <p className="profile-streak-note">
              <i className="fa-solid fa-fire" />
              Longest streak: {statistics.longestStreak}{" "}
              {statistics.longestStreak === 1 ? "day" : "days"}
              {" • "}
              {statistics.activeDays} active{" "}
              {statistics.activeDays === 1 ? "day" : "days"}
            </p>
          )}

          {/* =================================
              WPM TREND
              ================================= */}

          {trend.length > 0 && (
            <div className="profile-trend-card">
              <div className="profile-trend-header">
                <div>
                  <span className="qpa-badge">Progress</span>

                  <h2>Speed trend</h2>
                </div>

                <span className="profile-result-count">
                  Last {trend.length}{" "}
                  {trend.length === 1 ? "attempt" : "attempts"}
                </span>
              </div>

              <div className="profile-trend">
                {trend.map((point, index) => (
                  <div
                    className="profile-trend-col"
                    key={`${point.completedAt}-${index}`}
                    title={`${point.wpm} WPM • ${
                      point.accuracy
                    }% accuracy • ${formatDate(point.completedAt)}`}
                  >
                    <small>{point.wpm}</small>

                    <div className="profile-trend-track">
                      <span
                        className="profile-trend-bar"
                        style={{
                          height: `${Math.max(
                            6,
                            (point.wpm / maxWpm) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =================================
              RECENT RESULTS
              ================================= */}

          <div className="profile-results-card">
            <div className="profile-results-header">
              <div>
                <span className="qpa-badge">History</span>

                <h2>Recent Results</h2>
              </div>

              <span className="profile-result-count">
                {recentResults.length}{" "}
                {recentResults.length === 1 ? "result" : "results"}
              </span>
            </div>

            {recentResults.length === 0 ? (
              <div className="profile-empty">
                <i className="fa-solid fa-chart-simple" />

                <h3>No results yet</h3>

                <p>
                  Complete a dictation or test to start tracking
                  your performance.
                </p>
              </div>
            ) : (
              <div className="profile-results-list">
                {recentResults.map((result) => (
                  <div
                    className="profile-result-row"
                    key={result.id}
                  >
                    <div className="profile-result-main">
                      <div className="profile-result-icon">
                        <i
                          className={
                            result.kind === "dictation"
                              ? "fa-solid fa-headphones"
                              : "fa-solid fa-keyboard"
                          }
                        />
                      </div>

                      <div>
                        <strong>{result.title}</strong>

                        <span>
                          {result.courseTitle}
                          {" • "}
                          {formatDate(result.completedAt)}
                        </span>
                      </div>
                    </div>

                    <div className="profile-result-metric">
                      <span>WPM</span>
                      <strong>{result.wpm}</strong>
                    </div>

                    <div className="profile-result-metric">
                      <span>Accuracy</span>
                      <strong>{result.accuracy}%</strong>
                    </div>

                    <div className="profile-result-metric">
                      <span>Score</span>
                      <strong>{result.score}</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
};

export default Profile;
