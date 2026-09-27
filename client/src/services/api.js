const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const apiRequest = async (endpoint, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const error = new Error(
      data.message || "Something went wrong."
    );

    error.status = response.status;
    error.data = data;

    throw error;
  }

  return data;
};

/* =========================================
   AUTHENTICATION
========================================= */

export const registerUser = async ({
  name,
  email,
  password,
}) => {
  return apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name,
      email,
      password,
    }),
  });
};

export const loginUser = async ({
  email,
  password,
}) => {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
    }),
  });
};

export const getCurrentUser = async () => {
  return apiRequest("/auth/me");
};

export const logoutUser = async () => {
  return apiRequest("/auth/logout", {
    method: "POST",
  });
};

export const forgotPassword = async (email) => {
  return apiRequest("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({
      email,
    }),
  });
};

export const resetPassword = async ({
  token,
  password,
}) => {
  return apiRequest("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({
      token,
      password,
    }),
  });
};

/* =========================================
   COURSES
========================================= */

export const getPublishedCourses = async () => {
  return apiRequest("/courses");
};

export const getCourseBySlug = async (slug) => {
  return apiRequest(`/courses/${slug}`);
};

/* =========================================
   ENROLLMENTS
========================================= */

export const enrollInFreeCourse = async (courseId) => {
  return apiRequest("/enrollments/free", {
    method: "POST",
    body: JSON.stringify({
      courseId,
    }),
  });
};

export const getMyEnrollments = async () => {
  return apiRequest("/enrollments/my");
};

export const getCourseEnrollment = async (courseId) => {
  return apiRequest(
    `/enrollments/course/${courseId}`
  );
};

/* =========================================
   PROGRESS
========================================= */

export const getCourseProgress = async (courseId) => {
  return apiRequest(
    `/progress/course/${courseId}`
  );
};

export const updateLessonProgress = async (
  lessonId,
  progressPercentage,
  completed = false
) => {
  return apiRequest(
    `/progress/lesson/${lessonId}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        progressPercentage,
        completed,
      }),
    }
  );
};

export const submitDictation = async (
  lessonId,
  typedText,
  durationSeconds
) => {
  return apiRequest(
    `/progress/dictation/${lessonId}/submit`,
    {
      method: "POST",
      body: JSON.stringify({
        typedText,
        durationSeconds,
      }),
    }
  );
};

export const getLatestDictationResult = async (
  lessonId
) => {
  return apiRequest(
    `/progress/dictation/${lessonId}/latest`
  );
};

/* =========================================
   TESTS
========================================= */

export const getTestById = async (testId) => {
  return apiRequest(`/tests/${testId}`);
};

// Now accepts the student's chosen dictation speed (wpm) and typing
// duration (durationSeconds) from the listening-setup screen and
// forwards them to the backend, which clamps/validates them.
export const startTest = async (
  testId,
  { wpm, durationSeconds } = {}
) => {
  return apiRequest(
    `/tests/${testId}/start`,
    {
      method: "POST",
      body: JSON.stringify({
        wpm,
        durationSeconds,
      }),
    }
  );
};

export const submitTest = async (
  sessionId,
  typedText
) => {
  return apiRequest(
    `/tests/session/${sessionId}/submit`,
    {
      method: "POST",
      body: JSON.stringify({
        typedText,
      }),
    }
  );
};

/* =========================================
   LEADERBOARDS
========================================= */

export const getGlobalLeaderboard = async () => {
  return apiRequest("/leaderboards/global");
};

export const getCourseLeaderboard = async (courseId) => {
  return apiRequest(
    `/leaderboards/course/${courseId}`
  );
};

/* =========================================
   PROFILE
========================================= */

export const getMyProfile = async () => {
  return apiRequest("/profile/me");
};

/* =========================================
   COURSE ACCESS / PAYMENTS
========================================= */

export const checkCourseAccess = async (courseId) => {
  return apiRequest(`/payments/access/${courseId}`);
};

/* =========================================
   ADMIN USERS
========================================= */

export const getAdminUsers = async ({
  search = "",
  role = "all",
  page = 1,
  limit = 20,
} = {}) => {
  const params = new URLSearchParams();

  if (search.trim()) {
    params.set("search", search.trim());
  }

  if (role !== "all") {
    params.set("role", role);
  }

  params.set("page", page);
  params.set("limit", limit);

  const query = params.toString();

  return apiRequest(
    `/admin/users${query ? `?${query}` : ""}`
  );
};

export const updateAdminUserStatus = async (
  userId,
  isActive
) => {
  return apiRequest(
    `/admin/users/${userId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({
        isActive,
      }),
    }
  );
};

/* =========================================
   ADMIN COURSES
========================================= */

export const getAdminCourses = async () => {
  return apiRequest("/admin/courses");
};

export const createAdminCourse = async (courseData) => {
  return apiRequest("/admin/courses", {
    method: "POST",
    body: JSON.stringify(courseData),
  });
};

export const updateAdminCourse = async (
  courseId,
  courseData
) => {
  return apiRequest(`/admin/courses/${courseId}`, {
    method: "PATCH",
    body: JSON.stringify(courseData),
  });
};

export const deleteAdminCourse = async (courseId) => {
  return apiRequest(`/admin/courses/${courseId}`, {
    method: "DELETE",
  });
};

/* =========================================
   ADMIN COURSE PUBLISHING
========================================= */

export const publishAdminCourse = async (courseId) => {
  return apiRequest(
    `/admin/courses/${courseId}/publish`,
    {
      method: "PATCH",
    }
  );
};

export const unpublishAdminCourse = async (courseId) => {
  return apiRequest(
    `/admin/courses/${courseId}/unpublish`,
    {
      method: "PATCH",
    }
  );
};

/* =========================================
   ADMIN MODULES
========================================= */

export const getAdminModules = async (courseId) => {
  return apiRequest(
    `/admin/courses/${courseId}/modules`
  );
};

export const createAdminModule = async (
  courseId,
  moduleData
) => {
  return apiRequest(
    `/admin/courses/${courseId}/modules`,
    {
      method: "POST",
      body: JSON.stringify(moduleData),
    }
  );
};

export const updateAdminModule = async (
  moduleId,
  moduleData
) => {
  return apiRequest(
    `/admin/modules/${moduleId}`,
    {
      method: "PATCH",
      body: JSON.stringify(moduleData),
    }
  );
};

export const deleteAdminModule = async (moduleId) => {
  return apiRequest(
    `/admin/modules/${moduleId}`,
    {
      method: "DELETE",
    }
  );
};

/* =========================================
   ADMIN LESSONS
========================================= */

export const getAdminLessons = async (moduleId) => {
  return apiRequest(
    `/admin/modules/${moduleId}/lessons`
  );
};

export const createAdminLesson = async (
  moduleId,
  lessonData
) => {
  return apiRequest(
    `/admin/modules/${moduleId}/lessons`,
    {
      method: "POST",
      body: JSON.stringify(lessonData),
    }
  );
};

export const updateAdminLesson = async (
  lessonId,
  lessonData
) => {
  return apiRequest(
    `/admin/lessons/${lessonId}`,
    {
      method: "PATCH",
      body: JSON.stringify(lessonData),
    }
  );
};

export const deleteAdminLesson = async (lessonId) => {
  return apiRequest(
    `/admin/lessons/${lessonId}`,
    {
      method: "DELETE",
    }
  );
};

/* =========================================
   ADMIN ANALYTICS — PART 36
========================================= */

export const getAdminAnalytics = async ({
  courseId = "",
} = {}) => {
  const params = new URLSearchParams();

  if (courseId) {
    params.set("courseId", courseId);
  }

  const query = params.toString();

  return apiRequest(
    `/admin/analytics${query ? `?${query}` : ""}`
  );
};

export const getHeroStats = async () => {
  return apiRequest(
    `/profile/hero-stats?tzOffset=${new Date().getTimezoneOffset()}`
  );
};

const PAYMENT_API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const paymentRequest = async (path, body) => {
  const token = localStorage.getItem("token");

  const response = await fetch(`${PAYMENT_API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: "include",
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || "Payment request failed.");
    error.status = response.status;
    throw error;
  }

  return data;
};

export const createPaymentOrder = async (courseId) => {
  const data = await paymentRequest("/payments/create-order", { courseId });

  // Backend should return the Razorpay order: { id, amount, currency }
  return data.order || data;
};

export const verifyPayment = async (payload) => {
  return paymentRequest("/payments/verify", payload);
};

/* =========================================
   REVIEWS
========================================= */

export const getCourseReviews = async (courseId) => {
  return apiRequest(`/reviews/course/${courseId}`);
};

export const getMyCourseReview = async (courseId) => {
  return apiRequest(`/reviews/course/${courseId}/mine`);
};

export const saveCourseReview = async (courseId, { rating, comment }) => {
  return apiRequest(`/reviews/course/${courseId}`, {
    method: "POST",
    body: JSON.stringify({ rating, comment }),
  });
};

export const deleteCourseReview = async (courseId) => {
  return apiRequest(`/reviews/course/${courseId}`, {
    method: "DELETE",
  });
};

export const getProfileOverview = async () => {
  const tzOffset = new Date().getTimezoneOffset();
  return apiRequest(`/profile/overview?tzOffset=${tzOffset}`);
};


export default apiRequest;