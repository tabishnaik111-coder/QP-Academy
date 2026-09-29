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

const getWordSimilarity = (sourceWord, typedWord) => {
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

const getWordCharacterCounts = (
  sourceWord,
  typedWord
) => {
  const source = normalizeWord(sourceWord);
  const typed = normalizeWord(typedWord);

  if (!typed) {
    return {
      correctCharacters: 0,
      incorrectCharacters: source.length,
    };
  }

  let correctCharacters = 0;

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
      correctCharacters += 1;
    }
  }

  return {
    correctCharacters,
    incorrectCharacters:
      Math.max(
        source.length,
        typed.length
      ) - correctCharacters,
  };
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

/*
 * =========================================
 * WORD SEQUENCE ALIGNMENT
 * =========================================
 *
 * The old comparison used:
 *
 * sourceWords[index]
 *        vs
 * typedWords[index]
 *
 * That caused this problem:
 *
 * Expected:
 *   the quick brown fox
 *
 * Typed:
 *   the brown fox
 *
 * Old result:
 *   the   -> the       correct
 *   quick -> brown     full
 *   brown -> fox       full
 *   fox   -> missing
 *
 * The alignment below keeps later words aligned:
 *
 *   the   -> the       correct
 *   quick ->           missing
 *   brown -> brown     correct
 *   fox   -> fox       correct
 *
 * Exact matches are preferred so that a missing
 * word does not shift all following words.
 */

const alignWords = (
  sourceWords,
  typedWords
) => {
  const sourceLength =
    sourceWords.length;

  const typedLength =
    typedWords.length;

  const dp = Array.from(
    {
      length: sourceLength + 1,
    },
    () =>
      Array(
        typedLength + 1
      ).fill(0)
  );

  const operation = Array.from(
    {
      length: sourceLength + 1,
    },
    () =>
      Array(
        typedLength + 1
      ).fill(null)
  );

  /*
   * Initial deletion costs.
   */
  for (
    let i = 1;
    i <= sourceLength;
    i += 1
  ) {
    dp[i][0] = i;
    operation[i][0] = "delete";
  }

  /*
   * Initial insertion costs.
   */
  for (
    let j = 1;
    j <= typedLength;
    j += 1
  ) {
    dp[0][j] = j;
    operation[0][j] = "insert";
  }

  /*
   * Build the alignment matrix.
   */
  for (
    let i = 1;
    i <= sourceLength;
    i += 1
  ) {
    for (
      let j = 1;
      j <= typedLength;
      j += 1
    ) {
      const sourceWord =
        sourceWords[i - 1];

      const typedWord =
        typedWords[j - 1];

      const exact =
        normalizeWord(sourceWord) ===
        normalizeWord(typedWord);

      /*
       * Exact matches have zero cost.
       *
       * Substitution has a slightly higher
       * cost than deletion/insertion.
       *
       * This helps preserve later exact words.
       */
      const diagonalCost =
        dp[i - 1][j - 1] +
        (exact ? 0 : 1.5);

      const deleteCost =
        dp[i - 1][j] + 1;

      const insertCost =
        dp[i][j - 1] + 1;

      /*
       * Exact match always wins.
       */
      if (exact) {
        dp[i][j] = diagonalCost;
        operation[i][j] = "match";
      } else if (
        deleteCost <= insertCost &&
        deleteCost < diagonalCost
      ) {
        dp[i][j] = deleteCost;
        operation[i][j] = "delete";
      } else if (
        insertCost < diagonalCost
      ) {
        dp[i][j] = insertCost;
        operation[i][j] = "insert";
      } else {
        dp[i][j] = diagonalCost;
        operation[i][j] =
          "substitute";
      }
    }
  }

  /*
   * Reconstruct the alignment.
   */
  const aligned = [];

  let i = sourceLength;
  let j = typedLength;

  while (i > 0 || j > 0) {
    const currentOperation =
      operation[i][j] ||
      (i > 0
        ? "delete"
        : "insert");

    /*
     * Exact / paired word.
     */
    if (
      currentOperation ===
      "match"
    ) {
      aligned.push({
        sourceIndex: i - 1,
        typedIndex: j - 1,
        sourceWord:
          sourceWords[i - 1],
        typedWord:
          typedWords[j - 1],
        kind: "paired",
      });

      i -= 1;
      j -= 1;

      continue;
    }

    /*
     * Expected word was not typed.
     */
    if (
      currentOperation ===
      "delete"
    ) {
      aligned.push({
        sourceIndex: i - 1,
        typedIndex: null,
        sourceWord:
          sourceWords[i - 1],
        typedWord: "",
        kind: "missing",
      });

      i -= 1;

      continue;
    }

    /*
     * User typed an extra word.
     */
    if (
      currentOperation ===
      "insert"
    ) {
      aligned.push({
        sourceIndex: null,
        typedIndex: j - 1,
        sourceWord: "",
        typedWord:
          typedWords[j - 1],
        kind: "extra",
      });

      j -= 1;

      continue;
    }

    /*
     * Different words occupying the same
     * position. This is still treated as
     * a paired word and classified as
     * half/full using the existing logic.
     */
    aligned.push({
      sourceIndex: i - 1,
      typedIndex: j - 1,
      sourceWord:
        sourceWords[i - 1],
      typedWord:
        typedWords[j - 1],
      kind: "paired",
    });

    i -= 1;
    j -= 1;
  }

  return aligned.reverse();
};

export const calculateTestResult = ({
  sourceText,
  typedText,
  durationSeconds,
}) => {
  const source =
    String(sourceText || "");

  const typed =
    String(typedText || "");

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
    normalizeTextForComparison(
      source
    );

  const normalizedTyped =
    normalizeTextForComparison(
      typed
    );

  let correctCharacters = 0;

  let incorrectCharacters = 0;

  const comparisonLength =
    Math.max(
      normalizedSource.length,
      normalizedTyped.length
    );

  for (
    let i = 0;
    i < comparisonLength;
    i += 1
  ) {
    if (
      i <
        normalizedSource.length &&
      i <
        normalizedTyped.length &&
      normalizedSource[i] ===
        normalizedTyped[i]
    ) {
      correctCharacters += 1;
    } else {
      incorrectCharacters += 1;
    }
  }

  const mistakes =
    incorrectCharacters;

  const accuracy =
    normalizedTyped.length === 0
      ? 0
      : Math.min(
          100,
          Math.round(
            (
              correctCharacters /
              Math.max(
                1,
                comparisonLength
              )
            ) *
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
            (
              normalizedTyped.length /
              5 /
              minutes
            ) *
              100
          ) / 100
        )
      : 0;

  /*
   * =========================================
   * SCORE
   * =========================================
   */

  const speedScore =
    Math.min(100, wpm);

  const accuracyScore =
    accuracy;

  const score = Math.max(
    0,
    Math.round(
      (
        speedScore * 0.5 +
        accuracyScore * 0.5
      ) *
        100
    ) / 100
  );

  /*
   * =========================================
   * WORD ARRAYS
   * =========================================
   */

  const sourceWords =
    source.trim()
      ? source
          .trim()
          .split(/\s+/)
      : [];

  const typedWords =
    typed.trim()
      ? typed
          .trim()
          .split(/\s+/)
      : [];

  /*
   * =========================================
   * ALIGNED WORD-LEVEL COMPARISON
   * =========================================
   */

  const alignedWords =
    alignWords(
      sourceWords,
      typedWords
    );

  const wordResults = [];

  const extraWords = [];

  let correctWords = 0;

  let halfMistakeWords = 0;

  let fullMistakeWords = 0;

  let missingWords = 0;

  alignedWords.forEach(
    (word, resultIndex) => {
      /*
       * =====================================
       * EXTRA WORD
       * =====================================
       */

      if (
        word.kind === "extra"
      ) {
        extraWords.push({
          index:
            word.typedIndex !==
            null
              ? word.typedIndex
              : resultIndex,

          expected: "",

          typed:
            word.typedWord,

          classification:
            "extra",

          similarity: 0,
        });

        return;
      }

      const sourceWord =
        word.sourceWord;

      const typedWord =
        word.typedWord || "";

      /*
       * Missing words are explicitly
       * classified as missing.
       */
      const classification =
        word.kind === "missing"
          ? "missing"
          : classifyWord(
              sourceWord,
              typedWord
            );

      const similarity =
        typedWord
          ? Math.round(
              getWordSimilarity(
                sourceWord,
                typedWord
              ) * 100
            ) / 100
          : 0;

      /*
       * Per-word character counts.
       *
       * These fields match the
       * DictationResult wordResult schema.
       */
      const characterCounts =
        getWordCharacterCounts(
          sourceWord,
          typedWord
        );

      const result = {
        /*
         * Keep the source-word index
         * stable for the frontend.
         */
        index:
          word.sourceIndex !==
          null
            ? word.sourceIndex
            : resultIndex,

        /*
         * Fields expected by
         * DictationResult.
         */
        sourceWord,

        typedWord,

        /*
         * Preserve the old frontend
         * compatible fields.
         */
        expected:
          sourceWord,

        typed:
          typedWord,

        classification,

        similarity,

        correctCharacters:
          characterCounts.correctCharacters,

        incorrectCharacters:
          characterCounts.incorrectCharacters,
      };

      wordResults.push(result);

      /*
       * =====================================
       * COUNTS
       * =====================================
       */

      switch (
        classification
      ) {
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
      half:
        halfMistakeWords,

      full:
        fullMistakeWords,

      missing:
        missingWordResults.length,

      extra:
        extraWords.length,
    },
  };
};
