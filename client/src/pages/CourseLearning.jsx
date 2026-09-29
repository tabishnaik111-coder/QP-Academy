import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import LoadingSpinner from "../components/LoadingSpinner";

import {
  getCourseBySlug,
  getCourseProgress,
  updateLessonProgress,
  submitDictation,
  getLatestDictationResult,
} from "../services/api";

/* =========================================================
   DICTATION FLOW CONSTANTS
   ========================================================= */

// Fallback recorded speed for lessons that have no `wpm` saved.
// Selecting a faster/slower WPM sets
// audio.playbackRate = chosenWpm / recordedWpm (lesson.wpm).
const BASE_WPM = 60;

// Typing time limits (minutes). The student can pick anything
// between MIN_TYPING_MINUTES and ABSOLUTE_MAX_MINUTES.
const MIN_TYPING_MINUTES = 1;
const ABSOLUTE_MAX_MINUTES = 60;

const MIN_TYPING_SECONDS = MIN_TYPING_MINUTES * 60;
const MAX_TYPING_SECONDS = ABSOLUTE_MAX_MINUTES * 60;

const WPM_OPTIONS = [60, 70, 80, 95, 110, 120, 130, 150, 170];

// How long a student gets with their notes before typing auto-opens.
const NOTES_COUNTDOWN_SECONDS = 5 * 60;

const formatClock = (totalSeconds) => {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
};

const CourseLearning = () => {
  const { slug } = useParams();

  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);

  const [courseContentOpen, setCourseContentOpen] = useState(true);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /*
   * =========================================
   * DICTATION STATE
   * =========================================
   *
   * stage: "setup" | "notes" | "duration" | "typing" | "result"
   */

  const [stage, setStage] = useState("setup");
  const [typedText, setTypedText] = useState("");
  const [dictationResult, setDictationResult] = useState(null);

  // Listening-setup controls
  const [selectedWpm, setSelectedWpm] = useState(BASE_WPM);
  const [durationMinutes, setDurationMinutes] = useState(MIN_TYPING_MINUTES);
  const [durationSeconds, setDurationSeconds] = useState(0);

  // Notes countdown
  const [notesRemaining, setNotesRemaining] = useState(
    NOTES_COUNTDOWN_SECONDS
  );

  // Typing timer
  const [hasStartedTyping, setHasStartedTyping] = useState(false);
  const [typingTimeRemaining, setTypingTimeRemaining] = useState(0);
  const [timeUp, setTimeUp] = useState(false);

  /*
   * =========================================
   * REFS
   * =========================================
   */

  const audioRef = useRef(null);
  const typingInputRef = useRef(null);
  const typingStartedAtRef = useRef(null);

  /*
   * =========================================
   * LOAD COURSE
   * =========================================
   */

  useEffect(() => {
    const loadCourse = async () => {
      try {
        setLoading(true);
        setError("");

        const courseData = await getCourseBySlug(slug);

        setCourse(courseData.course);

        try {
          const progressData = await getCourseProgress(
            courseData.course._id
          );

          setModules(progressData.modules || []);
        } catch (progressError) {
          console.error(
            "Course progress loading error:",
            progressError
          );

          /*
           * Lesson content and audio are only sent to enrolled
           * students. If that request fails, show the real reason
           * instead of a half-empty lesson page.
           * (403 = no enrollment or purchase record.)
           */

          setCourse(null);

          setError(
            progressError.status === 403
              ? "You are not enrolled in this course yet. Open the course page to enroll or buy it."
              : progressError.status === 401
              ? "Your session has expired. Please log in again."
              : progressError.message ||
                "Unable to load the lessons for this course."
          );

          /*
           * The public course data no longer contains lesson
           * content, transcripts or audio, so falling back to it
           * would only show a half-empty lesson page.
           */

          return;
        }
      } catch (err) {
        console.error(
          "Course learning loading error:",
          err
        );

        setError(
          err.message || "Unable to load this course."
        );
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      loadCourse();
    }
  }, [slug]);

  /*
   * =========================================
   * RESET DICTATION STATE
   * =========================================
   */

  useEffect(() => {
    setStage("setup");
    setTypedText("");
    setDictationResult(null);
    setHasStartedTyping(false);
    setTimeUp(false);
    setNotesRemaining(NOTES_COUNTDOWN_SECONDS);
    setError("");

    typingStartedAtRef.current = null;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    if (selectedLesson?.type === "dictation") {
      // Typing time starts at the minimum; the student picks
      // anything from the minimum up to the maximum.
      setDurationMinutes(MIN_TYPING_MINUTES);
      setDurationSeconds(0);
      setSelectedWpm(selectedLesson.wpm || BASE_WPM);
      setTypingTimeRemaining(MIN_TYPING_SECONDS);
    }
  }, [selectedLesson?._id]);

  /*
   * =========================================
   * SELECT LESSON
   * =========================================
   */

  const handleSelectLesson = (lesson) => {
    setError("");
    setSelectedLesson(lesson);
  };

  /*
   * =========================================
   * LOAD SAVED DICTATION RESULT
   * =========================================
   */

  useEffect(() => {
    if (!selectedLesson?._id) {
      return;
    }

    if (selectedLesson.type === "dictation") {
      getLatestDictationResult(selectedLesson._id)
        .then((data) => {
          if (
            data?.success &&
            data?.hasResult &&
            data?.result
          ) {
            setDictationResult(data.result);
            setStage("result");
          }
        })
        .catch((error) => {
          console.error(
            "Unable to load saved dictation result:",
            error
          );
        });
    }
  }, [selectedLesson?._id, selectedLesson?.type]);

  /*
   * =========================================
   * DICTATION SOURCE
   * =========================================
   */

  const isDictationLesson =
    selectedLesson?.type === "dictation";

  const hasDictationAudio =
    isDictationLesson &&
    Boolean(selectedLesson?.audioUrl?.trim());

  const targetWordCount =
    isDictationLesson && selectedLesson?.transcriptWordCount
      ? selectedLesson.transcriptWordCount
      : null;

  // Speed the audio file was actually recorded at (Lesson.wpm).
  const recordedWpm =
    selectedLesson?.wpm > 0 ? selectedLesson.wpm : BASE_WPM;

  // Speed choices always include the recorded speed itself (1.00x).
  const wpmOptions = Array.from(
    new Set([...WPM_OPTIONS, recordedWpm])
  ).sort((a, b) => a - b);

  // Longest / shortest typing time the student may pick (seconds).
  const maxDurationSeconds = MAX_TYPING_SECONDS;
  const minDurationSeconds = MIN_TYPING_SECONDS;

  const selectedDurationTotal = Math.min(
    durationMinutes * 60 + durationSeconds,
    maxDurationSeconds
  );

  /*
   * =========================================
   * PROTECTED DICTATION AUDIO URL
   * =========================================
   */

  const dictationAudioUrl =
    isDictationLesson &&
    selectedLesson?._id &&
    hasDictationAudio
      ? `${
          import.meta.env.VITE_API_URL ||
          "http://localhost:5000/api"
        }/progress/dictation/${
          selectedLesson._id
        }/audio`
      : "";

  /*
   * =========================================
   * LISTENING SETUP
   * =========================================
   */

  const applyPlaybackRate = (wpm = selectedWpm) => {
    if (audioRef.current) {
      const rate = wpm / recordedWpm;
      audioRef.current.defaultPlaybackRate = rate;
      audioRef.current.playbackRate = rate;
    }
  };

  const handleWpmChange = (event) => {
    const wpm = Number(event.target.value);
    setSelectedWpm(wpm);
    applyPlaybackRate(wpm);
  };

  const enterNotesStage = () => {
    setNotesRemaining(NOTES_COUNTDOWN_SECONDS);
    setStage("notes");
  };

  // Audio finished -> "Dictation completed" popup.
  const handleDictationEnded = () => {
    setError("");
    enterNotesStage();
  };

  // "Start Typing Now" (or the countdown reaching 0) -> the popup
  // where the student picks how long they want to type.
  const enterDurationStage = () => {
    setError("");
    setStage("duration");
  };

  // Keeps minutes:seconds from going below 00:00 or above the
  // maximum (60:00). The minimum (01:00) is enforced when the
  // student presses "Start Typing", so typing a new number in the
  // minutes box is never interrupted.
  const applyDuration = (minutes, seconds) => {
    const total = Math.max(
      0,
      Math.min(
        Math.floor(Number(minutes) || 0) * 60 +
          Math.floor(Number(seconds) || 0),
        maxDurationSeconds
      )
    );

    setDurationMinutes(Math.floor(total / 60));
    setDurationSeconds(total % 60);
  };

  useEffect(() => {
    if (stage !== "notes") return undefined;

    if (notesRemaining <= 0) {
      enterDurationStage();
      return undefined;
    }

    const timer = window.setInterval(() => {
      setNotesRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, notesRemaining]);

  /*
   * =========================================
   * START DICTATION TYPING
   * =========================================
   */

  const handleStartTyping = () => {
    if (!selectedLesson) {
      return;
    }

    if (selectedDurationTotal < minDurationSeconds) {
      setError(
        `Please choose a typing time of at least ${formatClock(
          minDurationSeconds
        )}.`
      );
      return;
    }

    if (!hasDictationAudio) {
      setError(
        "Dictation audio is not available."
      );

      return;
    }

    setError("");
    setStage("typing");
    setTypedText("");
    setDictationResult(null);
    setHasStartedTyping(false);
    setTimeUp(false);
    setTypingTimeRemaining(selectedDurationTotal);

    typingStartedAtRef.current = null;

    window.setTimeout(() => {
      typingInputRef.current?.focus();
    }, 100);
  };

  /*
   * =========================================
   * TRY THE DICTATION AGAIN
   *
   * Clears the current attempt so the listening setup and
   * the typing flow appear again. Every attempt is saved
   * separately, so nothing is lost.
   * =========================================
   */

  const handleRetryDictation = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    typingStartedAtRef.current = null;

    setError("");
    setTypedText("");
    setHasStartedTyping(false);
    setTimeUp(false);
    setStage("setup");
    setDictationResult(null);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /*
   * =========================================
   * DICTATION TYPING CHANGE
   * =========================================
   */

  const handleTypingChange = (event) => {
    const value = event.target.value;

    if (!hasStartedTyping && value.length > 0) {
      setHasStartedTyping(true);
      typingStartedAtRef.current = Date.now();
    }

    // Block adding a brand-new word once the transcript's word count
    // is reached — editing/deleting inside the last word still works.
    if (targetWordCount) {
      const words = value.trim()
        ? value.trim().split(/\s+/)
        : [];

      if (
        words.length > targetWordCount &&
        value.length > typedText.length
      ) {
        return;
      }
    }

    setTypedText(value);

    if (dictationResult) {
      setDictationResult(null);
    }

    if (error) {
      setError("");
    }
  };

  /*
   * =========================================
   * TYPING TIMER
   * =========================================
   */

  useEffect(() => {
    if (stage !== "typing" || !hasStartedTyping || timeUp) {
      return undefined;
    }

    if (typingTimeRemaining <= 0) {
      setTimeUp(true);
      handleFinishDictation(true);
      return undefined;
    }

    const timer = window.setInterval(() => {
      setTypingTimeRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, hasStartedTyping, timeUp, typingTimeRemaining]);

  /*
   * =========================================
   * DICTATION STATS
   * =========================================
   */

  const wordCount = typedText.trim()
    ? typedText.trim().split(/\s+/).length
    : 0;

  const characterCount = typedText.length;

  /*
   * =========================================
   * FINISH DICTATION
   * =========================================
   */

  const handleFinishDictation = async (dueToTimeUp = false) => {
    if (!selectedLesson) {
      return;
    }

    if (!isDictationLesson) {
      return;
    }

    if (stage === "result") {
      return;
    }

    if (!typedText.trim() && !dueToTimeUp) {
      setError(
        "Please type the dictation before finishing."
      );

      return;
    }

    const startedAt = typingStartedAtRef.current;

    const elapsedSeconds = startedAt
      ? Math.max(
          1,
          Math.round(
            (Date.now() - startedAt) / 1000
          )
        )
      : 1;

    try {
      setError("");

      const data = await submitDictation(
        selectedLesson._id,
        typedText,
        elapsedSeconds
      );

      setDictationResult(data.result);
      setStage("result");

      typingStartedAtRef.current = null;
    } catch (err) {
      console.error(
        "Dictation submission error:",
        err
      );

      setError(
        err.message ||
          "Unable to analyze dictation."
      );
    }
  };

  /*
   * =========================================
   * COMPLETE LESSON
   * =========================================
   */

  const handleCompleteLesson = async () => {
    if (!selectedLesson) {
      return;
    }

    try {
      setError("");

      await updateLessonProgress(
        selectedLesson._id,
        100,
        true
      );

      setSelectedLesson((currentLesson) => {
        if (!currentLesson) {
          return currentLesson;
        }

        return {
          ...currentLesson,
          progress: {
            ...(currentLesson.progress || {}),
            completed: true,
            progressPercentage: 100,
          },
        };
      });

      setModules((currentModules) =>
        currentModules.map((module) => ({
          ...module,
          lessons: module.lessons?.map((lesson) =>
            lesson._id === selectedLesson._id
              ? {
                  ...lesson,
                  progress: {
                    ...(lesson.progress || {}),
                    completed: true,
                    progressPercentage: 100,
                  },
                }
              : lesson
          ),
        }))
      );
    } catch (err) {
      console.error(
        "Complete lesson error:",
        err
      );

      setError(
        err.message ||
          "Unable to update lesson progress."
      );
    }
  };

  /*
   * =========================================
   * LOADING
   * =========================================
   */

  if (loading) {
    return (
      <main className="learning-page">
        <div className="qpa-container">
          <div className="learning-state">
            <LoadingSpinner />

            <p>Loading course...</p>
          </div>
        </div>
      </main>
    );
  }

  /*
   * =========================================
   * COURSE ERROR
   * =========================================
   */

  if (!course) {
    return (
      <main className="learning-page">
        <div className="qpa-container">
          <div className="learning-state">
            <div className="learning-state-icon">
              <i className="fa-solid fa-book-open"></i>
            </div>

            <h1>Unable to load course</h1>

            <p>
              {error ||
                "The course could not be loaded."}
            </p>

            <Link
              to="/dashboard"
              className="qpa-btn qpa-btn-primary"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  /*
   * =========================================
   * PAGE
   * =========================================
   */

  return (
    <main className="learning-page">
      <div className="qpa-container">

        {/* =================================
            HEADER
            ================================= */}

        <div className="learning-header">
          <div>
            <Link
              to="/dashboard"
              className="learning-back"
            >
              <i className="fa-solid fa-arrow-left"></i>
              Dashboard
            </Link>

            <h1>{course.title}</h1>

            <p>
              Continue learning and track
              your progress.
            </p>
          </div>
        </div>

        {/* =================================
            ERROR
            ================================= */}

        {error && (
          <div
            className="learning-error"
            role="alert"
          >
            <i className="fa-solid fa-circle-exclamation"></i>
            {error}
          </div>
        )}

        <div className="learning-layout">

          {/* =================================
              LESSON SIDEBAR
              ================================= */}

          <aside className="learning-sidebar">

            <button
              type="button"
              className="learning-sidebar-header"
              onClick={() =>
                setCourseContentOpen(
                  (current) => !current
                )
              }
              aria-expanded={courseContentOpen}
              aria-controls="qpa-course-content"
            >
              <span>Course Content</span>

              <i
                className={`fa-solid ${
                  courseContentOpen
                    ? "fa-chevron-up"
                    : "fa-chevron-down"
                }`}
                aria-hidden="true"
              ></i>
            </button>

            {courseContentOpen && (
              <div
                id="qpa-course-content"
                className="learning-modules"
              >

                {modules.length === 0 ? (
                  <div className="learning-placeholder">
                    <div className="learning-placeholder-icon">
                      <i className="fa-solid fa-book-open"></i>
                    </div>

                    <h3>
                      No course content yet
                    </h3>

                    <p>
                      Modules and lessons for
                      this course have not been
                      added yet.
                    </p>
                  </div>
                ) : (
                  modules.map((module) => (
                    <div
                      className="learning-module"
                      key={module._id}
                    >

                      <div className="learning-module-title">
                        <span>
                          {module.title}
                        </span>

                        <small>
                          {module.lessons?.length || 0}
                        </small>
                      </div>

                      <div className="learning-lessons">

                        {module.lessons?.map(
                          (lesson) => (
                            <button
                              type="button"
                              key={lesson._id}
                              className={`learning-lesson ${
                                selectedLesson?._id ===
                                lesson._id
                                  ? "active"
                                  : ""
                              }`}
                              onClick={() =>
                                handleSelectLesson(
                                  lesson
                                )
                              }
                            >

                              <span className="learning-lesson-icon">
                                <i
                                  className={
                                    lesson.type ===
                                    "video"
                                      ? "fa-solid fa-play"
                                      : lesson.type ===
                                        "dictation"
                                      ? "fa-solid fa-headphones"
                                      : lesson.type ===
                                        "typing"
                                      ? "fa-solid fa-keyboard"
                                      : "fa-solid fa-file-lines"
                                  }
                                ></i>
                              </span>

                              <span className="learning-lesson-text">
                                <strong>
                                  {lesson.title}
                                </strong>

                                <small>
                                  {lesson.type}
                                </small>
                              </span>

                              {lesson.progress
                                ?.completed && (
                                <i className="fa-solid fa-circle-check learning-lesson-complete"></i>
                              )}

                            </button>
                          )
                        )}

                      </div>
                    </div>
                  ))
                )}

              </div>
            )}

          </aside>

          {/* =================================
              LESSON CONTENT
              ================================= */}

          <section className="learning-content">

            {!selectedLesson ? (
              <div className="learning-placeholder">

                <div className="learning-placeholder-icon">
                  <i className="fa-solid fa-book-open-reader"></i>
                </div>

                <h2>Select a lesson</h2>

                <p>
                  Choose a lesson from the
                  course content to begin
                  learning.
                </p>

              </div>
            ) : (
              <>

                {/* =================================
                    LESSON HEADER
                    ================================= */}

                <div className="learning-content-header">
                  <div>

                    <span className="learning-type-badge">
                      {selectedLesson.type}
                    </span>

                    <h2>
                      {selectedLesson.title}
                    </h2>

                    {selectedLesson.description && (
                      <p>
                        {selectedLesson.description}
                      </p>
                    )}

                  </div>
                </div>

                {/* =================================
                    DICTATION
                    ================================= */}

                {selectedLesson.type ===
                  "dictation" && (
                  <div className="learning-dictation">

                    {/* ============ LISTENING SETUP (Phase 1) ============ */}

                    {stage === "setup" && !dictationResult && (
                        <div className="qpa-listening-card">

                          <div className="qpa-audio-block">
                            <div className="qpa-audio-icon">
                              <i className="fa-solid fa-headphones"></i>
                            </div>
                            <div>
                              <span className="qpa-audio-label">
                                Phase 1: Dictation Listening
                              </span>
                              <strong className="qpa-audio-title">
                                Listen and take notes carefully.
                              </strong>
                            </div>
                          </div>

                          {hasDictationAudio ? (
                            <>
                              <audio
                                ref={audioRef}
                                className="qpa-audio-player"
                                controls
                                preload="metadata"
                                src={dictationAudioUrl}
                                onLoadedMetadata={() =>
                                  applyPlaybackRate()
                                }
                                onPlay={() => applyPlaybackRate()}
                                onEnded={handleDictationEnded}
                              >
                                Your browser does not
                                support audio playback.
                              </audio>

                              <p className="qpa-audio-speed">
                                Current Speed:{" "}
                                {(selectedWpm / recordedWpm).toFixed(2)}x |{" "}
                                {selectedWpm} WPM
                              </p>

                              <div className="qpa-setup-row">
                                <div className="qpa-setup-label">
                                  <i className="fa-solid fa-gear"></i>
                                  Select Dictation Speed
                                </div>

                                <select
                                  className="qpa-select"
                                  value={selectedWpm}
                                  onChange={handleWpmChange}
                                >
                                  {wpmOptions.map((wpm) => (
                                    <option key={wpm} value={wpm}>
                                      {wpm} WPM
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </>
                          ) : (
                            <p
                              className="learning-error"
                              role="alert"
                            >
                              Dictation audio is not
                              available for this lesson.
                            </p>
                          )}

                        </div>
                      )}

                    {/* ============ NOTES COUNTDOWN ============ */}

                    {stage === "notes" && (
                      <div className="qpa-notes-screen">
                        <h2>Dictation completed</h2>
                        <p>
                          The typing page will be
                          automatically loaded in
                        </p>
                        <div className="qpa-notes-countdown">
                          {formatClock(notesRemaining)}
                        </div>
                        <p className="qpa-notes-hint">
                          Till then you can relax, read
                          your shorthand, or you can
                          start typing right now by
                          clicking on "Start Typing
                          Now" button.
                        </p>
                        <button
                          type="button"
                          className="qpa-start-test-btn"
                          onClick={enterDurationStage}
                        >
                          Start Typing Now
                        </button>
                      </div>
                    )}

                    {/* ============ SELECT TYPING TIME ============ */}

                    {stage === "duration" && (
                      <div className="qpa-notes-screen">
                        <div className="qpa-popup-icon">
                          <i className="fa-solid fa-stopwatch"></i>
                        </div>

                        <h2>Select your typing time</h2>

                        <p>
                          Choose how long you want to take
                          to type the dictation.
                        </p>

<div className="qpa-duration-inputs">
  <input
    type="number"
    min="0"
    max={ABSOLUTE_MAX_MINUTES}
    inputMode="numeric"
    aria-label="Minutes"
    value={String(durationMinutes)}
    onFocus={(e) => e.target.select()}
    onChange={(e) =>
      applyDuration(
        e.target.value,
        durationSeconds
      )
    }
  />
  <span>:</span>
  <input
    type="number"
    min="0"
    max="59"
    inputMode="numeric"
    aria-label="Seconds"
    value={String(durationSeconds)}
    onFocus={(e) => e.target.select()}
    onChange={(e) =>
      applyDuration(
        durationMinutes,
        Math.min(
          Number(e.target.value) || 0,
          59
        )
      )
    }
  />
</div>
                        <p className="qpa-notes-hint">
                          Max
                          allowed:{" "}
                          {formatClock(maxDurationSeconds)}. The
                          timer starts when you type your
                          first character.
                        </p>

                        <button
                          type="button"
                          className="qpa-start-test-btn"
                          disabled={
                            selectedDurationTotal <
                            minDurationSeconds
                          }
                          onClick={handleStartTyping}
                        >
                          Start Typing
                        </button>
                      </div>
                    )}

                    {/* ============ TYPING AREA (Phase 2) ============ */}

                    {stage === "typing" && (
                      <div className="qpa-typing-card">

                        <div className="qpa-typing-topline">
                          <span className="qpa-phase-badge">
                            Transcription{" "}
                            {hasStartedTyping
                              ? "(In progress)"
                              : "(Ready - Start Typing)"}
                          </span>
                          <span className="qpa-timer-pill">
                            {formatClock(typingTimeRemaining)}
                          </span>
                        </div>

                        {timeUp && (
                          <div className="qpa-timeup-banner">
                            <i className="fa-solid fa-hourglass-end"></i>
                            Time's up! Your dictation has
                            been submitted.
                          </div>
                        )}

                        <textarea
                          ref={typingInputRef}
                          className="qpa-typing-textarea"
                          value={typedText}
                          onChange={
                            handleTypingChange
                          }
                          placeholder="Type your first character to start the timer..."
                          spellCheck="false"
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          disabled={timeUp}
                          aria-label="Dictation typing area"
                        />

                        <div className="qpa-typing-footer">
                          <span>
                            Typed:{" "}
                            <strong>
                              {wordCount}
                              {targetWordCount
                                ? ` / ${targetWordCount}`
                                : ""}
                            </strong>
                          </span>

                          {targetWordCount ? (
                            <span
                              className={
                                targetWordCount - wordCount <= 0
                                  ? "qpa-words-left qpa-words-left--done"
                                  : "qpa-words-left"
                              }
                            >
                              Words Left:{" "}
                              {Math.max(
                                0,
                                targetWordCount - wordCount
                              )}
                            </span>
                          ) : (
                            <span>
                              {characterCount} characters
                            </span>
                          )}

                          <button
                            type="button"
                            className="qpa-end-test-btn"
                            disabled={
                              !typedText.trim() || timeUp
                            }
                            onClick={() =>
                              handleFinishDictation(false)
                            }
                          >
                            End Test
                          </button>
                        </div>

                      </div>
                    )}

                    {/* ============ DICTATION RESULTS ============ */}

                    {stage === "result" && dictationResult && (
                      <section
                        className="dictation-results"
                        aria-labelledby="dictation-results-title"
                      >

                        <div className="dictation-results-header">

                          <div>

                            <span className="dictation-results-eyebrow">
                              DICTATION COMPLETE
                            </span>

                            <h2 id="dictation-results-title">
                              Your Dictation Results
                            </h2>

                            <p>
                              Review your typing
                              performance and every
                              word that was analyzed.
                            </p>

                          </div>

                          <div className="dictation-results-actions">

                            {hasDictationAudio && (
                              <audio
                                className="learning-audio"
                                controls
                                preload="none"
                                src={dictationAudioUrl}
                              >
                                Your browser does not
                                support audio playback.
                              </audio>
                            )}

                            <button
                              type="button"
                              className="qpa-btn qpa-btn-primary"
                              onClick={handleRetryDictation}
                            >
                              <i className="fa-solid fa-rotate-right"></i>
                              Try Again
                            </button>

                          </div>

                        </div>

                        <div className="dictation-results-stats">

                          <article className="dictation-result-stat">

                            <span className="dictation-result-stat-label">
                              WPM
                            </span>

                            <strong>
                              {Number(
                                dictationResult.wpm || 0
                              ).toFixed(2)}
                            </strong>

                            <small>
                              Words per minute
                            </small>

                          </article>

                          <article className="dictation-result-stat">

                            <span className="dictation-result-stat-label">
                              Accuracy
                            </span>

                            <strong>
                              {Number(
                                dictationResult.accuracy || 0
                              ).toFixed(2)}
                              %
                            </strong>

                            <small>
                              Character accuracy
                            </small>

                          </article>

                          <article className="dictation-result-stat">

                            <span className="dictation-result-stat-label">
                              Score
                            </span>

                            <strong>
                              {Number(
                                dictationResult.score || 0
                              ).toFixed(2)}
                            </strong>

                            <small>
                              Overall score
                            </small>

                          </article>

                          <article className="dictation-result-stat">

                            <span className="dictation-result-stat-label">
                              Words
                            </span>

                            <strong>
                              {dictationResult.totalWords || 0}
                            </strong>

                            <small>
                              In the dictation
                            </small>

                          </article>

                        </div>

                        <div className="dictation-mistake-summary">

                          <div className="dictation-summary-card dictation-summary-correct">
                            <span>Correct</span>

                            <strong>
                              {dictationResult.correctWords || 0}
                            </strong>
                          </div>

                          <div className="dictation-summary-card dictation-summary-half">
                            <span>Half Mistakes</span>

                            <strong>
                              {dictationResult.halfMistakeWords || 0}
                            </strong>
                          </div>

                          <div className="dictation-summary-card dictation-summary-full">
                            <span>Full Mistakes</span>

                            <strong>
                              {dictationResult.fullMistakeWords || 0}
                            </strong>
                          </div>

                          <div className="dictation-summary-card dictation-summary-missing">
                            <span>Missing</span>

                            <strong>
                              {dictationResult.missingWords || 0}
                            </strong>
                          </div>

                          <div className="dictation-summary-card dictation-summary-extra">
                            <span>Extra Words</span>

                            <strong>
                              {dictationResult.extraWords
                                ?.length || 0}
                            </strong>
                          </div>

                        </div>

                        {/* ===== WORD-BY-WORD DIFF GRID ===== */}

                        <div className="dictation-word-review">

                          <div className="dictation-word-review-header">
                            <div>
                              <span className="dictation-results-eyebrow">
                                WORD ANALYSIS
                              </span>
                              <h3>
                                Complete Word Comparison
                              </h3>
                              <p>
                                Every word from the
                                dictation is shown with
                                your submitted version.
                              </p>
                            </div>
                          </div>

                          <div className="qpa-result-legend">
                            <span>
                              <i className="qpa-legend-dot qpa-legend-dot--correct"></i>
                              Correct
                            </span>
                            <span>
                              <i className="qpa-legend-dot qpa-legend-dot--wrong"></i>
                              Wrong Word (F)
                            </span>
                            <span>
                              <i className="qpa-legend-dot qpa-legend-dot--half"></i>
                              Half Mistake (H)
                            </span>
                            <span>
                              <i className="qpa-legend-dot qpa-legend-dot--omission"></i>
                              Omission (F)
                            </span>
                            <span>
                              <i className="qpa-legend-dot qpa-legend-dot--extra"></i>
                              Extra Word
                            </span>
                          </div>

                          <div className="qpa-result-marking-note">
                            <i className="fa-solid fa-circle-info"></i>
                            Marking: Wrong word = 1 Full
                            Mistake | Omitted word = 1
                            Full Mistake | Spelling =
                            Half Mistake
                          </div>

                          <div className="qpa-word-grid">
                            {(
                              dictationResult.wordResults ||
                              []
                            ).map((word, wordIndex) => {
                              const cls =
                                word.classification ===
                                "full"
                                  ? "wrong"
                                  : word.classification ===
                                    "missing"
                                  ? "omission"
                                  : word.classification;

                              const badge =
                                cls === "half"
                                  ? "H"
                                  : cls !== "correct"
                                  ? "F"
                                  : null;

                              return (
                                <span
                                  key={`result-${wordIndex}-${word.sourceWord || word.expected || ""}`}
                                  className={`qpa-word qpa-word--${cls}`}
                                >
                                  {word.expected ||
                                    word.sourceWord ||
                                    "—"}
                                  {badge && (
                                    <sup className="qpa-word-badge">
                                      {badge}
                                    </sup>
                                  )}
                                  {(cls === "wrong" ||
                                    cls === "half") &&
                                    (word.typed ||
                                      word.typedWord) && (
                                      <span className="qpa-word-typed">
                                        <i className="fa-solid fa-xmark"></i>
                                        {word.typed ||
                                          word.typedWord}
                                      </span>
                                    )}
                                </span>
                              );
                            })}

                            {(
                              dictationResult.extraWords ||
                              []
                            ).map((word, wordIndex) => (
                              <span
                                key={`extra-${wordIndex}-${word.typed || word.typedWord || ""}`}
                                className="qpa-word qpa-word--extra"
                              >
                                {word.typed ||
                                  word.typedWord}
                                <sup className="qpa-word-badge">
                                  +
                                </sup>
                              </span>
                            ))}
                          </div>

                        </div>

                        <div className="dictation-results-footer">

                          <div className="dictation-results-footer-item">
                            <span>
                              Correct characters
                            </span>

                            <strong>
                              {dictationResult.correctCharacters ||
                                0}
                            </strong>
                          </div>

                          <div className="dictation-results-footer-item">
                            <span>
                              Incorrect characters
                            </span>

                            <strong>
                              {dictationResult.incorrectCharacters ||
                                0}
                            </strong>
                          </div>

                          <div className="dictation-results-footer-item">
                            <span>
                              Total mistakes
                            </span>

                            <strong>
                              {dictationResult.mistakes || 0}
                            </strong>
                          </div>

                          <div className="dictation-results-footer-item">
                            <span>
                              Typing time
                            </span>

                            <strong>
                              {dictationResult.durationSeconds ||
                                0}
                              s
                            </strong>
                          </div>

                        </div>

                      </section>
                    )}

                  </div>
                )}

                {/* =================================
                    VIDEO LESSON
                    ================================= */}

                {selectedLesson.type === "video" && (
                  <div className="learning-video">

                    {selectedLesson.content ? (
                      <div
                        dangerouslySetInnerHTML={{
                          __html:
                            selectedLesson.content,
                        }}
                      />
                    ) : (
                      <div className="learning-placeholder">

                        <div className="learning-placeholder-icon">
                          <i className="fa-solid fa-video"></i>
                        </div>

                        <h3>Video lesson</h3>

                        <p>
                          Video content is not
                          available yet.
                        </p>

                      </div>
                    )}

                  </div>
                )}

                {/* =================================
                    NORMAL LESSON
                    ================================= */}

                {selectedLesson.type !==
                  "dictation" &&
                  selectedLesson.type !== "video" && (
                    <div className="learning-lesson-content">

                      {selectedLesson.content ? (
                        <div
                          dangerouslySetInnerHTML={{
                            __html:
                              selectedLesson.content,
                          }}
                        />
                      ) : (
                        <div className="learning-placeholder">

                          <div className="learning-placeholder-icon">
                            <i className="fa-solid fa-file-lines"></i>
                          </div>

                          <h3>Lesson content</h3>

                          <p>
                            Content for this
                            lesson is not
                            available yet.
                          </p>

                        </div>
                      )}

                    </div>
                  )}

                {/* =================================
                    COMPLETE LESSON
                    ================================= */}

                {selectedLesson.type !==
                  "dictation" ||
                  dictationResult ? (
                  <div className="learning-actions">

                    <button
                      type="button"
                      className="qpa-btn qpa-btn-primary"
                      onClick={
                        handleCompleteLesson
                      }
                      disabled={
                        selectedLesson.progress
                          ?.completed
                      }
                    >

                      {selectedLesson.progress
                        ?.completed ? (
                        <>
                          <i className="fa-solid fa-circle-check"></i>
                          Lesson Completed
                        </>
                      ) : (
                        <>
                          Mark Lesson Complete
                          <i className="fa-solid fa-check"></i>
                        </>
                      )}

                    </button>

                  </div>
                ) : null}

              </>
            )}

          </section>

        </div>
      </div>
    </main>
  );
};

export default CourseLearning;
