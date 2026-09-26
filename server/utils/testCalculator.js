const normalizeWord = (word) => {
  return String(word || "")
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:"'()[\]{}]/g, "");
};

const normalizeTextForComparison = (text) => {
  return String(text || "")
    .normalize("NFC")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n+/g, " ")
    .trim()
    .toLowerCase();
};

const getWordSimilarity = (
  sourceWord,
  typedWord
) => {
  const source = normalizeWord(sourceWord);
  const typed = normalizeWord(typedWord);

  if (!source || !typed) {
    return 0;
  }

  const maxLength = Math.max(
    source.length,
    typed.length
  );

  if (maxLength === 0) {
    return 100;
  }

  let matchingCharacters = 0;

  const comparisonLength = Math.min(
    source.length,
    typed.length
  );

  for (
    let i = 0;
    i < comparisonLength;
    i += 1
  ) {
    if (source[i] === typed[i]) {
      matchingCharacters += 1;
    }
  }

  return (
    (matchingCharacters / maxLength) * 100
  );
};

const classifyWord = (
  sourceWord,
  typedWord
) => {
  const source = String(sourceWord || "");
  const typed = String(typedWord || "");

  if (!typed.trim()) {
    return "missing";
  }

  if (
    normalizeWord(source) ===
    normalizeWord(typed)
  ) {
    return "correct";
  }

  const similarity = getWordSimilarity(
    source,
    typed
  );

  if (similarity >= 50) {
    return "half";
  }

  return "full";
};

export const calculateTestResult = ({
  sourceText,
  typedText,
  durationSeconds,
}) => {
  const source = String(sourceText || "");
  const typed = String(typedText || "");

  const safeDuration = Math.max(
    1,
    Number(durationSeconds) || 1
  );

  /*
   * =========================================
   * NORMALIZED CHARACTER-LEVEL COMPARISON
   * =========================================
   *
   * The original transcript and typed text
   * are normalized only for scoring.
   *
   * This prevents formatting differences such
   * as CRLF/LF, tabs, repeated spaces and
   * Unicode whitespace from becoming mistakes.
   */

  const normalizedSource =
    normalizeTextForComparison(source);

  const normalizedTyped =
    normalizeTextForComparison(typed);

  let correctCharacters = 0;
  let incorrectCharacters = 0;

  const comparisonLength = Math.max(
    normalizedSource.length,
    normalizedTyped.length
  );

  for (
    let i = 0;
    i < comparisonLength;
    i += 1
  ) {
    if (
      i < normalizedSource.length &&
      i < normalizedTyped.length &&
      normalizedSource[i] ===
        normalizedTyped[i]
    ) {
      correctCharacters += 1;
    } else {
      incorrectCharacters += 1;
    }
  }

  const mistakes = incorrectCharacters;

  const accuracy =
    normalizedTyped.length === 0
      ? 0
      : Math.min(
          100,
          Math.round(
            (correctCharacters /
              Math.max(
                1,
                comparisonLength
              )) *
              10000
          ) / 100
        );

  /*
   * =========================================
   * WPM
   * =========================================
   */

  const minutes =
    safeDuration / 60;

  const wpm =
    minutes > 0
      ? Math.max(
          0,
          Math.round(
            (normalizedTyped.length /
              5 /
              minutes) *
              100
          ) / 100
        )
      : 0;

  /*
   * =========================================
   * SCORE
   * =========================================
   */

  const speedScore = Math.min(
    100,
    wpm
  );

  const accuracyScore = accuracy;

  const score = Math.max(
    0,
    Math.round(
      (
        speedScore * 0.5 +
        accuracyScore * 0.5
      ) * 100
    ) / 100
  );

  /*
   * =========================================
   * WORD ARRAYS
   * =========================================
   */

  const sourceWords = source.trim()
    ? source.trim().split(/\s+/)
    : [];

  const typedWords = typed.trim()
    ? typed.trim().split(/\s+/)
    : [];

  /*
   * =========================================
   * WORD-LEVEL COMPARISON
   * =========================================
   */

  const wordResults = [];

  let correctWords = 0;
  let halfMistakeWords = 0;
  let fullMistakeWords = 0;
  let missingWords = 0;

  sourceWords.forEach(
    (sourceWord, index) => {
      const typedWord =
        typedWords[index] || "";

      const classification =
        classifyWord(
          sourceWord,
          typedWord
        );

      const similarity = typedWord
        ? Math.round(
            getWordSimilarity(
              sourceWord,
              typedWord
            ) * 100
          ) / 100
        : 0;

      wordResults.push({
        index,
        expected: sourceWord,
        typed: typedWord,
        classification,
        similarity,
      });

      switch (classification) {
        case "correct":
          correctWords += 1;
          break;

        case "half":
          halfMistakeWords += 1;
          break;

        case "full":
          fullMistakeWords += 1;
          break;

        case "missing":
          missingWords += 1;
          break;

        default:
          break;
      }
    }
  );

  /*
   * =========================================
   * EXTRA WORDS
   * =========================================
   */

  const extraWords = [];

  if (
    typedWords.length >
    sourceWords.length
  ) {
    for (
      let i = sourceWords.length;
      i < typedWords.length;
      i += 1
    ) {
      extraWords.push({
        index: i,
        expected: "",
        typed: typedWords[i],
        classification: "extra",
        similarity: 0,
      });
    }
  }

  /*
   * =========================================
   * GROUPED RESULTS
   * =========================================
   */

  const correctWordResults =
    wordResults.filter(
      (word) =>
        word.classification ===
        "correct"
    );

  const halfMistakeWordResults =
    wordResults.filter(
      (word) =>
        word.classification ===
        "half"
    );

  const fullMistakeWordResults =
    wordResults.filter(
      (word) =>
        word.classification ===
        "full"
    );

  const missingWordResults =
    wordResults.filter(
      (word) =>
        word.classification ===
        "missing"
    );

  /*
   * =========================================
   * FINAL RESULT
   * =========================================
   */

  return {
    correctCharacters,
    incorrectCharacters,
    mistakes,
    wpm,
    accuracy,
    score,

    sourceWords,
    typedWords,

    wordResults,
    extraWords,

    totalWords:
      sourceWords.length,

    typedWordCount:
      typedWords.length,

    correctWords,
    halfMistakeWords,
    fullMistakeWords,
    missingWords,

    correctWordResults,
    halfMistakeWordResults,
    fullMistakeWordResults,
    missingWordResults,

    mistakesByType: {
      half: halfMistakeWords,
      full: fullMistakeWords,
      missing: missingWordResults.length,
      extra: extraWords.length,
    },
  };
};