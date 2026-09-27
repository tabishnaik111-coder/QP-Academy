import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import LoadingSpinner from "../components/LoadingSpinner";

import {
  getTestById,
  startTest,
  submitTest,
} from "../services/api";

/* =========================================================
   CONSTANTS
   ========================================================= */

// Dictation speed choices offered on the "listening setup" screen.
// playbackRate is calculated as wpm / BASE_WPM, so 95 WPM => 1.58x
// (matches the "Current Speed: 1.58x | 95 WPM" readout).
const BASE_WPM = 60;
const WPM_OPTIONS = [60, 70, 80, 95, 110, 120, 130, 150, 170];

// How long a student gets to sit with their notes before typing
// auto-opens. They can always skip ahead with "Start Typing Now".
const NOTES_COUNTDOWN_SECONDS = 5 * 60;

/* =========================================================
   TEXT / WORD HELPERS
   ========================================================= */

const tokenize = (text) =>
  (text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

const normalizeWord = (word) =>
  (word || "").toLowerCase().replace(/[^\p{L}\p{N}']/gu, "");

const levenshtein = (a, b) => {
  const m = a.length;
  const n = b.length;

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] =
          1 +
          Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp[m][n];
};

const charSimilarity = (a, b) => {
  if (!a && !b) return 1;
  const maxLen = Math.max(a.length, b.length) || 1;
  return 1 - levenshtein(a, b) / maxLen;
};

// Aligns the reference transcript against what the student typed
// (classic word-level edit-distance alignment) so every reference
// word ends up tagged as correct / omission / half / wrong.
const alignWords = (originalWords, typedWords) => {
  const m = originalWords.length;
  const n = typedWords.length;

  const normOrig = originalWords.map(normalizeWord);
  const normTyped = typedWords.map(normalizeWord);

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (normOrig[i - 1] === normTyped[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] =
          1 +
          Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const ops = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (
      i > 0 &&
      j > 0 &&
      normOrig[i - 1] === normTyped[j - 1] &&
      dp[i][j] === dp[i - 1][j - 1]
    ) {
      ops.unshift({
        type: "match",
        original: originalWords[i - 1],
        typed: typedWords[j - 1],
      });
      i--;
      j--;
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      ops.unshift({
        type: "sub",
        original: originalWords[i - 1],
        typed: typedWords[j - 1],
      });
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      ops.unshift({
        type: "del",
        original: originalWords[i - 1],
        typed: null,
      });
      i--;
    } else {
      ops.unshift({
        type: "ins",
        original: null,
        typed: typedWords[j - 1],
      });
      j--;
    }
  }

  return ops;
};

// Turns raw alignment ops into the 4 gradeable states shown in the
// legend: correct, omission, half (spelling), wrong (word).
const classifyWords = (ops) =>
  ops
    .filter((op) => op.type !== "ins")
    .map((op) => {
      if (op.type === "match") {
        return { ...op, status: "correct" };
      }

      if (op.type === "del") {
        return { ...op, status: "omission" };
      }

      const similarity = charSimilarity(
        normalizeWord(op.original),
        normalizeWord(op.typed)
      );

      return { ...op, status: similarity >= 0.55 ? "half" : "wrong" };
    });

const computeStats = (classified, elapsedSeconds, typedText) => {
  const total = classified.length || 1;
  const correct = classified.filter((w) => w.status === "correct").length;
  const half = classified.filter((w) => w.status === "half").length;
  const wrong = classified.filter((w) => w.status === "wrong").length;
  const omitted = classified.filter((w) => w.status === "omission").length;

  const mistakePoints = wrong + omitted + half * 0.5;
  const accuracy = Math.max(
    0,
    Math.round(((total - mistakePoints) / total) * 100)
  );

  const minutes = Math.max(elapsedSeconds / 60, 1 / 60);
  const wpm = Math.round(tokenize(typedText).length / minutes);

  const correctCharacters = classified
    .filter((w) => w.status === "correct")
    .reduce((sum, w) => sum + w.original.length, 0);

  const incorrectCharacters = classified
    .filter((w) => w.status !== "correct")
    .reduce((sum, w) => sum + w.original.length, 0);

  return {
    wpm,
    accuracy,
    mistakes: Math.round(mistakePoints * 10) / 10,
    score: Math.max(0, Math.round(correct - mistakePoints)),
    correctCharacters,
    incorrectCharacters,
  };
};

const formatClock = (totalSeconds) => {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
};

/* =========================================================
   COMPONENT
   ========================================================= */

const TestEngine = () => {
  const { testId } = useParams();
  const audioRef = useRef(null);

  const [test, setTest] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // "setup" | "listening" | "notes" | "typing" | "result"
  const [phase, setPhase] = useState("setup");

  // Listening-setup controls (dictation tests only)
  const [selectedWpm, setSelectedWpm] = useState(95);
  const [durationMinutes, setDurationMinutes] = useState(20);
  const [durationSeconds, setDurationSeconds] = useState(0);

  // Notes / typing state
  const [notesRemaining, setNotesRemaining] = useState(
    NOTES_COUNTDOWN_SECONDS
  );
  const [typedText, setTypedText] = useState("");
  const [typingStarted, setTypingStarted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timeUp, setTimeUp] = useState(false);
  const [elapsedAtSubmit, setElapsedAtSubmit] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const isDictation = test?.type === "dictation";

  const targetWords = useMemo(() => tokenize(test?.content), [test]);
  const targetWordCount = targetWords.length;

  const typedWordCount = useMemo(() => tokenize(typedText).length, [
    typedText,
  ]);

  const classifiedWords = useMemo(() => {
    if (!result) return [];
    return classifyWords(alignWords(targetWords, tokenize(result.typedText)));
  }, [result, targetWords]);

  /* ---------------------------------------------------------
     LOAD TEST
     --------------------------------------------------------- */

  useEffect(() => {
    const loadTest = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getTestById(testId);

        setTest(data.test);

        const maxDuration = data.test.durationSeconds || 1200;
        setDurationMinutes(Math.floor(maxDuration / 60));
        setDurationSeconds(maxDuration % 60);
        setTimeRemaining(maxDuration);
        setSelectedWpm(data.test.defaultWpm || 95);
        setPhase(data.test.type === "dictation" ? "setup" : "start");
      } catch (err) {
        console.error("Load test error:", err);
        setError(err.message || "Unable to load this test.");
      } finally {
        setLoading(false);
      }
    };

    loadTest();
  }, [testId]);

  /* ---------------------------------------------------------
     LISTENING SETUP (dictation only)
     --------------------------------------------------------- */

  const maxDurationSeconds = test?.durationSeconds || 1200;
  const selectedDurationTotal = Math.min(
    durationMinutes * 60 + durationSeconds,
    maxDurationSeconds
  );

  const handleWpmChange = (event) => {
    const wpm = Number(event.target.value);
    setSelectedWpm(wpm);

    if (audioRef.current) {
      audioRef.current.playbackRate = wpm / BASE_WPM;
    }
  };

  const clampDurationPart = (value, max) =>
    Math.max(0, Math.min(Number(value) || 0, max));

  const handleStartTestNow = () => {
    const audio = audioRef.current;

    // First press: kick the dictation audio off at the chosen speed.
    if (audio && audio.paused && !audio.ended) {
      audio.playbackRate = selectedWpm / BASE_WPM;
      audio.currentTime = 0;
      audio.play().catch(() => {});
      setPhase("listening");
      return;
    }

    // Second press (or audio already finished): stop and move on.
    if (audio) audio.pause();
    enterNotesPhase();
  };

  const handleAudioEnded = () => {
    enterNotesPhase();
  };

  const enterNotesPhase = () => {
    setNotesRemaining(NOTES_COUNTDOWN_SECONDS);
    setPhase("notes");
  };

  useEffect(() => {
    if (phase !== "notes") return undefined;

    if (notesRemaining <= 0) {
      handleEnterTyping();
      return undefined;
    }

    const timer = window.setInterval(() => {
      setNotesRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [phase, notesRemaining]);

  /* ---------------------------------------------------------
     ENTER TYPING PHASE
     --------------------------------------------------------- */

  const handleEnterTyping = async () => {
    try {
      setError("");

      const data = await startTest(testId, {
        wpm: selectedWpm,
        durationSeconds: selectedDurationTotal,
      });

      setSession(data.session);
      setTimeRemaining(
        data.session?.durationSeconds || selectedDurationTotal
      );
    } catch (err) {
      console.error("Start test error:", err);
      setError(err.message || "Unable to start the test.");
      // Fall back to the locally-selected duration so the student
      // isn't blocked from typing even if the session call failed.
      setTimeRemaining(selectedDurationTotal);
    } finally {
      setPhase("typing");
    }
  };

  // Non-dictation tests skip straight from the intro card into typing.
  const handleStartTyping = async () => {
    await handleEnterTyping();
  };

  /* ---------------------------------------------------------
     TYPING PHASE
     --------------------------------------------------------- */

  const handleTypingChange = (event) => {
    const value = event.target.value;

    if (!typingStarted && value.length > 0) {
      setTypingStarted(true);
    }

    const words = tokenize(value);

    // Block adding a brand-new word once the reference word count is
    // reached — editing/deleting inside the last word still works.
    if (
      targetWordCount > 0 &&
      words.length > targetWordCount &&
      value.length > typedText.length
    ) {
      return;
    }

    setTypedText(value);
  };

  useEffect(() => {
    if (phase !== "typing" || !typingStarted || timeUp) {
      return undefined;
    }

    if (timeRemaining <= 0) {
      setTimeUp(true);
      handleSubmit(true);
      return undefined;
    }

    const timer = window.setInterval(() => {
      setTimeRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [phase, typingStarted, timeUp, timeRemaining]);

  const handleSubmit = async (dueToTimeUp = false) => {
    if (submitting || phase === "result") return;

    try {
      setSubmitting(true);
      setError("");

      const elapsed = selectedDurationTotal - timeRemaining;
      setElapsedAtSubmit(elapsed);

      let backendResult = null;

      try {
        const data = await submitTest(session?.id, typedText);
        backendResult = data.result;
      } catch (err) {
        console.error("Submit test error:", err);
        // Still show the student their own graded transcript even if
        // the backend save failed.
      }

      const localStats = computeStats(
        classifyWords(alignWords(targetWords, tokenize(typedText))),
        Math.max(elapsed, 1),
        typedText
      );

      setResult({
        typedText,
        timeUp: dueToTimeUp,
        ...localStats,
        ...(backendResult || {}),
      });

      setPhase("result");
    } finally {
      setSubmitting(false);
    }
  };

  const formattedTypingTimer = useMemo(
    () => formatClock(timeRemaining),
    [timeRemaining]
  );

  /* ---------------------------------------------------------
     RENDER — LOADING / ERROR
     --------------------------------------------------------- */

  if (loading) {
    return (
      <main className="test-engine-page">
        <div className="qpa-container">
          <div className="test-state">
            <LoadingSpinner />
            <p>Loading test...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error && !test) {
    return (
      <main className="test-engine-page">
        <div className="qpa-container">
          <div className="test-state">
            <div className="test-state-icon">
              <i className="fa-solid fa-circle-exclamation"></i>
            </div>
            <h1>Unable to load test</h1>
            <p>{error}</p>
            <Link to="/" className="qpa-btn qpa-btn-primary">
              Back to Academy
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="test-engine-page">
      <div className="qpa-container">
        <div className="test-header">
          <div>
            <Link to="/dashboard" className="test-back">
              <i className="fa-solid fa-arrow-left"></i>
              Dashboard
            </Link>
            <h1>{test.title}</h1>
            <p>
              Time: {formatClock(maxDurationSeconds)} |{" "}
              {isDictation ? "Audio Dictation" : "Typing Test"}
            </p>
          </div>

          {phase === "typing" && (
            <div className="test-timer">
              <span>Time</span>
              <strong>{formattedTypingTimer}</strong>
            </div>
          )}
        </div>

        {error && (
          <div className="test-error" role="alert">
            <i className="fa-solid fa-circle-exclamation"></i>
            {error}
          </div>
        )}

        {/* ================= LISTENING SETUP ================= */}
        {phase === "setup" && (
          <section className="qpa-listening-card">
            <div className="qpa-audio-block">
              <div className="qpa-audio-icon">
                <i className="fa-solid fa-music"></i>
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

            <audio
              ref={audioRef}
              src={test.audioUrl}
              controls
              onEnded={handleAudioEnded}
              className="qpa-audio-player"
            />

            <p className="qpa-audio-speed">
              Current Speed: {(selectedWpm / BASE_WPM).toFixed(2)}x |{" "}
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
                {WPM_OPTIONS.map((wpm) => (
                  <option key={wpm} value={wpm}>
                    {wpm} WPM
                  </option>
                ))}
              </select>
            </div>

            <div className="qpa-setup-row">
              <div className="qpa-setup-label">
                <i className="fa-solid fa-clock"></i>
                <div>
                  <div>Select Test Duration</div>
                  <span className="qpa-setup-sublabel">
                    Max allowed: {formatClock(maxDurationSeconds)}
                  </span>
                </div>
              </div>

              <div className="qpa-duration-inputs">
                <input
                  type="number"
                  min="0"
                  value={durationMinutes}
                  onChange={(e) =>
                    setDurationMinutes(
                      clampDurationPart(
                        e.target.value,
                        Math.floor(maxDurationSeconds / 60)
                      )
                    )
                  }
                />
                <span>:</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={durationSeconds}
                  onChange={(e) =>
                    setDurationSeconds(clampDurationPart(e.target.value, 59))
                  }
                />
              </div>
            </div>

            <div className="qpa-setup-notice">
              <i className="fa-solid fa-circle-info"></i>
              Finished listening? Click below — the audio will stop and
              the timer will begin.
            </div>

            <button
              type="button"
              className="qpa-start-test-btn"
              onClick={handleStartTestNow}
            >
              <i className="fa-solid fa-play"></i>
              Start Test Now
            </button>
          </section>
        )}

        {/* ================= NOTES COUNTDOWN ================= */}
        {phase === "notes" && (
          <section className="qpa-notes-screen">
            <h2>Dictation completed</h2>
            <p>The typing page will be automatically loaded in</p>
            <div className="qpa-notes-countdown">
              {formatClock(notesRemaining)}
            </div>
            <p className="qpa-notes-hint">
              Till then you can relax, read your shorthand, or you can
              start typing right now by clicking on "Start Typing Now"
              button.
            </p>
            <button
              type="button"
              className="qpa-start-test-btn"
              onClick={handleEnterTyping}
            >
              Start Typing Now
            </button>
          </section>
        )}

        {/* ================= NON-DICTATION START CARD ================= */}
        {phase === "start" && (
          <section className="test-start-card">
            <div className="test-start-icon">
              <i className="fa-solid fa-keyboard"></i>
            </div>
            <span className="test-badge">{test.type}</span>
            <h2>{test.title}</h2>
            <p>
              You will have{" "}
              <strong>
                {Math.floor(maxDurationSeconds / 60)} minutes
              </strong>{" "}
              to complete this test.
            </p>
            <div className="test-start-info">
              <div>
                <i className="fa-solid fa-clock"></i>
                <span>{maxDurationSeconds}s</span>
              </div>
              <div>
                <i className="fa-solid fa-layer-group"></i>
                <span>{test.difficulty}</span>
              </div>
            </div>
            <button
              type="button"
              className="qpa-btn qpa-btn-primary"
              onClick={handleStartTyping}
            >
              Start Test
              <i className="fa-solid fa-arrow-right"></i>
            </button>
          </section>
        )}

        {/* ================= TYPING PHASE ================= */}
        {phase === "typing" && (
          <section className="qpa-typing-card">
            <div className="qpa-typing-topline">
              <span className="qpa-phase-badge">
                Phase 2: Transcription{" "}
                {typingStarted ? "(In progress)" : "(Ready - Start Typing)"}
              </span>
              <span className="qpa-timer-pill">
                {formattedTypingTimer}
              </span>
            </div>

            {timeUp && (
              <div className="qpa-timeup-banner">
                <i className="fa-solid fa-hourglass-end"></i>
                Time's up! Your test has been submitted.
              </div>
            )}

            <textarea
              id="typing-input"
              className="qpa-typing-textarea"
              value={typedText}
              onChange={handleTypingChange}
              placeholder="Type your first character to start the timer..."
              autoFocus
              spellCheck="false"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              disabled={timeUp || submitting}
            />

            <div className="qpa-typing-footer">
              <span>
                Typed:{" "}
                <strong>
                  {typedWordCount} / {targetWordCount}
                </strong>
              </span>
              <span
                className={
                  targetWordCount - typedWordCount <= 0
                    ? "qpa-words-left qpa-words-left--done"
                    : "qpa-words-left"
                }
              >
                Words Left: {Math.max(0, targetWordCount - typedWordCount)}
              </span>
              <button
                type="button"
                className="qpa-end-test-btn"
                onClick={() => handleSubmit(false)}
                disabled={submitting || timeUp}
              >
                {submitting ? "Submitting..." : "End Test"}
              </button>
            </div>
          </section>
        )}

        {/* ================= RESULT ================= */}
        {phase === "result" && result && (
          <section className="qpa-result-page">
            <div className="qpa-result-legend">
              <span>
                <i className="qpa-legend-dot qpa-legend-dot--correct"></i>
                Correct
              </span>
              <span>
                <i className="qpa-legend-dot qpa-legend-dot--wrong"></i>
                Full Mistake (F)
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
                <i className="qpa-legend-dot qpa-legend-dot--wrongword"></i>
                Wrong Word (F)
              </span>
            </div>

            <div className="qpa-result-marking-note">
              <i className="fa-solid fa-circle-info"></i>
              Marking: Wrong word = 1 Full Mistake | Omitted word = 1 Full
              Mistake | Spelling = Half Mistake
            </div>

            <div className="qpa-word-grid">
              {classifiedWords.map((word, index) => (
                <span
                  key={`${word.original}-${index}`}
                  className={`qpa-word qpa-word--${word.status}`}
                >
                  {word.original}
                  {word.status !== "correct" && (
                    <sup className="qpa-word-badge">
                      {word.status === "half" ? "H" : "F"}
                    </sup>
                  )}
                  {(word.status === "wrong" || word.status === "half") &&
                    word.typed && (
                      <span className="qpa-word-typed">
                        <i className="fa-solid fa-xmark"></i>
                        {word.typed}
                      </span>
                    )}
                </span>
              ))}
            </div>

            <div className="test-complete-icon" style={{ margin: "2rem auto 1rem" }}>
              <i className="fa-solid fa-check"></i>
            </div>
            <span className="test-badge">Test Complete</span>
            <h2>Your Performance</h2>

            <div className="test-result-grid">
              <div className="test-result-item">
                <span>WPM</span>
                <strong>{result.wpm}</strong>
              </div>
              <div className="test-result-item">
                <span>Accuracy</span>
                <strong>{result.accuracy}%</strong>
              </div>
              <div className="test-result-item">
                <span>Mistakes</span>
                <strong>{result.mistakes}</strong>
              </div>
              <div className="test-result-item">
                <span>Score</span>
                <strong>{result.score}</strong>
              </div>
              <div className="test-result-item">
                <span>Correct</span>
                <strong>{result.correctCharacters}</strong>
              </div>
              <div className="test-result-item">
                <span>Incorrect</span>
                <strong>{result.incorrectCharacters}</strong>
              </div>
            </div>

            <div className="test-complete-actions">
              <Link to="/dashboard" className="qpa-btn qpa-btn-primary">
                Back to Dashboard
              </Link>
              <Link to="/" className="qpa-btn qpa-btn-secondary">
                Browse Courses
              </Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
};

export default TestEngine;
