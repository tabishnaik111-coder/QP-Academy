import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import {
  getAdminUsers,
  updateAdminUserStatus,
  getAdminCourses,
  createAdminCourse,
  updateAdminCourse,
  deleteAdminCourse,
  publishAdminCourse,
  unpublishAdminCourse,
  getAdminModules,
  createAdminModule,
  updateAdminModule,
  deleteAdminModule,
  getAdminLessons,
  createAdminLesson,
  updateAdminLesson,
  deleteAdminLesson,
  getAdminAnalytics,
} from "../services/api";

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  /* =========================================
     USERS
  ========================================= */

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userRole, setUserRole] = useState("all");
  const [userPage, setUserPage] = useState(1);

  const [userPagination, setUserPagination] = useState({
    page: 1,
    limit: 20,
    totalUsers: 0,
    totalPages: 0,
  });

  const [updatingUserId, setUpdatingUserId] = useState("");

  /* =========================================
     COURSES
  ========================================= */

  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesError, setCoursesError] = useState("");
  const [publishingCourseId, setPublishingCourseId] = useState("");

  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState("");
  const [courseSaving, setCourseSaving] = useState(false);

  const [courseForm, setCourseForm] = useState({
    title: "",
    slug: "",
    shortDescription: "",
    description: "",
    category: "",
    level: "Beginner",
    price: 0,
    thumbnail: "",
    isFree: true,
  });

  /* =========================================
     PUBLISH / UNPUBLISH — PART 35
  ========================================= */

  const handleCoursePublishing = async (course) => {
    const isPublished = course.published === true;

    if (
      isPublished &&
      !window.confirm(
        `Unpublish "${course.title}"? Students will no longer be able to newly access or purchase this course.`
      )
    ) {
      return;
    }

    try {
      setPublishingCourseId(course._id);

      const data = isPublished
        ? await unpublishAdminCourse(course._id)
        : await publishAdminCourse(course._id);

      setCourses((currentCourses) =>
        currentCourses.map((item) =>
          item._id === course._id
            ? data.course
            : item
        )
      );

      window.alert(
        isPublished
          ? "Course unpublished successfully."
          : "Course published successfully."
      );
    } catch (error) {
      console.error("Course publishing error:", error);
      window.alert(
        error.message ||
          "Unable to update course publishing status."
      );
    } finally {
      setPublishingCourseId("");
    }
  };

  /* =========================================
     MODULES & LESSONS — PART 34
  ========================================= */

  const [selectedCourseId, setSelectedCourseId] =
    useState("");

  const [modules, setModules] = useState([]);
  const [modulesLoading, setModulesLoading] =
    useState(false);
  const [modulesError, setModulesError] =
    useState("");

  const [selectedModuleId, setSelectedModuleId] =
    useState("");

  const [lessons, setLessons] = useState([]);
  const [lessonsLoading, setLessonsLoading] =
    useState(false);
  const [lessonsError, setLessonsError] =
    useState("");

  const [showModuleForm, setShowModuleForm] =
    useState(false);

  const [showLessonForm, setShowLessonForm] =
    useState(false);

  const [editingModuleId, setEditingModuleId] =
    useState("");

  const [editingLessonId, setEditingLessonId] =
    useState("");

  const [contentSaving, setContentSaving] =
    useState(false);

  /* =========================================
     STATISTICS, PURCHASES & LEADERBOARD — PART 36
  ========================================= */

  const [analytics, setAnalytics] = useState({
    stats: {
      totalUsers: 0,
      activeUsers: 0,
      totalCourses: 0,
      publishedCourses: 0,
      totalEnrollments: 0,
      totalPurchases: 0,
      paidPurchases: 0,
      totalRevenue: 0,
      totalTests: 0,
    },
    purchases: [],
    enrollments: [],
    leaderboard: [],
  });

  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");
  const [leaderboardCourseId, setLeaderboardCourseId] = useState("global");

  const [moduleForm, setModuleForm] = useState({
    title: "",
    description: "",
    order: 0,
  });

  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    type: "lesson",
    content: "",
    audioUrl: "",
    duration: 0,
    order: 0,
  });

  /* =========================================
     LOAD PART 36 ANALYTICS
  ========================================= */

  const [analyticsUpdatedAt, setAnalyticsUpdatedAt] = useState(null);

  /*
   * showSpinner is false for silent background refreshes,
   * so the tables do not flash while the data updates.
   */

  const loadAnalytics = useCallback(
    async (showSpinner = true) => {
      try {
        if (showSpinner) setAnalyticsLoading(true);
        setAnalyticsError("");

        const data = await getAdminAnalytics(
          leaderboardCourseId === "global"
            ? {}
            : { courseId: leaderboardCourseId }
        );

        setAnalytics(data);
        setAnalyticsUpdatedAt(new Date());
      } catch (error) {
        console.error("Admin analytics loading error:", error);

        // A failed background refresh keeps the data already on screen
        if (showSpinner) {
          setAnalyticsError(
            error.message || "Unable to load admin analytics."
          );
        }
      } finally {
        if (showSpinner) setAnalyticsLoading(false);
      }
    },
    [leaderboardCourseId]
  );

  useEffect(() => {
    loadAnalytics(true);
  }, [loadAnalytics]);

  /* =========================================
     LOGOUT
  ========================================= */

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);

      await logout();

      navigate("/login", {
        replace: true,
      });
    } catch (error) {
      console.error("Admin logout error:", error);
      setIsLoggingOut(false);
    }
  };

  /* =========================================
     LOAD USERS
  ========================================= */

  const loadUsers = useCallback(
    async (showSpinner = true) => {
      try {
        if (showSpinner) setUsersLoading(true);
        setUsersError("");

        const data = await getAdminUsers({
          search: userSearch,
          role: userRole,
          page: userPage,
          limit: 20,
        });

        setUsers(data.users || []);

        setUserPagination(
          data.pagination || {
            page: userPage,
            limit: 20,
            totalUsers: 0,
            totalPages: 0,
          }
        );
      } catch (error) {
        console.error(
          "Admin users loading error:",
          error
        );

        if (showSpinner) {
          setUsersError(
            error.message || "Unable to load users."
          );
        }
      } finally {
        if (showSpinner) setUsersLoading(false);
      }
    },
    [userSearch, userRole, userPage]
  );

  useEffect(() => {
    loadUsers(true);
  }, [loadUsers]);

  /* =========================================
     LOAD COURSES
  ========================================= */

  const loadCourses = useCallback(async (showSpinner = true) => {
    try {
      if (showSpinner) setCoursesLoading(true);
      setCoursesError("");

      const data = await getAdminCourses();

      setCourses(data.courses || []);
    } catch (error) {
      console.error(
        "Admin courses loading error:",
        error
      );

      if (showSpinner) {
        setCoursesError(
          error.message ||
            "Unable to load courses."
        );
      }
    } finally {
      if (showSpinner) setCoursesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses(true);
  }, [loadCourses]);

  /* =========================================
     LIVE REFRESH

     Statistics, users and courses refresh quietly
     every 30 seconds while the tab is open, and
     immediately when the admin returns to the tab.
  ========================================= */

  const refreshAll = useCallback(() => {
    loadAnalytics(false);
    loadUsers(false);
    loadCourses(false);
  }, [loadAnalytics, loadUsers, loadCourses]);

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") {
        refreshAll();
      }
    };

    const intervalId = window.setInterval(refreshIfVisible, 30000);

    window.addEventListener("focus", refreshIfVisible);
    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshIfVisible);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [refreshAll]);

  /* =========================================
     LOAD MODULES
  ========================================= */

  useEffect(() => {
    if (!selectedCourseId) {
      setModules([]);
      setSelectedModuleId("");
      return;
    }

    const loadModules = async () => {
      try {
        setModulesLoading(true);
        setModulesError("");

        const data = await getAdminModules(
          selectedCourseId
        );

        const loadedModules = data.modules || [];

        setModules(loadedModules);

        if (loadedModules.length > 0) {
          setSelectedModuleId(
            loadedModules[0]._id
          );
        } else {
          setSelectedModuleId("");
        }
      } catch (error) {
        console.error(
          "Admin modules loading error:",
          error
        );

        setModulesError(
          error.message ||
            "Unable to load modules."
        );
      } finally {
        setModulesLoading(false);
      }
    };

    loadModules();
  }, [selectedCourseId]);

  /* =========================================
     LOAD LESSONS
  ========================================= */

  useEffect(() => {
    if (!selectedModuleId) {
      setLessons([]);
      return;
    }

    const loadLessons = async () => {
      try {
        setLessonsLoading(true);
        setLessonsError("");

        const data = await getAdminLessons(
          selectedModuleId
        );

        setLessons(data.lessons || []);
      } catch (error) {
        console.error(
          "Admin lessons loading error:",
          error
        );

        setLessonsError(
          error.message ||
            "Unable to load lessons."
        );
      } finally {
        setLessonsLoading(false);
      }
    };

    loadLessons();
  }, [selectedModuleId]);

  /* =========================================
     USER STATUS
  ========================================= */

  const handleUserStatusChange = async (
    userId,
    isActive
  ) => {
    try {
      setUpdatingUserId(userId);

      const data =
        await updateAdminUserStatus(
          userId,
          isActive
        );

      setUsers((currentUsers) =>
        currentUsers.map((item) =>
          item._id === userId
            ? {
                ...item,
                isActive:
                  data.user?.isActive ??
                  isActive,
              }
            : item
        )
      );
    } catch (error) {
      console.error(
        "User status update error:",
        error
      );

      window.alert(
        error.message ||
          "Unable to update user status."
      );
    } finally {
      setUpdatingUserId("");
    }
  };

  /* =========================================
     COURSE FORM
  ========================================= */

  const resetCourseForm = () => {
    setCourseForm({
      title: "",
      slug: "",
      shortDescription: "",
      description: "",
      category: "",
      level: "Beginner",
      price: 0,
      thumbnail: "",
      isFree: true,
    });

    setEditingCourseId("");
    setShowCourseForm(false);
  };

  const handleCourseChange = (event) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setCourseForm((current) => ({
      ...current,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };

  /* =========================================
     CREATE COURSE
  ========================================= */

  const handleCreateCourse = () => {
    setEditingCourseId("");

    setCourseForm({
      title: "",
      slug: "",
      shortDescription: "",
      description: "",
      category: "",
      level: "Beginner",
      price: 0,
      thumbnail: "",
      isFree: true,
    });

    setShowCourseForm(true);

    setTimeout(() => {
      document
        .getElementById("admin-courses")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  };

  /* =========================================
     EDIT COURSE
  ========================================= */

  const handleEditCourse = (course) => {
    setEditingCourseId(course._id);

    setCourseForm({
      title: course.title || "",
      slug: course.slug || "",
      shortDescription:
        course.shortDescription || "",
      description:
        course.description || "",
      category:
        course.category || "",
      level:
        course.level || "Beginner",
      price:
        course.price || 0,
      thumbnail:
        course.thumbnail || "",
      isFree:
        course.isFree ?? true,
    });

    setShowCourseForm(true);

    setTimeout(() => {
      document
        .getElementById("admin-courses")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  };

  /* =========================================
     SAVE COURSE
  ========================================= */

  const handleCourseSubmit = async (event) => {
    event.preventDefault();

    try {
      setCourseSaving(true);

      const payload = {
        ...courseForm,
        title: courseForm.title.trim(),
        slug: courseForm.slug
          .trim()
          .toLowerCase(),
        shortDescription:
          courseForm.shortDescription.trim(),
        description:
          courseForm.description.trim(),
        category:
          courseForm.category.trim(),
        price: courseForm.isFree
          ? 0
          : Number(courseForm.price),
      };

      if (editingCourseId) {
        const data =
          await updateAdminCourse(
            editingCourseId,
            payload
          );

        setCourses((currentCourses) =>
          currentCourses.map((course) =>
            course._id === editingCourseId
              ? data.course
              : course
          )
        );

        window.alert(
          "Course updated successfully."
        );
      } else {
        const data =
          await createAdminCourse(
            payload
          );

        setCourses((currentCourses) => [
          data.course,
          ...currentCourses,
        ]);

        window.alert(
          "Course created successfully."
        );
      }

      resetCourseForm();
    } catch (error) {
      console.error(
        "Course save error:",
        error
      );

      window.alert(
        error.message ||
          "Unable to save course."
      );
    } finally {
      setCourseSaving(false);
    }
  };

  /* =========================================
     DELETE COURSE
  ========================================= */

  const handleDeleteCourse = async (
    courseId
  ) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this course?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteAdminCourse(courseId);

      setCourses((currentCourses) =>
        currentCourses.filter(
          (course) =>
            course._id !== courseId
        )
      );

      if (selectedCourseId === courseId) {
        setSelectedCourseId("");
        setModules([]);
        setLessons([]);
        setSelectedModuleId("");
      }

      window.alert(
        "Course deleted successfully."
      );
    } catch (error) {
      console.error(
        "Course deletion error:",
        error
      );

      window.alert(
        error.message ||
          "Unable to delete course."
      );
    }
  };

  /* =========================================
     MODULE FORM
  ========================================= */

  const resetModuleForm = () => {
    setModuleForm({
      title: "",
      description: "",
      order: 0,
    });

    setEditingModuleId("");
    setShowModuleForm(false);
  };

  const handleModuleChange = (event) => {
    const { name, value } = event.target;

    setModuleForm((current) => ({
      ...current,
      [name]:
        name === "order"
          ? Number(value)
          : value,
    }));
  };

  /* =========================================
     CREATE MODULE
  ========================================= */

  const handleCreateModule = () => {
    if (!selectedCourseId) {
      window.alert(
        "Please select a course first."
      );
      return;
    }

    setEditingModuleId("");

    setModuleForm({
      title: "",
      description: "",
      order: modules.length,
    });

    setShowModuleForm(true);
  };

  /* =========================================
     EDIT MODULE
  ========================================= */

  const handleEditModule = (module) => {
    setEditingModuleId(module._id);

    setModuleForm({
      title: module.title || "",
      description:
        module.description || "",
      order: module.order || 0,
    });

    setShowModuleForm(true);
  };

  /* =========================================
     SAVE MODULE
  ========================================= */

  const handleModuleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (!selectedCourseId) {
      window.alert(
        "Please select a course first."
      );
      return;
    }

    try {
      setContentSaving(true);

      const payload = {
        title: moduleForm.title.trim(),
        description:
          moduleForm.description.trim(),
        order: Number(moduleForm.order) || 0,
      };

      if (editingModuleId) {
        const data =
          await updateAdminModule(
            editingModuleId,
            payload
          );

        setModules((currentModules) =>
          currentModules
            .map((module) =>
              module._id === editingModuleId
                ? data.module
                : module
            )
            .sort(
              (a, b) =>
                (a.order || 0) -
                (b.order || 0)
            )
        );

        window.alert(
          "Module updated successfully."
        );
      } else {
        const data =
          await createAdminModule(
            selectedCourseId,
            payload
          );

        const newModule = data.module;

        setModules((currentModules) =>
          [
            ...currentModules,
            newModule,
          ].sort(
            (a, b) =>
              (a.order || 0) -
              (b.order || 0)
          )
        );

        setSelectedModuleId(
          newModule._id
        );

        window.alert(
          "Module created successfully."
        );
      }

      resetModuleForm();
    } catch (error) {
      console.error(
        "Module save error:",
        error
      );

      window.alert(
        error.message ||
          "Unable to save module."
      );
    } finally {
      setContentSaving(false);
    }
  };

  /* =========================================
     DELETE MODULE
  ========================================= */

  const handleDeleteModule = async (
    moduleId
  ) => {
    const confirmed = window.confirm(
      "Deleting this module will also delete all lessons inside it. Continue?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setContentSaving(true);

      await deleteAdminModule(moduleId);

      const remainingModules =
        modules.filter(
          (module) =>
            module._id !== moduleId
        );

      setModules(remainingModules);

      if (selectedModuleId === moduleId) {
        setSelectedModuleId(
          remainingModules[0]?._id || ""
        );
        setLessons([]);
      }

      window.alert(
        "Module deleted successfully."
      );
    } catch (error) {
      console.error(
        "Module deletion error:",
        error
      );

      window.alert(
        error.message ||
          "Unable to delete module."
      );
    } finally {
      setContentSaving(false);
    }
  };

  /* =========================================
     LESSON FORM
  ========================================= */

const resetLessonForm = () => {
  setLessonForm({
    title: "",
    description: "",
    type: "lesson",
    content: "",
    transcript: "",
    audioUrl: "",
    duration: 0,
    order: lessons.length,
  });

  setEditingLessonId("");
  setShowLessonForm(false);
};
  const handleLessonChange = (event) => {
    const { name, value } = event.target;

    setLessonForm((current) => ({
      ...current,
      [name]:
        name === "duration" ||
        name === "order"
          ? Number(value)
          : value,
    }));
  };

  /* =========================================
     CREATE LESSON
  ========================================= */

  const handleCreateLesson = () => {
    if (!selectedModuleId) {
      window.alert(
        "Please select a module first."
      );
      return;
    }

    setEditingLessonId("");

   setLessonForm({
  title: "",
  description: "",
  type: "lesson",
  content: "",
  transcript: "",
  audioUrl: "",
  duration: 0,
  order: lessons.length,
});

    setShowLessonForm(true);
  };

  /* =========================================
     EDIT LESSON
  ========================================= */

  const handleEditLesson = (lesson) => {
  setEditingLessonId(lesson._id);

  setLessonForm({
    title: lesson.title || "",

    description:
      lesson.description || "",

    type:
      lesson.type || "lesson",

    content:
      lesson.content || "",

    transcript:
      lesson.transcript || "",

    audioUrl:
      lesson.audioUrl || "",

    duration:
      lesson.duration || 0,

    order:
      lesson.order || 0,
  });

  setShowLessonForm(true);
};

  /* =========================================
     SAVE LESSON
  ========================================= */

  const handleLessonSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (!selectedModuleId) {
      window.alert(
        "Please select a module first."
      );
      return;
    }

    if (lessonForm.type === "dictation") {
  if (!lessonForm.audioUrl.trim()) {
    window.alert(
      "Please enter the exact dictation audio filename."
    );
    return;
  }

  if (!lessonForm.transcript.trim()) {
    window.alert(
      "Please enter the authoritative dictation transcript."
    );
    return;
  }
}

    try {
      setContentSaving(true);

     const payload = {
  title:
    lessonForm.title.trim(),

  description:
    lessonForm.description.trim(),

  type:
    lessonForm.type,

  content:
    lessonForm.content,

  transcript:
    lessonForm.type === "dictation"
      ? lessonForm.transcript.trim()
      : "",

  audioUrl:
    lessonForm.type === "dictation"
      ? lessonForm.audioUrl.trim()
      : "",

  duration:
    Number(lessonForm.duration) || 0,

  order:
    Number(lessonForm.order) || 0,
};

      if (editingLessonId) {
        const data =
          await updateAdminLesson(
            editingLessonId,
            payload
          );

        setLessons((currentLessons) =>
          currentLessons
            .map((lesson) =>
              lesson._id ===
              editingLessonId
                ? data.lesson
                : lesson
            )
            .sort(
              (a, b) =>
                (a.order || 0) -
                (b.order || 0)
            )
        );

        window.alert(
          "Lesson updated successfully."
        );
      } else {
        const data =
          await createAdminLesson(
            selectedModuleId,
            payload
          );

        setLessons((currentLessons) =>
          [
            ...currentLessons,
            data.lesson,
          ].sort(
            (a, b) =>
              (a.order || 0) -
              (b.order || 0)
          )
        );

        window.alert(
          "Lesson created successfully."
        );
      }

      resetLessonForm();
    } catch (error) {
      console.error(
        "Lesson save error:",
        error
      );

      window.alert(
        error.message ||
          "Unable to save lesson."
      );
    } finally {
      setContentSaving(false);
    }
  };

  /* =========================================
     DELETE LESSON
  ========================================= */

  const handleDeleteLesson = async (
    lessonId
  ) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this lesson?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setContentSaving(true);

      await deleteAdminLesson(lessonId);

      setLessons((currentLessons) =>
        currentLessons.filter(
          (lesson) =>
            lesson._id !== lessonId
        )
      );

      window.alert(
        "Lesson deleted successfully."
      );
    } catch (error) {
      console.error(
        "Lesson deletion error:",
        error
      );

      window.alert(
        error.message ||
          "Unable to delete lesson."
      );
    } finally {
      setContentSaving(false);
    }
  };

  return (
    <div className="admin-dashboard">

      {/* =========================================
          SIDEBAR
      ========================================= */}

      <aside className="admin-sidebar">

        <div className="admin-brand">

          <div className="admin-brand-mark">
            Q
          </div>

          <div>
            <strong>QPA</strong>
            <span>Admin Panel</span>
          </div>

        </div>

        <nav
          className="admin-nav"
          aria-label="Admin navigation"
        >

          <button
            type="button"
            className="admin-nav-item active"
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              })
            }
          >
            <i className="fa-solid fa-chart-line" />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            className="admin-nav-item"
            onClick={() =>
              document
                .getElementById(
                  "admin-users"
                )
                ?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
            }
          >
            <i className="fa-solid fa-users" />
            <span>Users</span>
          </button>

          <button
            type="button"
            className="admin-nav-item"
            onClick={() =>
              document
                .getElementById(
                  "admin-courses"
                )
                ?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
            }
          >
            <i className="fa-solid fa-book-open" />
            <span>Courses</span>
          </button>

          <button
            type="button"
            className="admin-nav-item"
            onClick={() =>
              document
                .getElementById(
                  "admin-content"
                )
                ?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
            }
          >
            <i className="fa-solid fa-file-lines" />
            <span>Lessons</span>
          </button>

          <button
            type="button"
            className="admin-nav-item"
            onClick={() =>
              document
                .getElementById("admin-analytics")
                ?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
            }
          >
            <i className="fa-solid fa-credit-card" />
            <span>Purchases</span>
          </button>

        </nav>

        <div className="admin-sidebar-bottom">

          <button
            type="button"
            className="admin-nav-item"
            onClick={() =>
              navigate("/")
            }
          >
            <i className="fa-solid fa-house" />
            <span>View Website</span>
          </button>

          <button
            type="button"
            className="admin-nav-item admin-logout"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <i className="fa-solid fa-right-from-bracket" />

            <span>
              {isLoggingOut
                ? "Logging out..."
                : "Logout"}
            </span>
          </button>

        </div>

      </aside>

      {/* =========================================
          MAIN
      ========================================= */}

      <main className="admin-main">

        {/* HEADER */}

        <header className="admin-header">

          <div>

            <span className="admin-eyebrow">
              ADMINISTRATION
            </span>

            <h1>Dashboard</h1>

            <p>
              Welcome back{" "}
              <strong>
                {user?.name || "Admin"}
              </strong>
              .
            </p>

          </div>

          <div className="admin-profile">

            <div className="admin-avatar">
              {user?.name
                ?.charAt(0)
                ?.toUpperCase() || "A"}
            </div>

            <div>

              <strong>
                {user?.name || "Admin"}
              </strong>

              <span>
                Administrator
              </span>

            </div>

          </div>

        </header>

        {/* WELCOME */}

        <section className="admin-welcome-card">

          <div>

            <span className="admin-card-label">
              QPA CONTROL CENTER
            </span>

            <h2>
              Manage your academy
              <br />

              <span className="qpa-gradient-text">
                from one place.
              </span>
            </h2>

            <p>
              Your admin workspace is ready.
              Manage users, courses,
              modules and lessons from your
              QPA control center.
            </p>

          </div>

          <div className="admin-welcome-icon">
            <i className="fa-solid fa-layer-group" />
          </div>

        </section>

        {/* OVERVIEW */}

        <section className="admin-overview-grid">

          <article className="admin-stat-card">

            <div className="admin-stat-icon">
              <i className="fa-solid fa-users" />
            </div>

            <span>Total Users</span>

            <strong>
              {analytics.stats.totalUsers || userPagination.totalUsers}
            </strong>

            <small>
              Part 32
            </small>

          </article>

          <article className="admin-stat-card">

            <div className="admin-stat-icon">
              <i className="fa-solid fa-book-open" />
            </div>

            <span>Total Courses</span>

            <strong>
              {analytics.stats.totalCourses || courses.length}
            </strong>

            <small>
              Part 33
            </small>

          </article>

          <article className="admin-stat-card">

            <div className="admin-stat-icon">
              <i className="fa-solid fa-user-graduate" />
            </div>

            <span>Enrollments</span>

            <strong>
              {analytics.stats.totalEnrollments}
            </strong>

            <small>
              Part 36
            </small>

          </article>

          <article className="admin-stat-card">

            <div className="admin-stat-icon">
              <i className="fa-solid fa-indian-rupee-sign" />
            </div>

            <span>Revenue</span>

            <strong>
              ₹{Number(analytics.stats.totalRevenue || 0).toLocaleString("en-IN")}
            </strong>

            <small>
              Part 36
            </small>

          </article>

        </section>

        {/* =========================================
            STATISTICS, PURCHASES & LEADERBOARD — PART 36
        ========================================= */}

        <section
          id="admin-analytics"
          className="admin-analytics-section"
        >
          <div className="admin-section-heading">
            <div>
              <span className="admin-eyebrow">PART 36</span>
              <h2>Academy analytics</h2>
              <p className="admin-section-description">
                Live statistics, enrollments, purchases and leaderboard performance from MongoDB.
              </p>
            </div>

            <div className="admin-live-controls">
              <span className="admin-live-status">
                <i className="fa-solid fa-circle" />
                Live
                {analyticsUpdatedAt
                  ? ` • updated ${analyticsUpdatedAt.toLocaleTimeString()}`
                  : ""}
              </span>

              <button
                type="button"
                className="admin-live-refresh"
                onClick={refreshAll}
              >
                <i className="fa-solid fa-rotate-right" />
                Refresh now
              </button>
            </div>
          </div>

          {analyticsLoading ? (
            <div className="admin-analytics-state">
              <i className="fa-solid fa-spinner fa-spin" />
              <span>Loading academy analytics...</span>
            </div>
          ) : analyticsError ? (
            <div className="admin-analytics-state admin-analytics-error">
              <i className="fa-solid fa-triangle-exclamation" />
              <span>{analyticsError}</span>
            </div>
          ) : (
            <>
              <div className="admin-analytics-metrics">
                <article className="admin-analytics-metric">
                  <span>Active Users</span>
                  <strong>{analytics.stats.activeUsers}</strong>
                </article>
                <article className="admin-analytics-metric">
                  <span>Published Courses</span>
                  <strong>{analytics.stats.publishedCourses}</strong>
                </article>
                <article className="admin-analytics-metric">
                  <span>Paid Purchases</span>
                  <strong>{analytics.stats.paidPurchases}</strong>
                </article>
                <article className="admin-analytics-metric">
                  <span>Tests Completed</span>
                  <strong>{analytics.stats.totalTests}</strong>
                </article>
              </div>

              <div className="admin-analytics-grid">
                <article className="admin-analytics-card admin-analytics-wide">
                  <div className="admin-analytics-card-header">
                    <div>
                      <span className="admin-eyebrow">PURCHASES</span>
                      <h3>Recent purchases</h3>
                    </div>
                    <span className="admin-user-count">
                      {analytics.stats.totalPurchases} total
                    </span>
                  </div>

                  {analytics.purchases.length === 0 ? (
                    <div className="admin-analytics-empty">
                      <i className="fa-solid fa-receipt" />
                      <span>No purchases recorded yet.</span>
                    </div>
                  ) : (
                    <div className="admin-analytics-table-wrapper">
                      <table className="admin-analytics-table">
                        <thead>
                          <tr>
                            <th>Student</th>
                            <th>Course</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.purchases.map((purchase) => (
                            <tr key={purchase._id}>
                              <td>
                                <div className="admin-analytics-user">
                                  <strong>{purchase.user?.name || "Unknown"}</strong>
                                  <span>{purchase.user?.email || "—"}</span>
                                </div>
                              </td>
                              <td>{purchase.course?.title || "Unknown course"}</td>
                              <td>
                                {purchase.currency || "INR"}{" "}
                                {Number(purchase.amount || 0).toLocaleString("en-IN")}
                              </td>
                              <td>
                                <span className={`admin-payment-status ${purchase.status || "paid"}`}>
                                  {purchase.status || "paid"}
                                </span>
                              </td>
                              <td>
                                {purchase.purchasedAt
                                  ? new Date(purchase.purchasedAt).toLocaleDateString()
                                  : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </article>

                <article className="admin-analytics-card">
                  <div className="admin-analytics-card-header">
                    <div>
                      <span className="admin-eyebrow">ENROLLMENTS</span>
                      <h3>Recent enrollments</h3>
                    </div>
                    <span className="admin-user-count">
                      {analytics.stats.totalEnrollments} total
                    </span>
                  </div>

                  {analytics.enrollments.length === 0 ? (
                    <div className="admin-analytics-empty">
                      <i className="fa-solid fa-user-graduate" />
                      <span>No enrollments recorded yet.</span>
                    </div>
                  ) : (
                    <div className="admin-enrollment-list">
                      {analytics.enrollments.map((enrollment) => (
                        <div
                          className="admin-enrollment-item"
                          key={`${enrollment.userId}-${enrollment.courseId}`}
                        >
                          <div>
                            <strong>{enrollment.userName}</strong>
                            <span>{enrollment.courseTitle}</span>
                          </div>
                          <small>
                            {enrollment.enrolledAt
                              ? new Date(enrollment.enrolledAt).toLocaleDateString()
                              : "—"}
                          </small>
                        </div>
                      ))}
                    </div>
                  )}
                </article>

                <article className="admin-analytics-card admin-analytics-wide">
                  <div className="admin-analytics-card-header">
                    <div>
                      <span className="admin-eyebrow">LEADERBOARD</span>
                      <h3>Performance management</h3>
                    </div>

                    <select
                      value={leaderboardCourseId}
                      onChange={(event) =>
                        setLeaderboardCourseId(event.target.value)
                      }
                      aria-label="Select leaderboard scope"
                    >
                      <option value="global">All Courses</option>
                      {courses
                        .filter((course) => course.published)
                        .map((course) => (
                          <option key={course._id} value={course._id}>
                            {course.title}
                          </option>
                        ))}
                    </select>
                  </div>

                  {analytics.leaderboard.length === 0 ? (
                    <div className="admin-analytics-empty">
                      <i className="fa-solid fa-trophy" />
                      <span>No leaderboard results available yet.</span>
                    </div>
                  ) : (
                    <div className="admin-analytics-table-wrapper">
                      <table className="admin-analytics-table">
                        <thead>
                          <tr>
                            <th>Rank</th>
                            <th>Student</th>
                            <th>Best Score</th>
                            <th>Accuracy</th>
                            <th>WPM</th>
                            <th>Tests</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analytics.leaderboard.map((student) => (
                            <tr key={student.userId}>
                              <td>
                                <span className="admin-rank-badge">
                                  #{student.rank}
                                </span>
                              </td>
                              <td>{student.name}</td>
                              <td>{student.bestScore ?? 0}</td>
                              <td>{student.bestAccuracy ?? 0}%</td>
                              <td>{student.bestWpm ?? 0}</td>
                              <td>{student.testsCompleted ?? 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </article>
              </div>
            </>
          )}
        </section>

        {/* MANAGEMENT MODULES */}

        <section className="admin-shell-section">

          <div className="admin-section-heading">

            <div>

              <span className="admin-eyebrow">
                ADMIN WORKSPACE
              </span>

              <h2>
                Management modules
              </h2>

            </div>

          </div>

          <div className="admin-module-grid">

            <article className="admin-module-card">

              <i className="fa-solid fa-users" />

              <h3>
                User Management
              </h3>

              <p>
                View and manage QPA
                student accounts.
              </p>

              <span>
                Part 32 — Active
              </span>

            </article>

            <article className="admin-module-card">

              <i className="fa-solid fa-book" />

              <h3>
                Course Management
              </h3>

              <p>
                Create, edit and organize
                academy courses.
              </p>

              <span>
                Part 33 — Active
              </span>

            </article>

            <article className="admin-module-card">

              <i className="fa-solid fa-list-check" />

              <h3>
                Lessons &amp; Tests
              </h3>

              <p>
                Manage modules, lessons
                and dictation content.
              </p>

              <span>
                Part 34 — Active
              </span>

            </article>

          </div>

        </section>

        {/* =========================================
            USERS
        ========================================= */}

        <section
          id="admin-users"
          className="admin-users-section"
        >

          <div className="admin-section-heading">

            <div>

              <span className="admin-eyebrow">
                USER MANAGEMENT
              </span>

              <h2>
                Users
              </h2>

            </div>

            <span className="admin-user-count">
              {userPagination.totalUsers} total
            </span>

          </div>

          <div className="admin-users-toolbar">

            <div className="admin-search">

              <i className="fa-solid fa-magnifying-glass" />

              <input
                type="search"
                value={userSearch}
                onChange={(event) => {
                  setUserSearch(
                    event.target.value
                  );
                  setUserPage(1);
                }}
                placeholder="Search by name or email..."
                aria-label="Search users"
              />

            </div>

            <select
              value={userRole}
              onChange={(event) => {
                setUserRole(
                  event.target.value
                );
                setUserPage(1);
              }}
              aria-label="Filter users by role"
            >

              <option value="all">
                All roles
              </option>

              <option value="student">
                Students
              </option>

              <option value="admin">
                Admins
              </option>

            </select>

          </div>

          <div className="admin-users-card">

            {usersLoading ? (

              <div className="admin-users-state">

                <i className="fa-solid fa-spinner fa-spin" />

                <span>
                  Loading users...
                </span>

              </div>

            ) : usersError ? (

              <div className="admin-users-state admin-users-error">

                <i className="fa-solid fa-triangle-exclamation" />

                <span>
                  {usersError}
                </span>

              </div>

            ) : users.length === 0 ? (

              <div className="admin-users-state">

                <i className="fa-solid fa-user-slash" />

                <span>
                  No users found.
                </span>

              </div>

            ) : (

              <>

                <div className="admin-users-table-wrapper">

                  <table className="admin-users-table">

                    <thead>

                      <tr>
                        <th>User</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Last Login</th>
                        <th>Joined</th>
                        <th>Action</th>
                      </tr>

                    </thead>

                    <tbody>

                      {users.map((item) => (

                        <tr key={item._id}>

                          <td>

                            <div className="admin-user-cell">

                              <div className="admin-user-avatar">

                                {item.name
                                  ?.charAt(0)
                                  ?.toUpperCase() ||
                                  "U"}

                              </div>

                              <div>

                                <strong>
                                  {item.name ||
                                    "Unnamed User"}
                                </strong>

                                <span>
                                  {item.email}
                                </span>

                              </div>

                            </div>

                          </td>

                          <td>

                            <span
                              className={`admin-role-badge ${
                                item.role ===
                                "admin"
                                  ? "admin"
                                  : "student"
                              }`}
                            >
                              {item.role}
                            </span>

                          </td>

                          <td>

                            <span
                              className={`admin-status-badge ${
                                item.isActive
                                  ? "active"
                                  : "inactive"
                              }`}
                            >

                              <span />

                              {item.isActive
                                ? "Active"
                                : "Inactive"}

                            </span>

                          </td>

                          <td>

                            {item.lastLogin
                              ? new Date(
                                  item.lastLogin
                                ).toLocaleDateString()
                              : "Never"}

                          </td>

                          <td>

                            {item.createdAt
                              ? new Date(
                                  item.createdAt
                                ).toLocaleDateString()
                              : "—"}

                          </td>

                          <td>

                            {item._id ===
                            user?._id ? (

                              <span className="admin-current-user">
                                Current account
                              </span>

                            ) : (

                              <button
                                type="button"
                                className={`admin-status-action ${
                                  item.isActive
                                    ? "deactivate"
                                    : "activate"
                                }`}
                                disabled={
                                  updatingUserId ===
                                  item._id
                                }
                                onClick={() =>
                                  handleUserStatusChange(
                                    item._id,
                                    !item.isActive
                                  )
                                }
                              >

                                {updatingUserId ===
                                item._id
                                  ? "Updating..."
                                  : item.isActive
                                    ? "Deactivate"
                                    : "Activate"}

                              </button>

                            )}

                          </td>

                        </tr>

                      ))}

                    </tbody>

                  </table>

                </div>

                {userPagination.totalPages >
                  1 && (

                  <div className="admin-pagination">

                    <button
                      type="button"
                      disabled={
                        userPage <= 1
                      }
                      onClick={() =>
                        setUserPage(
                          (page) =>
                            Math.max(
                              page - 1,
                              1
                            )
                        )
                      }
                      aria-label="Previous page"
                    >
                      <i className="fa-solid fa-chevron-left" />
                    </button>

                    <span>
                      Page{" "}
                      {userPagination.page}{" "}
                      of{" "}
                      {
                        userPagination.totalPages
                      }
                    </span>

                    <button
                      type="button"
                      disabled={
                        userPage >=
                        userPagination.totalPages
                      }
                      onClick={() =>
                        setUserPage(
                          (page) =>
                            Math.min(
                              page + 1,
                              userPagination.totalPages
                            )
                        )
                      }
                      aria-label="Next page"
                    >
                      <i className="fa-solid fa-chevron-right" />
                    </button>

                  </div>

                )}

              </>

            )}

          </div>

        </section>

        {/* =========================================
            COURSES — PART 33
        ========================================= */}

        <section
          id="admin-courses"
          className="admin-courses-section"
        >

          <div className="admin-section-heading">

            <div>

              <span className="admin-eyebrow">
                COURSE MANAGEMENT
              </span>

              <h2>
                Courses
              </h2>

            </div>

            <button
              type="button"
              className="qpa-button qpa-button-primary"
              onClick={
                handleCreateCourse
              }
            >
              <i className="fa-solid fa-plus" />
              Create Course
            </button>

          </div>

          {showCourseForm && (

            <form
              className="admin-course-form"
              onSubmit={
                handleCourseSubmit
              }
            >

              <div className="admin-course-form-header">

                <div>

                  <span className="admin-eyebrow">
                    {editingCourseId
                      ? "EDIT COURSE"
                      : "NEW COURSE"}
                  </span>

                  <h3>
                    {editingCourseId
                      ? "Edit course"
                      : "Create a new course"}
                  </h3>

                </div>

                <button
                  type="button"
                  className="admin-close-button"
                  onClick={
                    resetCourseForm
                  }
                  aria-label="Close course form"
                >
                  <i className="fa-solid fa-xmark" />
                </button>

              </div>

              <div className="admin-course-form-grid">

                <div className="qpa-form-group">

                  <label htmlFor="course-title">
                    Course title
                  </label>

                  <input
                    id="course-title"
                    name="title"
                    value={
                      courseForm.title
                    }
                    onChange={
                      handleCourseChange
                    }
                    placeholder="e.g. English Shorthand"
                    required
                  />

                </div>

                <div className="qpa-form-group">

                  <label htmlFor="course-slug">
                    Slug
                  </label>

                  <input
                    id="course-slug"
                    name="slug"
                    value={
                      courseForm.slug
                    }
                    onChange={
                      handleCourseChange
                    }
                    placeholder="english-shorthand"
                    required
                  />

                </div>

                <div className="qpa-form-group">

                  <label htmlFor="course-category">
                    Category
                  </label>

                  <input
                    id="course-category"
                    name="category"
                    value={
                      courseForm.category
                    }
                    onChange={
                      handleCourseChange
                    }
                    placeholder="Typing"
                  />

                </div>

                <div className="qpa-form-group">

                  <label htmlFor="course-level">
                    Level
                  </label>

                  <select
                    id="course-level"
                    name="level"
                    value={
                      courseForm.level
                    }
                    onChange={
                      handleCourseChange
                    }
                  >

                    <option value="Beginner">
                      Beginner
                    </option>

                    <option value="Intermediate">
                      Intermediate
                    </option>

                    <option value="Advanced">
                      Advanced
                    </option>

                  </select>

                </div>

                <div className="qpa-form-group">

                  <label htmlFor="course-price">
                    Price (₹)
                  </label>

                  <input
                    id="course-price"
                    name="price"
                    type="number"
                    min="0"
                    value={
                      courseForm.price
                    }
                    onChange={
                      handleCourseChange
                    }
                    disabled={
                      courseForm.isFree
                    }
                  />

                </div>

                <div className="qpa-form-group">

                  <label htmlFor="course-thumbnail">
                    Thumbnail URL
                  </label>

                  <input
                    id="course-thumbnail"
                    name="thumbnail"
                    value={
                      courseForm.thumbnail
                    }
                    onChange={
                      handleCourseChange
                    }
                    placeholder="https://..."
                  />

                </div>

              </div>

              <div className="qpa-form-group">

                <label htmlFor="course-short-description">
                  Short description
                </label>

                <input
                  id="course-short-description"
                  name="shortDescription"
                  value={
                    courseForm.shortDescription
                  }
                  onChange={
                    handleCourseChange
                  }
                  placeholder="A short summary of the course"
                />

              </div>

              <div className="qpa-form-group">

                <label htmlFor="course-description">
                  Description
                </label>

                <textarea
                  id="course-description"
                  name="description"
                  value={
                    courseForm.description
                  }
                  onChange={
                    handleCourseChange
                  }
                  placeholder="Describe what students will learn..."
                  rows="6"
                />

              </div>

              <label className="admin-course-free-toggle">

                <input
                  type="checkbox"
                  name="isFree"
                  checked={
                    courseForm.isFree
                  }
                  onChange={
                    handleCourseChange
                  }
                />

                <span>
                  This is a free course
                </span>

              </label>

              <div className="admin-course-form-actions">

                <button
                  type="button"
                  className="qpa-button qpa-button-secondary"
                  onClick={
                    resetCourseForm
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="qpa-button qpa-button-primary"
                  disabled={
                    courseSaving
                  }
                >

                  {courseSaving
                    ? "Saving..."
                    : editingCourseId
                      ? "Update Course"
                      : "Create Course"}

                </button>

              </div>

            </form>

          )}

          <div className="admin-course-list">

            {coursesLoading ? (

              <div className="admin-users-state">

                <i className="fa-solid fa-spinner fa-spin" />

                <span>
                  Loading courses...
                </span>

              </div>

            ) : coursesError ? (

              <div className="admin-users-state admin-users-error">

                <i className="fa-solid fa-triangle-exclamation" />

                <span>
                  {coursesError}
                </span>

              </div>

            ) : courses.length === 0 ? (

              <div className="admin-users-state">

                <i className="fa-solid fa-book-open" />

                <span>
                  No courses created yet.
                </span>

              </div>

            ) : (

              courses.map((course) => (

                <article
                  className="admin-course-card"
                  key={course._id}
                >

                  <div className="admin-course-card-image">

                    {course.thumbnail ? (

                      <img
                        src={
                          course.thumbnail
                        }
                        alt=""
                      />

                    ) : (

                      <i className="fa-solid fa-book-open" />

                    )}

                  </div>

                  <div className="admin-course-card-content">

                    <div className="admin-course-card-top">

                      <span className="admin-role-badge student">
                        {course.level ||
                          course.difficulty ||
                          "Beginner"}
                      </span>

                      <span
                        className={
                          course.published
                            ? "admin-status-badge active"
                            : "admin-status-badge inactive"
                        }
                      >
                        <span />
                        {course.published
                          ? "Published"
                          : "Draft"}
                      </span>

                      <span
                        className={
                          course.isFree
                            ? "admin-status-badge active"
                            : "admin-status-badge inactive"
                        }
                      >
                        <span />
                        {course.isFree
                          ? "Free"
                          : `₹${course.price}`}
                      </span>

                    </div>

                    <h3>
                      {course.title}
                    </h3>

                    <p>
                      {course.shortDescription ||
                        "No short description added."}
                    </p>

                    <div className="admin-course-meta">

                      <span>
                        <i className="fa-solid fa-tag" />

                        {course.category ||
                          "Uncategorized"}
                      </span>

                      <span>
                        <i className="fa-solid fa-link" />

                        /{course.slug}
                      </span>

                      {course.published &&
                        course.publishedAt && (
                          <span>
                            <i className="fa-solid fa-calendar-check" />
                            Published{" "}
                            {new Date(
                              course.publishedAt
                            ).toLocaleDateString()}
                          </span>
                        )}

                    </div>

                    <div className="admin-course-actions">

                      <button
                        type="button"
                        className="admin-status-action activate"
                        onClick={() =>
                          handleEditCourse(
                            course
                          )
                        }
                      >
                        <i className="fa-solid fa-pen" />
                        Edit
                      </button>

                      <button
                        type="button"
                        className={`admin-status-action ${
                          course.published
                            ? "deactivate"
                            : "activate"
                        }`}
                        disabled={
                          publishingCourseId ===
                          course._id
                        }
                        onClick={() =>
                          handleCoursePublishing(
                            course
                          )
                        }
                      >
                        <i
                          className={`fa-solid ${
                            publishingCourseId ===
                            course._id
                              ? "fa-spinner fa-spin"
                              : course.published
                                ? "fa-eye-slash"
                                : "fa-cloud-arrow-up"
                          }`}
                        />
                        {publishingCourseId ===
                        course._id
                          ? "Updating..."
                          : course.published
                            ? "Unpublish"
                            : "Publish"}
                      </button>

                      <button
                        type="button"
                        className="admin-status-action deactivate"
                        onClick={() =>
                          handleDeleteCourse(
                            course._id
                          )
                        }
                      >
                        <i className="fa-solid fa-trash" />
                        Delete
                      </button>

                    </div>

                  </div>

                </article>

              ))

            )}

          </div>

        </section>

        {/* =========================================
            MODULES & LESSONS — PART 34
        ========================================= */}

        <section
          id="admin-content"
          className="admin-content-section"
        >

          <div className="admin-section-heading">

            <div>

              <span className="admin-eyebrow">
                CONTENT MANAGEMENT
              </span>

              <h2>
                Modules &amp; Lessons
              </h2>

              <p>
                Organize course modules,
                lessons, videos, dictations
                and tests.
              </p>

            </div>

          </div>

          {/* COURSE SELECTOR */}

          <div className="admin-content-selector">

            <label htmlFor="admin-content-course">
              Select course
            </label>

            <select
              id="admin-content-course"
              value={selectedCourseId}
              onChange={(event) => {
                setSelectedCourseId(
                  event.target.value
                );
                setShowModuleForm(false);
                setShowLessonForm(false);
                setEditingModuleId("");
                setEditingLessonId("");
              }}
            >

              <option value="">
                Choose a course...
              </option>

              {courses.map((course) => (

                <option
                  key={course._id}
                  value={course._id}
                >
                  {course.title}
                </option>

              ))}

            </select>

          </div>

          {!selectedCourseId ? (

            <div className="admin-users-state">

              <i className="fa-solid fa-book-open" />

              <span>
                Select a course to manage its
                modules and lessons.
              </span>

            </div>

          ) : (

            <div className="admin-content-manager">

              {/* =====================================
                  MODULE PANEL
              ===================================== */}

              <div className="admin-content-panel">

                <div className="admin-content-panel-header">

                  <div>

                    <span className="admin-eyebrow">
                      COURSE STRUCTURE
                    </span>

                    <h3>
                      Modules
                    </h3>

                  </div>

                  <button
                    type="button"
                    className="qpa-button qpa-button-primary"
                    onClick={
                      handleCreateModule
                    }
                  >
                    <i className="fa-solid fa-plus" />
                    Add Module
                  </button>

                </div>

                {showModuleForm && (

                  <form
                    className="admin-content-form"
                    onSubmit={
                      handleModuleSubmit
                    }
                  >

                    <div className="admin-content-form-header">

                      <h4>
                        {editingModuleId
                          ? "Edit Module"
                          : "Create Module"}
                      </h4>

                      <button
                        type="button"
                        className="admin-close-button"
                        onClick={
                          resetModuleForm
                        }
                        aria-label="Close module form"
                      >
                        <i className="fa-solid fa-xmark" />
                      </button>

                    </div>

                    <div className="qpa-form-group">

                      <label htmlFor="module-title">
                        Module title
                      </label>

                      <input
                        id="module-title"
                        name="title"
                        value={
                          moduleForm.title
                        }
                        onChange={
                          handleModuleChange
                        }
                        placeholder="e.g. Introduction to Shorthand"
                        required
                      />

                    </div>

                    <div className="qpa-form-group">

                      <label htmlFor="module-description">
                        Description
                      </label>

                      <textarea
                        id="module-description"
                        name="description"
                        value={
                          moduleForm.description
                        }
                        onChange={
                          handleModuleChange
                        }
                        placeholder="Describe this module..."
                        rows="4"
                      />

                    </div>

                    <div className="qpa-form-group">

                      <label htmlFor="module-order">
                        Order
                      </label>

                      <input
                        id="module-order"
                        name="order"
                        type="number"
                        min="0"
                        value={
                          moduleForm.order
                        }
                        onChange={
                          handleModuleChange
                        }
                      />

                    </div>

                    <div className="admin-content-form-actions">

                      <button
                        type="button"
                        className="qpa-button qpa-button-secondary"
                        onClick={
                          resetModuleForm
                        }
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="qpa-button qpa-button-primary"
                        disabled={
                          contentSaving
                        }
                      >
                        {contentSaving
                          ? "Saving..."
                          : editingModuleId
                            ? "Update Module"
                            : "Create Module"}
                      </button>

                    </div>

                  </form>

                )}

                {modulesLoading ? (

                  <div className="admin-users-state">

                    <i className="fa-solid fa-spinner fa-spin" />

                    <span>
                      Loading modules...
                    </span>

                  </div>

                ) : modulesError ? (

                  <div className="admin-users-state admin-users-error">

                    <i className="fa-solid fa-triangle-exclamation" />

                    <span>
                      {modulesError}
                    </span>

                  </div>

                ) : modules.length === 0 ? (

                  <div className="admin-users-state">

                    <i className="fa-solid fa-layer-group" />

                    <span>
                      No modules created for
                      this course yet.
                    </span>

                  </div>

                ) : (

                  <div className="admin-content-list">

                    {modules.map(
                      (module, index) => (

                        <article
                          key={module._id}
                          className={`admin-content-list-item ${
                            selectedModuleId ===
                            module._id
                              ? "selected"
                              : ""
                          }`}
                          onClick={() =>
                            setSelectedModuleId(
                              module._id
                            )
                          }
                        >

                          <button
                            type="button"
                            className="admin-content-item-main"
                            onClick={() =>
                              setSelectedModuleId(
                                module._id
                              )
                            }
                          >

                            <span className="admin-content-item-number">
                              {index + 1}
                            </span>

                            <span>

                              <strong>
                                {module.title}
                              </strong>

                              <small>
                                {module.description ||
                                  "No description"}
                              </small>

                            </span>

                          </button>

                          <div className="admin-content-item-actions">

                            <button
                              type="button"
                              className="admin-icon-action"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleEditModule(
                                  module
                                );
                              }}
                              aria-label={`Edit ${module.title}`}
                            >
                              <i className="fa-solid fa-pen" />
                            </button>

                            <button
                              type="button"
                              className="admin-icon-action danger"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteModule(
                                  module._id
                                );
                              }}
                              aria-label={`Delete ${module.title}`}
                            >
                              <i className="fa-solid fa-trash" />
                            </button>

                          </div>

                        </article>

                      )
                    )}

                  </div>

                )}

              </div>

              {/* =====================================
                  LESSON PANEL
              ===================================== */}

              <div className="admin-content-panel">

                <div className="admin-content-panel-header">

                  <div>

                    <span className="admin-eyebrow">
                      MODULE CONTENT
                    </span>

                    <h3>
                      {selectedModuleId
                        ? "Lessons"
                        : "Select a module"}
                    </h3>

                  </div>

                  <button
                    type="button"
                    className="qpa-button qpa-button-primary"
                    onClick={
                      handleCreateLesson
                    }
                    disabled={
                      !selectedModuleId
                    }
                  >
                    <i className="fa-solid fa-plus" />
                    Add Lesson
                  </button>

                </div>

                {showLessonForm && (

                  <form
                    className="admin-content-form"
                    onSubmit={
                      handleLessonSubmit
                    }
                  >

                    <div className="admin-content-form-header">

                      <div>

                        <span className="admin-eyebrow">
                          {editingLessonId
                            ? "EDIT CONTENT"
                            : "NEW CONTENT"}
                        </span>

                        <h4>
                          {editingLessonId
                            ? "Edit Lesson"
                            : "Create Lesson"}
                        </h4>

                      </div>

                      <button
                        type="button"
                        className="admin-close-button"
                        onClick={
                          resetLessonForm
                        }
                        aria-label="Close lesson form"
                      >
                        <i className="fa-solid fa-xmark" />
                      </button>

                    </div>

                    <div className="admin-content-form-grid">

                      <div className="qpa-form-group">

                        <label htmlFor="lesson-title">
                          Title
                        </label>

                        <input
                          id="lesson-title"
                          name="title"
                          value={
                            lessonForm.title
                          }
                          onChange={
                            handleLessonChange
                          }
                          placeholder="e.g. Basic Strokes"
                          required
                        />

                      </div>

                      <div className="qpa-form-group">

                        <label htmlFor="lesson-type">
                          Content type
                        </label>

                        <select
                          id="lesson-type"
                          name="type"
                          value={
                            lessonForm.type
                          }
                          onChange={
                            handleLessonChange
                          }
                        >

                          <option value="lesson">
                            Lesson
                          </option>

                          <option value="video">
                            Video
                          </option>

                          <option value="dictation">
                            Dictation
                          </option>

                          <option value="test">
                            Test
                          </option>

                        </select>

                      </div>

                      <div className="qpa-form-group">

                        <label htmlFor="lesson-duration">
                          Duration (minutes)
                        </label>

                        <input
                          id="lesson-duration"
                          name="duration"
                          type="number"
                          min="0"
                          value={
                            lessonForm.duration
                          }
                          onChange={
                            handleLessonChange
                          }
                        />

                      </div>

                      <div className="qpa-form-group">

                        <label htmlFor="lesson-order">
                          Order
                        </label>

                        <input
                          id="lesson-order"
                          name="order"
                          type="number"
                          min="0"
                          value={
                            lessonForm.order
                          }
                          onChange={
                            handleLessonChange
                          }
                        />

                      </div>

                    </div>

                    <div className="qpa-form-group">

                      <label htmlFor="lesson-description">
                        Description
                      </label>

                      <textarea
                        id="lesson-description"
                        name="description"
                        value={
                          lessonForm.description
                        }
                        onChange={
                          handleLessonChange
                        }
                        placeholder="Describe what students will learn..."
                        rows="4"
                      />

                    </div>

                    {lessonForm.type === "dictation" && (
  <div className="qpa-form-group admin-dictation-transcript-field">

    <label htmlFor="lesson-transcript">
      Dictation Transcript
    </label>

    <textarea
      id="lesson-transcript"
      name="transcript"
      value={lessonForm.transcript || ""}
      onChange={handleLessonChange}
      rows={7}
      placeholder="Enter the exact authoritative transcript for this dictation..."
      required
    />

    <small>
      This transcript is used by QPA's server-side
      scoring engine to calculate accuracy, mistakes,
      WPM and score. It will not be shown to the
      student before submission.
    </small>

  </div>
)}

                    <div className="qpa-form-group">

  <label htmlFor="lesson-audio">
    Dictation Audio File
  </label>

  <input
    id="lesson-audio"
    name="audioUrl"
    type="text"
    value={lessonForm.audioUrl || ""}
    onChange={handleLessonChange}
    placeholder="dictation-001.mp3"
    autoComplete="off"
    disabled={lessonForm.type !== "dictation"}
  />

  <small className="admin-form-help">
    Enter the exact MP3 filename stored in
    server/uploads/dictations, for example:
    <strong> dictation-001.mp3</strong>
  </small>

</div>

                    <div className="qpa-form-group">

                      <label htmlFor="lesson-content">
                        Content / Dictation Text
                      </label>

                      <textarea
                        id="lesson-content"
                        name="content"
                        value={
                          lessonForm.content
                        }
                        onChange={
                          handleLessonChange
                        }
                        placeholder={
                          lessonForm.type ===
                          "dictation"
                            ? "Enter the dictation text students will type..."
                            : "Enter lesson content..."
                        }
                        rows="10"
                      />

                    </div>

                    <div className="admin-content-form-actions">

                      <button
                        type="button"
                        className="qpa-button qpa-button-secondary"
                        onClick={
                          resetLessonForm
                        }
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        className="qpa-button qpa-button-primary"
                        disabled={
                          contentSaving
                        }
                      >
                        {contentSaving
                          ? "Saving..."
                          : editingLessonId
                            ? "Update Lesson"
                            : "Create Lesson"}
                      </button>

                    </div>

                  </form>

                )}

                {!selectedModuleId ? (

                  <div className="admin-users-state">

                    <i className="fa-solid fa-arrow-left" />

                    <span>
                      Select a module to view
                      its lessons.
                    </span>

                  </div>

                ) : lessonsLoading ? (

                  <div className="admin-users-state">

                    <i className="fa-solid fa-spinner fa-spin" />

                    <span>
                      Loading lessons...
                    </span>

                  </div>

                ) : lessonsError ? (

                  <div className="admin-users-state admin-users-error">

                    <i className="fa-solid fa-triangle-exclamation" />

                    <span>
                      {lessonsError}
                    </span>

                  </div>

                ) : lessons.length === 0 ? (

                  <div className="admin-users-state">

                    <i className="fa-solid fa-file-circle-plus" />

                    <span>
                      No lessons created in
                      this module yet.
                    </span>

                  </div>

                ) : (

                  <div className="admin-content-list">

                    {lessons.map(
                      (lesson, index) => (

                        <article
                          key={lesson._id}
                          className="admin-content-list-item"
                        >

                          <div className="admin-content-item-main">

                            <span className="admin-content-item-number">
                              {index + 1}
                            </span>

                            <span>

                              <strong>
                                {lesson.title}
                              </strong>

                              <small>
                                {lesson.type
                                  ?.charAt(0)
                                  .toUpperCase() +
                                  lesson.type?.slice(
                                    1
                                  )}

                                {lesson.duration
                                  ? ` • ${lesson.duration} min`
                                  : ""}
                              </small>

                            </span>

                          </div>

                          <div className="admin-content-item-actions">

                            <button
                              type="button"
                              className="admin-icon-action"
                              onClick={() =>
                                handleEditLesson(
                                  lesson
                                )
                              }
                              aria-label={`Edit ${lesson.title}`}
                            >
                              <i className="fa-solid fa-pen" />
                            </button>

                            <button
                              type="button"
                              className="admin-icon-action danger"
                              onClick={() =>
                                handleDeleteLesson(
                                  lesson._id
                                )
                              }
                              aria-label={`Delete ${lesson.title}`}
                            >
                              <i className="fa-solid fa-trash" />
                            </button>

                          </div>

                        </article>

                      )
                    )}

                  </div>

                )}

              </div>

            </div>

          )}

        </section>

      </main>

    </div>
  );
};

export default AdminDashboard;