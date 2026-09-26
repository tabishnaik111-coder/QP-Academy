import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { getHeroStats } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";

// How often the numbers refresh while the home page is open
const REFRESH_INTERVAL_MS = 60000;

function Hero() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [heroStats, setHeroStats] = useState(null);

  // Starts true so logged-in students never see fake zeros first
  const [loading, setLoading] = useState(true);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /*
   * =========================================
   * LOAD HERO STATS
   *
   * showSpinner is false for silent background
   * refreshes, so the numbers update without flicker.
   * =========================================
   */

  const loadHeroStats = useCallback(
    async (showSpinner = true) => {
      // Still finding out whether the student is logged in
      if (authLoading) return;

      if (!isAuthenticated) {
        setHeroStats(null);
        setLoading(false);
        return;
      }

      try {
        if (showSpinner) setLoading(true);

        const response = await getHeroStats();

        if (
          isMountedRef.current &&
          response?.success &&
          response?.heroStats
        ) {
          setHeroStats(response.heroStats);
        }
      } catch (error) {
        console.error("Unable to load Hero statistics:", error);

        // A failed background refresh keeps what is already shown
        if (isMountedRef.current && showSpinner) {
          setHeroStats(null);
        }
      } finally {
        if (isMountedRef.current && showSpinner) {
          setLoading(false);
        }
      }
    },
    [authLoading, isAuthenticated]
  );

  useEffect(() => {
    loadHeroStats(true);
  }, [loadHeroStats]);

  /*
   * Keep the numbers live: refresh every minute and whenever
   * the student comes back to this tab (for example after
   * finishing a dictation in another tab).
   */

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const refresh = () => {
      if (document.visibilityState === "visible") {
        loadHeroStats(false);
      }
    };

    const intervalId = window.setInterval(
      refresh,
      REFRESH_INTERVAL_MS
    );

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [isAuthenticated, loadHeroStats]);

  const recentAttempts = useMemo(
    () => heroStats?.recentAttempts || [],
    [heroStats]
  );

  /*
   * The Hero graph always contains nine visual bars,
   * preserving the existing design.
   *
   * Actual attempts are shown chronologically. Empty
   * positions stay empty until the student has enough
   * attempts.
   */
  const graphBars = useMemo(() => {
    const bars = Array(9).fill(0);

    const attempts = recentAttempts.slice(-9);

    if (!attempts.length) {
      return bars;
    }

    const wpmValues = attempts.map(
      (attempt) => Number(attempt.wpm) || 0
    );

    const maxWpm = Math.max(...wpmValues);
    const minWpm = Math.min(...wpmValues);

    // Same WPM everywhere: give every real attempt the same height
    if (maxWpm === minWpm) {
      attempts.forEach((attempt, index) => {
        bars[bars.length - attempts.length + index] = 65;
      });

      return bars;
    }

    attempts.forEach((attempt, index) => {
      const wpm = Number(attempt.wpm) || 0;

      const normalized =
        ((wpm - minWpm) / (maxWpm - minWpm)) * 55 + 30;

      bars[bars.length - attempts.length + index] =
        Math.round(normalized);
    });

    return bars;
  }, [recentAttempts]);

  // Attempts shown in the graph, and where they start among the 9 bars
  const shownAttempts = recentAttempts.slice(-9);
  const barOffset = graphBars.length - shownAttempts.length;

  const latestWpm = Number(heroStats?.latestWpm) || 0;
  const wpmChange = Number(heroStats?.wpmChange) || 0;
  const latestAccuracy = Number(heroStats?.latestAccuracy) || 0;
  const totalAttempts = Number(heroStats?.totalAttempts) || 0;
  const streak = Number(heroStats?.streak) || 0;
  const courseProgress = Number(heroStats?.courseProgress) || 0;
  const totalEnrolledCourses = Number(heroStats?.totalEnrolledCourses) || 0;
  const globalRank = heroStats?.globalRank ?? null;
  const totalRanked = Number(heroStats?.totalRanked) || 0;

  const formattedWpmChange = `${
    wpmChange >= 0 ? "+" : ""
  }${wpmChange.toFixed(1)}%`;

  const safeProgress = Math.min(100, Math.max(0, courseProgress));

  const rankNote = globalRank
    ? totalRanked > 1
      ? `of ${totalRanked} students`
      : "You are on the board"
    : "Complete a test to rank";

  return (
    <section
      className="qpa-hero"
      aria-labelledby="qpa-hero-title"
    >
      <div className="qpa-hero-glow qpa-hero-glow-one"></div>
      <div className="qpa-hero-glow qpa-hero-glow-two"></div>

      <div className="qpa-container">
        <div className="qpa-hero-grid">
          <div className="qpa-hero-content">
            <div className="qpa-hero-eyebrow qpa-animate-up">
              <span className="qpa-hero-eyebrow-dot"></span>
              Learn. Practice. Master.
            </div>

            <h1
              id="qpa-hero-title"
              className="qpa-hero-title qpa-animate-up"
            >
              Turn your{" "}
              <span className="qpa-gradient-text">practice</span>{" "}
              into progress.
            </h1>

            <p className="qpa-hero-description qpa-animate-up">
              Build faster typing and dictation skills with
              structured courses, real practice tests,
              performance tracking and competitive
              leaderboards.
            </p>

            <div className="qpa-hero-actions qpa-animate-up">
              <Link
                to="/courses"
                className="qpa-btn qpa-btn-primary qpa-hero-primary-btn"
              >
                Explore Courses{" "}
                <span aria-hidden="true">→</span>
              </Link>

              <a
                href="#about"
                className="qpa-btn qpa-btn-secondary qpa-hero-secondary-btn"
              >
                How QPA Works
              </a>
            </div>

            <div className="qpa-hero-trust">
              <div
                className="qpa-trust-avatars"
                aria-hidden="true"
              >
                <span>Q</span>
                <span>P</span>
                <span>A</span>
              </div>

              <div className="qpa-trust-text">
                <strong>Practice with purpose.</strong>

                <span>
                  Track every improvement along the way.
                </span>
              </div>
            </div>
          </div>

          <div className="qpa-hero-visual">
            <div className="qpa-hero-orbit qpa-pulse"></div>

            <div className="qpa-floating-card qpa-floating-top qpa-float">
              <div className="qpa-floating-icon">↗</div>

              <div>
                <strong>
                  {loading ? "—" : formattedWpmChange}
                </strong>

                <span>Recent progress</span>
              </div>
            </div>

            <div className="qpa-hero-dashboard qpa-3d-card">
              <div className="qpa-dashboard-top">
                <div>
                  <span className="qpa-dashboard-label">
                    YOUR PERFORMANCE
                  </span>

                  <h3>Typing Performance</h3>
                </div>

                <span className="qpa-dashboard-status">
                  ● {isAuthenticated ? "Live" : "Preview"}
                </span>
              </div>

              <div className="qpa-speed-display">
                <div className="qpa-speed-number">
                  {loading ? "—" : latestWpm} <span>WPM</span>
                </div>

                <div className="qpa-speed-change">
                  {loading ? "—" : formattedWpmChange}
                </div>
              </div>

              <div
                className="qpa-mini-chart"
                aria-label="Recent WPM performance"
              >
                {graphBars.map((height, index) => {
                  const attempt = shownAttempts[index - barOffset];

                  return (
                    <span
                      key={index}
                      style={{ height: `${height || 0}%` }}
                      title={
                        attempt ? `${attempt.wpm} WPM` : undefined
                      }
                      aria-hidden="true"
                    ></span>
                  );
                })}
              </div>

              <div className="qpa-dashboard-stats">
                <div className="qpa-dashboard-stat">
                  <span>Accuracy</span>

                  <strong>
                    {loading
                      ? "—"
                      : `${latestAccuracy.toFixed(1)}%`}
                  </strong>
                </div>

                <div className="qpa-dashboard-stat">
                  <span>Tests</span>

                  <strong>
                    {loading ? "—" : totalAttempts}
                  </strong>
                </div>

                <div className="qpa-dashboard-stat">
                  <span>Streak</span>

                  <strong>
                    {loading
                      ? "—"
                      : `${streak} ${
                          streak === 1 ? "day" : "days"
                        }`}
                  </strong>
                </div>
              </div>

              <div className="qpa-progress-block">
                <div className="qpa-progress-heading">
                  <span>Course progress</span>

                  <strong>
                    {loading
                      ? "—"
                      : `${Math.round(courseProgress)}%`}
                  </strong>
                </div>

                {!loading && totalEnrolledCourses > 0 && (
                  <small className="qpa-progress-course">
                    Across {totalEnrolledCourses}{" "}
                    {totalEnrolledCourses === 1 ? "course" : "courses"}
                  </small>
                )}

                <div
                  className="qpa-progress-track"
                  role="progressbar"
                  aria-valuenow={Math.round(safeProgress)}
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-label="Course progress"
                >
                  <div
                    className="qpa-progress-value"
                    style={{ width: `${safeProgress}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <Link
              to="/leaderboard"
              className="qpa-floating-card qpa-floating-bottom qpa-floating-link"
            >
              <div className="qpa-floating-ranking">
                {loading ? "—" : globalRank ? `#${globalRank}` : "—"}
              </div>

              <div>
                <strong>Leaderboard</strong>

                <span>{rankNote}</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
