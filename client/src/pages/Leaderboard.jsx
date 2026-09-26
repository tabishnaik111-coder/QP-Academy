import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
  getCourseLeaderboard,
  getGlobalLeaderboard,
  getMyEnrollments,
} from "../services/api.js";

import { useAuth } from "../context/AuthContext.jsx";

const Leaderboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const courseId = searchParams.get("course");
  const mode = courseId ? "course" : "global";

  const { user } = useAuth();

  const currentUserId = user?._id || user?.id || null;

  const [leaderboard, setLeaderboard] = useState([]);
  const [course, setCourse] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Courses the logged-in student is enrolled in (for the course picker)
  const [myCourses, setMyCourses] = useState([]);

  /*
   * =========================================
   * LOAD LEADERBOARD
   *
   * showSpinner is false for silent background
   * refreshes (when you return to this tab).
   * =========================================
   */

  const loadLeaderboard = useCallback(
    async (showSpinner = true) => {
      try {
        if (showSpinner) setLoading(true);
        setError("");

        const data = courseId
          ? await getCourseLeaderboard(courseId)
          : await getGlobalLeaderboard();

        setCourse(courseId ? data.course || null : null);
        setLeaderboard(data.leaderboard || []);
      } catch (err) {
        console.error("Leaderboard loading error:", err);
        setError(err.message || "Unable to load leaderboard.");
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [courseId]
  );

  useEffect(() => {
    loadLeaderboard(true);
  }, [loadLeaderboard]);

  /*
   * Refresh automatically when the student comes back
   * to this tab, for example after finishing a test.
   */

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") {
        loadLeaderboard(false);
      }
    };

    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [loadLeaderboard]);

  /*
   * =========================================
   * LOAD MY COURSES (for the picker)
   * =========================================
   */

  useEffect(() => {
    if (!currentUserId) {
      setMyCourses([]);
      return;
    }

    let cancelled = false;

    const loadMyCourses = async () => {
      try {
        const data = await getMyEnrollments();

        if (cancelled) return;

        setMyCourses(
          (data.enrollments || [])
            .filter((item) => item.course)
            .map((item) => ({
              id: item.course._id,
              title: item.course.title,
            }))
        );
      } catch (err) {
        // The picker is optional, so a failure here is not shown
        console.error("Leaderboard courses error:", err);
      }
    };

    loadMyCourses();

    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  /*
   * =========================================
   * SWITCH HANDLERS
   * =========================================
   */

  const showGlobal = () => {
    setSearchParams({});
  };

  const handleCourseChange = (event) => {
    const value = event.target.value;

    if (value) {
      setSearchParams({ course: value });
    } else {
      setSearchParams({});
    }
  };

  // Make sure the selected course is always in the dropdown,
  // even if the student opened the link without being enrolled.
  const courseOptions = useMemo(() => {
    const options = [...myCourses];

    if (courseId && !options.some((item) => item.id === courseId)) {
      options.unshift({
        id: courseId,
        title: course?.title || "This course",
      });
    }

    return options;
  }, [myCourses, courseId, course]);

  /*
   * =========================================
   * CURRENT USER
   * =========================================
   */

  const isCurrentUser = (student) =>
    Boolean(currentUserId) &&
    String(student.userId) === String(currentUserId);

  const currentUserEntry = useMemo(
    () =>
      leaderboard.find(
        (student) =>
          Boolean(currentUserId) &&
          String(student.userId) === String(currentUserId)
      ) || null,
    [leaderboard, currentUserId]
  );

  const getRank = (student, index) => student.rank ?? index + 1;

  const topThree = leaderboard.slice(0, 3);

  const heading =
    mode === "course" ? "Course Rankings" : "Global Rankings";

  return (
    <main className="leaderboard-page">
      <section className="leaderboard-hero qpa-section">
        <div className="qpa-container">
          <div className="leaderboard-hero-content">
            <span className="qpa-badge">
              <i className="fa-solid fa-ranking-star" />
              {heading}
            </span>

            <h1>
              {mode === "course" && course
                ? course.title
                : "QPA Leaderboard"}
            </h1>

            <p>
              {mode === "course"
                ? "See the top performers in this course."
                : "Compete, improve and climb the QPA rankings."}
            </p>

            {/* =================================
                SWITCH: GLOBAL / COURSE
                ================================= */}

            <div className="leaderboard-switch">
              <button
                type="button"
                className={
                  mode === "global"
                    ? "leaderboard-switch-btn active"
                    : "leaderboard-switch-btn"
                }
                onClick={showGlobal}
                aria-pressed={mode === "global"}
              >
                <i className="fa-solid fa-globe" />
                Global
              </button>

              {courseOptions.length > 0 && (
                <label
                  className={
                    mode === "course"
                      ? "leaderboard-course-picker active"
                      : "leaderboard-course-picker"
                  }
                >
                  <i className="fa-solid fa-book-open" />

                  <select
                    value={courseId || ""}
                    onChange={handleCourseChange}
                    aria-label="Choose a course leaderboard"
                  >
                    <option value="">
                      Choose a course
                    </option>

                    {courseOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="leaderboard-content qpa-section-sm">
        <div className="qpa-container">
          {loading && (
            <div className="leaderboard-state">
              <div className="leaderboard-spinner">
                <i className="fa-solid fa-spinner fa-spin" />
              </div>

              <h2>Loading rankings...</h2>

              <p>
                We're fetching the latest performance
                results.
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="leaderboard-state leaderboard-error">
              <div className="leaderboard-state-icon">
                <i className="fa-solid fa-triangle-exclamation" />
              </div>

              <h2>Unable to load leaderboard</h2>

              <p>{error}</p>

              <button
                type="button"
                className="qpa-btn qpa-btn-primary"
                onClick={() => loadLeaderboard(true)}
              >
                <i className="fa-solid fa-rotate-right" />
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && leaderboard.length === 0 && (
            <div className="leaderboard-state">
              <div className="leaderboard-state-icon">
                <i className="fa-solid fa-ranking-star" />
              </div>

              <h2>No rankings yet</h2>

              <p>
                Complete a typing or dictation test to
                appear on the leaderboard.
              </p>

              <Link
                to="/courses"
                className="qpa-btn qpa-btn-primary"
              >
                Explore Courses
                <i className="fa-solid fa-arrow-right" />
              </Link>
            </div>
          )}

          {!loading && !error && leaderboard.length > 0 && (
            <>
              {/* =================================
                  TOP THREE
                  ================================= */}

              <div className="leaderboard-podium">
                {topThree.map((student, index) => (
                  <div
                    key={student.userId}
                    className={`leaderboard-podium-card rank-${
                      index + 1
                    }`}
                  >
                    <div className="leaderboard-podium-rank">
                      {index === 0 ? (
                        <i className="fa-solid fa-crown" />
                      ) : (
                        `#${index + 1}`
                      )}
                    </div>

                    <div className="leaderboard-avatar">
                      {student.profileImage ? (
                        <img
                          src={student.profileImage}
                          alt={student.name}
                        />
                      ) : (
                        <span>
                          {student.name
                            ?.charAt(0)
                            ?.toUpperCase()}
                        </span>
                      )}
                    </div>

                    <h3>{student.name}</h3>

                    <div className="leaderboard-podium-score">
                      {student.bestScore}
                    </div>

                    <span>Best Score</span>
                  </div>
                ))}
              </div>

              {/* =================================
                  YOUR POSITION
                  ================================= */}

              {currentUserEntry && (
                <div className="leaderboard-my-position">
                  <div>
                    <span>Your Position</span>
                    <strong>
                      #
                      {getRank(
                        currentUserEntry,
                        leaderboard.indexOf(currentUserEntry)
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Best Score</span>
                    <strong>{currentUserEntry.bestScore}</strong>
                  </div>

                  <div>
                    <span>Best WPM</span>
                    <strong>{currentUserEntry.bestWpm}</strong>
                  </div>

                  <div>
                    <span>Accuracy</span>
                    <strong>{currentUserEntry.bestAccuracy}%</strong>
                  </div>
                </div>
              )}

              {currentUserId && !currentUserEntry && (
                <div className="leaderboard-not-ranked">
                  <i className="fa-solid fa-circle-info" />

                  <span>
                    You are not ranked{" "}
                    {mode === "course"
                      ? "in this course"
                      : "yet"}
                    . Complete a typing or dictation test to
                    appear here.
                  </span>
                </div>
              )}

              {/* =================================
                  FULL TABLE
                  ================================= */}

              <div className="leaderboard-table-card">
                <div className="leaderboard-table-header">
                  <div>
                    <span className="qpa-badge">
                      Performance
                    </span>

                    <h2>{heading}</h2>
                  </div>

                  <span className="leaderboard-count">
                    {leaderboard.length}{" "}
                    {leaderboard.length === 1
                      ? "student"
                      : "students"}
                  </span>
                </div>

                <div className="leaderboard-table-wrapper">
                  <table className="leaderboard-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Student</th>
                        <th>Best Score</th>
                        <th>WPM</th>
                        <th>Accuracy</th>
                        <th>Tests</th>
                      </tr>
                    </thead>

                    <tbody>
                      {leaderboard.map((student, index) => {
                        const rank = getRank(student, index);
                        const isMe = isCurrentUser(student);

                        return (
                          <tr
                            key={student.userId}
                            className={isMe ? "current-user" : ""}
                          >
                            <td>
                              <span className="leaderboard-rank">
                                {rank <= 3 && (
                                  <i
                                    className={`fa-solid ${
                                      rank === 1
                                        ? "fa-medal"
                                        : "fa-award"
                                    }`}
                                  />
                                )}

                                {rank}
                              </span>
                            </td>

                            <td>
                              <div className="leaderboard-student">
                                <div className="leaderboard-table-avatar">
                                  {student.profileImage ? (
                                    <img
                                      src={student.profileImage}
                                      alt={student.name}
                                    />
                                  ) : (
                                    <span>
                                      {student.name
                                        ?.charAt(0)
                                        ?.toUpperCase()}
                                    </span>
                                  )}
                                </div>

                                <div>
                                  <strong>{student.name}</strong>

                                  {isMe && <small>You</small>}
                                </div>
                              </div>
                            </td>

                            <td>
                              <strong className="leaderboard-score">
                                {student.bestScore}
                              </strong>
                            </td>

                            <td>{student.bestWpm}</td>

                            <td>{student.bestAccuracy}%</td>

                            <td>{student.testsCompleted}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
};

export default Leaderboard;
