import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import LoadingSpinner from "../components/LoadingSpinner";

import {
  getTestById,
  startTest,
  submitTest,
} from "../services/api";

const TestEngine = () => {
  const { testId } = useParams();

  const [test, setTest] = useState(null);
  const [session, setSession] =
    useState(null);

  const [typedText, setTypedText] =
    useState("");

  const [timeRemaining, setTimeRemaining] =
    useState(0);

  const [started, setStarted] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [completed, setCompleted] =
    useState(false);

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(true);

    const [result, setResult] =
  useState(null);

  useEffect(() => {
    const loadTest = async () => {
      try {
        setLoading(true);
        setError("");

        const data =
          await getTestById(testId);

        setTest(data.test);
        setTimeRemaining(
          data.test.durationSeconds
        );
      } catch (err) {
        console.error(
          "Load test error:",
          err
        );

        setError(
          err.message ||
            "Unable to load this test."
        );
      } finally {
        setLoading(false);
      }
    };

    loadTest();
  }, [testId]);

  const handleStart = async () => {
    try {
      setError("");

      const data =
        await startTest(testId);

      setSession(data.session);

      setStarted(true);

      setTimeRemaining(
        data.session.durationSeconds
      );
    } catch (err) {
      console.error(
        "Start test error:",
        err
      );

      setError(
        err.message ||
          "Unable to start the test."
      );
    }
  };

  const handleSubmit = async () => {
    if (!session || submitting) {
      return;
    }

    try {
      setSubmitting(true);
      setError("");

const data = await submitTest(
  session.id,
  typedText
);

setResult(data.result);

setCompleted(true);
      setStarted(false);
    } catch (err) {
      console.error(
        "Submit test error:",
        err
      );

      setError(
        err.message ||
          "Unable to submit the test."
      );
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!started || completed) {
      return undefined;
    }

    if (timeRemaining <= 0) {
      handleSubmit();
      return undefined;
    }

    const timer = window.setInterval(
      () => {
        setTimeRemaining(
          (current) =>
            Math.max(0, current - 1)
        );
      },
      1000
    );

    return () =>
      window.clearInterval(timer);
  }, [
    started,
    completed,
    timeRemaining,
  ]);

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(
      timeRemaining / 60
    );

    const seconds =
      timeRemaining % 60;

    return `${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  }, [timeRemaining]);

  const handleTypingChange = (event) => {
    if (!started || completed) {
      return;
    }

    setTypedText(event.target.value);
  };

  if (loading) {
    return (
      <main className="test-engine-page">
        <div className="qpa-container">
          <div className="test-state">
            <LoadingSpinner />
            <p>
              Loading test...
            </p>
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

            <h1>
              Unable to load test
            </h1>

            <p>{error}</p>

            <Link
              to="/"
              className="qpa-btn qpa-btn-primary"
            >
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
            <Link
              to="/dashboard"
              className="test-back"
            >
              <i className="fa-solid fa-arrow-left"></i>
              Dashboard
            </Link>

            <h1>{test.title}</h1>

            <p>
              {test.type === "dictation"
                ? "Listen carefully and type what you hear."
                : "Type the displayed text as accurately as possible."}
            </p>
          </div>

          {started && (
            <div className="test-timer">
              <span>Time</span>

              <strong>
                {formattedTime}
              </strong>
            </div>
          )}
        </div>

        {error && (
          <div
            className="test-error"
            role="alert"
          >
            <i className="fa-solid fa-circle-exclamation"></i>
            {error}
          </div>
        )}

        {!started &&
          !completed && (
            <section className="test-start-card">
              <div className="test-start-icon">
                <i className="fa-solid fa-keyboard"></i>
              </div>

              <span className="test-badge">
                {test.type}
              </span>

              <h2>{test.title}</h2>

              <p>
                You will have{" "}
                <strong>
                  {Math.floor(
                    test.durationSeconds /
                      60
                  )}{" "}
                  minutes
                </strong>{" "}
                to complete this test.
              </p>

              <div className="test-start-info">
                <div>
                  <i className="fa-solid fa-clock"></i>
                  <span>
                    {test.durationSeconds}s
                  </span>
                </div>

                <div>
                  <i className="fa-solid fa-layer-group"></i>
                  <span>
                    {test.difficulty}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="qpa-btn qpa-btn-primary"
                onClick={handleStart}
              >
                Start Test
                <i className="fa-solid fa-arrow-right"></i>
              </button>
            </section>
          )}

        {started && (
          <section className="test-workspace">
            <div className="test-source-card">
              <div className="test-source-header">
                <span>
                  {test.type ===
                  "dictation"
                    ? "Dictation"
                    : "Type this text"}
                </span>

                <span>
                  {typedText.length} characters
                </span>
              </div>

              <div className="test-source-text">
                {test.content}
              </div>
            </div>

            <div className="test-input-card">
              <label htmlFor="typing-input">
                Your answer
              </label>

              <textarea
                id="typing-input"
                value={typedText}
                onChange={
                  handleTypingChange
                }
                placeholder="Start typing here..."
                autoFocus
                spellCheck="false"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
              />

              <div className="test-input-footer">
                <span>
                  {typedText.length} characters
                </span>

                <button
                  type="button"
                  className="qpa-btn qpa-btn-primary"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting
                    ? "Submitting..."
                    : "Finish Test"}
                </button>
              </div>
            </div>
          </section>
        )}

        {completed && (
  <section className="test-result-card">
    <div className="test-complete-icon">
      <i className="fa-solid fa-check"></i>
    </div>

    <span className="test-badge">
      Test Complete
    </span>

    <h2>Your Performance</h2>

    <p>
      Here is your result for this test.
    </p>

    {result && (
      <div className="test-result-grid">
        <div className="test-result-item">
          <span>WPM</span>
          <strong>
            {result.wpm}
          </strong>
        </div>

        <div className="test-result-item">
          <span>Accuracy</span>
          <strong>
            {result.accuracy}%
          </strong>
        </div>

        <div className="test-result-item">
          <span>Mistakes</span>
          <strong>
            {result.mistakes}
          </strong>
        </div>

        <div className="test-result-item">
          <span>Score</span>
          <strong>
            {result.score}
          </strong>
        </div>

        <div className="test-result-item">
          <span>Correct</span>
          <strong>
            {result.correctCharacters}
          </strong>
        </div>

        <div className="test-result-item">
          <span>Incorrect</span>
          <strong>
            {result.incorrectCharacters}
          </strong>
        </div>
      </div>
    )}

    <div className="test-complete-actions">
      <Link
        to="/dashboard"
        className="qpa-btn qpa-btn-primary"
      >
        Back to Dashboard
      </Link>

      <Link
        to="/"
        className="qpa-btn qpa-btn-secondary"
      >
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