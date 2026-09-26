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

const getDictationWordClassName = (classification) => {
  switch (classification) {
    case "correct":
      return "dictation-word-correct";

    case "half":
      return "dictation-word-half";

    case "full":
      return "dictation-word-full";

    case "missing":
      return "dictation-word-missing";

    case "extra":
      return "dictation-word-extra";

    default:
      return "";
  }
};

const getDictationWordLabel = (classification) => {
  switch (classification) {
    case "correct":
      return "Correct";

    case "half":
      return "Half Mistake";

    case "full":
      return "Full Mistake";

    case "missing":
      return "Missing";

    case "extra":
      return "Extra";

    default:
      return "Unknown";
  }
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
   */

  const [dictationFinished, setDictationFinished] = useState(false);
  const [typingStarted, setTypingStarted] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [dictationResult, setDictationResult] = useState(null);

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
    setDictationFinished(false);
    setTypingStarted(false);
    setTypedText("");
    setDictationResult(null);

    typingStartedAtRef.current = null;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
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

    setDictationFinished(false);
    setTypingStarted(false);
    setTypedText("");
    setDictationResult(null);
    setError("");

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
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
   * DICTATION AUDIO ENDED
   * =========================================
   */

  const handleDictationEnded = () => {
    setDictationFinished(true);
    setTypingStarted(false);
    setError("");
  };

  /*
   * =========================================
   * START DICTATION TYPING
   * =========================================
   */

  const handleStartTyping = () => {
    if (!selectedLesson) {
      return;
    }

    if (!hasDictationAudio) {
      setError(
        "Dictation audio is not available."
      );

      return;
    }

    setError("");
    setDictationFinished(false);
    setTypingStarted(true);
    setTypedText("");
    setDictationResult(null);

    typingStartedAtRef.current = Date.now();

    window.setTimeout(() => {
      typingInputRef.current?.focus();
    }, 100);
  };

  /*
   * =========================================
   * TRY THE DICTATION AGAIN
   *
   * Clears the current attempt so the audio player
   * and the typing flow appear again. Every attempt
   * is saved separately, so nothing is lost.
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
    setTypingStarted(false);
    setDictationFinished(false);
    setDictationResult(null);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /*
   * =========================================
   * DICTATION TYPING CHANGE
   * =========================================
   */

  const handleTypingChange = (event) => {
    setTypedText(event.target.value);

    if (dictationResult) {
      setDictationResult(null);
    }

    if (error) {
      setError("");
    }
  };

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

  const handleFinishDictation = async () => {
    if (!selectedLesson) {
      return;
    }

    if (!isDictationLesson) {
      return;
    }

    if (!typedText.trim()) {
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

console.log("DICTATION SUBMIT RESPONSE:", data);

setDictationResult(data.result);
setTypingStarted(false);

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

                    {/* AUDIO */}

                    {!typingStarted &&
                      !dictationFinished &&
                      !dictationResult && (
                        <div className="learning-placeholder">

                          <div className="learning-placeholder-icon">
                            <i className="fa-solid fa-headphones"></i>
                          </div>

                          <h3>
                            Dictation lesson
                          </h3>

                          <p>
                            Listen carefully to
                            the complete audio
                            before starting the
                            typing portion.
                          </p>

                          {hasDictationAudio ? (
                            <audio
                              ref={audioRef}
                              className="learning-audio"
                              controls
                              preload="metadata"
                              src={dictationAudioUrl}
                              onEnded={
                                handleDictationEnded
                              }
                            >
                              Your browser does not
                              support audio playback.
                            </audio>
                          ) : (
                            <p>
                              Dictation audio is
                              not available for
                              this lesson.
                            </p>
                          )}

                          {!hasDictationAudio && (
                            <p
                              className="learning-error"
                              role="alert"
                            >
                              Dictation audio is not
                              available for this
                              lesson.
                            </p>
                          )}

                        </div>
                      )}

                    {/* AUDIO FINISHED POPUP */}

                    {dictationFinished &&
                      !dictationResult && (
                        <div
                          className="dictation-ready-overlay"
                          role="dialog"
                          aria-modal="true"
                          aria-labelledby="dictation-ready-title"
                        >

                          <div className="dictation-ready-popup">

                            <div className="dictation-ready-icon">
                              <i className="fa-solid fa-keyboard"></i>
                            </div>

                            <span className="learning-type-badge">
                              Dictation Ready
                            </span>

                            <h3 id="dictation-ready-title">
                              Audio finished
                            </h3>

                            <p>
                              The dictation audio
                              has finished. You
                              can now start typing
                              what you heard.
                            </p>

                            <button
                              type="button"
                              className="qpa-btn qpa-btn-primary"
                              onClick={
                                handleStartTyping
                              }
                              disabled={
                                !hasDictationAudio
                              }
                            >
                              Start Typing
                              <i className="fa-solid fa-arrow-right"></i>
                            </button>

                          </div>

                        </div>
                      )}

                    {/* TYPING AREA */}

                    {typingStarted && (
                      <div className="learning-typing-card">

                        <div className="learning-typing-header">

                          <div>

                            <span>Dictation</span>

                            <h3>
                              Type what you heard
                            </h3>

                            <p>
                              Type the complete
                              dictation as
                              accurately as
                              possible.
                            </p>

                          </div>

                          <div className="learning-typing-header-icon">
                            <i className="fa-solid fa-keyboard"></i>
                          </div>

                        </div>

                        <div className="learning-typing-status">

                          <div>

                            <i className="fa-solid fa-circle"></i>

                            <span>
                              Typing in progress
                            </span>

                          </div>

                          <div className="learning-typing-stats">

                            <span>
                              {wordCount}{" "}
                              {wordCount === 1
                                ? "word"
                                : "words"}
                            </span>

                            <span>
                              {characterCount}{" "}
                              characters
                            </span>

                          </div>

                        </div>

                        <textarea
                          ref={typingInputRef}
                          className="learning-typing-input"
                          value={typedText}
                          onChange={
                            handleTypingChange
                          }
                          placeholder="Start typing the dictation here..."
                          spellCheck="false"
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          aria-label="Dictation typing area"
                        />

                        <div className="learning-typing-footer">

                          <span>
                            Listen carefully and
                            reproduce the dictation
                            as accurately as possible.
                          </span>

                          <button
                            type="button"
                            className="qpa-btn qpa-btn-primary"
                            disabled={
                              !typedText.trim()
                            }
                            onClick={
                              handleFinishDictation
                            }
                          >
                            Finish Dictation
                            <i className="fa-solid fa-arrow-right"></i>
                          </button>

                        </div>

                      </div>
                    )}

                    {/* DICTATION RESULTS */}

                    {dictationResult && (
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
                                dictation is shown
                                with your submitted
                                version.
                              </p>

                            </div>

                            <div className="dictation-word-legend">

                              <span className="dictation-legend-item">
                                <i className="dictation-legend-dot dictation-legend-correct"></i>
                                Correct
                              </span>

                              <span className="dictation-legend-item">
                                <i className="dictation-legend-dot dictation-legend-half"></i>
                                Half
                              </span>

                              <span className="dictation-legend-item">
                                <i className="dictation-legend-dot dictation-legend-full"></i>
                                Full
                              </span>

                              <span className="dictation-legend-item">
                                <i className="dictation-legend-dot dictation-legend-missing"></i>
                                Missing
                              </span>

                            </div>

                          </div>

                          <div
                            className="dictation-word-table"
                            role="table"
                            aria-label="Dictation word comparison"
                          >

                            <div
                              className="dictation-word-row dictation-word-row-head"
                              role="row"
                            >

                              <span role="columnheader">
                                #
                              </span>

                              <span role="columnheader">
                                Expected Word
                              </span>

                              <span role="columnheader">
                                Your Word
                              </span>

                              <span role="columnheader">
                                Result
                              </span>

                              <span role="columnheader">
                                Match
                              </span>

                            </div>

                            {(
                              dictationResult.wordResults ||
                              []
                            ).map((word) => (
                              <div
                                className={`dictation-word-row ${getDictationWordClassName(
                                  word.classification
                                )}`}
                                key={word.index}
                                role="row"
                              >

                                <span
                                  className="dictation-word-index"
                                  role="cell"
                                >
                                  {word.index + 1}
                                </span>

                                <span
                                  className="dictation-expected-word"
                                  role="cell"
                                >
                                  {word.expected ||
                                    word.sourceWord ||
                                    "—"}
                                </span>

                                <span
                                  className="dictation-typed-word"
                                  role="cell"
                                >
                                  {word.typed ||
                                    word.typedWord ||
                                    "—"}
                                </span>

                                <span
                                  className="dictation-word-result"
                                  role="cell"
                                >
                                  <span className="dictation-word-badge">
                                    {getDictationWordLabel(
                                      word.classification
                                    )}
                                  </span>
                                </span>

                                <span
                                  className="dictation-word-similarity"
                                  role="cell"
                                >
                                  {word.classification ===
                                  "missing"
                                    ? "—"
                                    : `${Number(
                                        word.similarity || 0
                                      ).toFixed(0)}%`}
                                </span>

                              </div>
                            ))}

                            {(
                              dictationResult.extraWords ||
                              []
                            ).map((word) => (
                              <div
                                className="dictation-word-row dictation-word-extra"
                                key={`extra-${word.index}`}
                                role="row"
                              >

                                <span
                                  className="dictation-word-index"
                                  role="cell"
                                >
                                  {word.index + 1}
                                </span>

                                <span
                                  className="dictation-expected-word"
                                  role="cell"
                                >
                                  —
                                </span>

                                <span
                                  className="dictation-typed-word"
                                  role="cell"
                                >
                                  {word.typed ||
                                    word.typedWord}
                                </span>

                                <span
                                  className="dictation-word-result"
                                  role="cell"
                                >
                                  <span className="dictation-word-badge">
                                    Extra
                                  </span>
                                </span>

                                <span
                                  className="dictation-word-similarity"
                                  role="cell"
                                >
                                  —
                                </span>

                              </div>
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