import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import LoadingSpinner from "../components/LoadingSpinner";
import { useAuth } from "../context/AuthContext";
import CourseReviews from "../components/CourseReviews";

import {
  getCourseBySlug,
  getCourseEnrollment,
  enrollInFreeCourse,
  checkCourseAccess,
   createPaymentOrder,
  verifyPayment,
} from "../services/api";

const formatPrice = (course) => {
  if (
    course.accessType === "free" ||
    Number(course.price) === 0
  ) {
    return "Free";
  }

  return `₹${Number(course.price).toLocaleString("en-IN")}`;
};

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const CourseDetail = () => {
  const { slug } = useParams();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [enrolled, setEnrolled] = useState(false);

  const [enrollmentLoading, setEnrollmentLoading] =
    useState(false);

  const [enrollmentMessage, setEnrollmentMessage] =
    useState("");

  const [paymentLoading, setPaymentLoading] =
    useState(false);

  const [paymentMessage, setPaymentMessage] = useState("");

  const [hasCourseAccess, setHasCourseAccess] =
    useState(false);

  const [accessLoading, setAccessLoading] =
    useState(true);

const { user, isLoading: authLoading } = useAuth();

  /*
   * =========================================
   * CHECK PAID COURSE ACCESS
   * =========================================
   */

  useEffect(() => {
  const checkAccess = async () => {
    // Still finding out who is logged in: wait, don't decide yet
    if (authLoading) {
      setAccessLoading(true);
      return;
    }

    if (!course?._id || !user) {
      setHasCourseAccess(false);
      setAccessLoading(false);
      return;
    }
      try {
        setAccessLoading(true);

        const data =
          await checkCourseAccess(course._id);

        setHasCourseAccess(
          data.hasAccess === true
        );
      } catch (accessError) {
        console.error(
          "Course access check error:",
          accessError
        );

        setHasCourseAccess(false);
      } finally {
        setAccessLoading(false);
      }
    };

    checkAccess();
  }, [course?._id, user]);

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

        const data =
          await getCourseBySlug(slug);

        setCourse(data.course);

        /*
         * Check enrollment.
         *
         * This is mainly relevant for free courses
         * and existing enrollment functionality.
         */

        try {
          const enrollmentData =
            await getCourseEnrollment(
              data.course._id
            );

          setEnrolled(
            enrollmentData.enrolled === true
          );
        } catch (enrollmentError) {
          if (
            enrollmentError.status === 404
          ) {
            setEnrolled(false);
          } else if (
            enrollmentError.status === 401
          ) {
            /*
             * User is not logged in.
             * Do not treat this as a course-loading error.
             */
            setEnrolled(false);
          } else {
            console.error(
              "Enrollment check error:",
              enrollmentError
            );
          }
        }
      } catch (err) {
        console.error(
          "Course detail loading error:",
          err
        );

        setError(
          err.message ||
            "Unable to load this course."
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
   * FREE COURSE ENROLLMENT
   * =========================================
   */

  const handleEnrollment = async () => {
    if (!course) {
      return;
    }

    setEnrollmentLoading(true);
    setEnrollmentMessage("");

    try {
      const data =
        await enrollInFreeCourse(
          course._id
        );

      setEnrolled(true);
      setHasCourseAccess(true);

      setEnrollmentMessage(
        data.message ||
          "You are now enrolled in this course."
      );
    } catch (err) {
      console.error(
        "Enrollment error:",
        err
      );

      if (err.status === 401) {
        setEnrollmentMessage(
          "Please log in to enroll in this course."
        );
      } else {
        setEnrollmentMessage(
          err.message ||
            "Unable to enroll right now."
        );
      }
    } finally {
      setEnrollmentLoading(false);
    }
  };




  const handlePayment = async () => {
  if (!course || paymentLoading) return;

  setPaymentMessage("");

  if (!user) {
    setPaymentMessage("Please log in to buy this course.");
    return;
  }

  setPaymentLoading(true);

  try {
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      throw new Error("Could not load Razorpay. Check your internet connection.");
    }

    const order = await createPaymentOrder(course._id);

    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      order_id: order.id,
      name: "QPA Academy",
      description: course.title,
      prefill: { name: user?.name, email: user?.email },

      handler: async (response) => {
        try {
          await verifyPayment({
            courseId: course._id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });

          setHasCourseAccess(true);
        } catch (verifyError) {
          console.error("Payment verification error:", verifyError);
          setPaymentMessage(
            `Payment received but verification failed. Contact support with payment ID ${response.razorpay_payment_id}.`
          );
        } finally {
          setPaymentLoading(false);
        }
      },

      modal: { ondismiss: () => setPaymentLoading(false) },
    };

    const rzp = new window.Razorpay(options);

    rzp.on("payment.failed", (resp) => {
      setPaymentMessage(
        resp.error?.description || "Payment failed. Please try again."
      );
      setPaymentLoading(false);
    });

    rzp.open();
  } catch (err) {
    console.error("Payment error:", err);
    setPaymentMessage(err.message || "Unable to start payment.");
    setPaymentLoading(false);
  }
};

  const handleReviewSummary = (summary) => {
    setCourse((previous) =>
      previous
        ? {
            ...previous,
            rating: {
              average: summary.average,
              count: summary.count,
            },
          }
        : previous
    );
  };
 
 

  /*
   * =========================================
   * LOADING STATE
   * =========================================
   */

  if (loading) {
    return (
      <main className="course-detail-page">
        <div className="qpa-container">
          <div className="course-detail-state">
            <LoadingSpinner />

            <p>
              Loading course...
            </p>
          </div>
        </div>
      </main>
    );
  }

  /*
   * =========================================
   * ERROR STATE
   * =========================================
   */

  if (error || !course) {
    return (
      <main className="course-detail-page">
        <div className="qpa-container">
          <div className="course-detail-state">
            <div className="course-detail-error-icon">
              <i className="fa-solid fa-book-open"></i>
            </div>

            <h1>
              Course not found
            </h1>

            <p>
              {error ||
                "The course you are looking for does not exist or is not currently published."}
            </p>

            <Link
              to="/"
              className="qpa-btn qpa-btn-primary"
            >
              Back to Courses
            </Link>
          </div>
        </div>
      </main>
    );
  }

  /*
   * =========================================
   * ACCESS HELPERS
   * =========================================
   */

  const isFreeCourse =
    course.accessType === "free" ||
    Number(course.price) === 0;

  const canContinue =
    isFreeCourse
      ? enrolled || hasCourseAccess
      : hasCourseAccess;

  /*
   * =========================================
   * PAGE
   * =========================================
   */

  return (
    <main className="course-detail-page">
      <section className="course-detail-hero">
        <div className="qpa-container">

          {/* Breadcrumbs */}

          <div className="course-breadcrumbs">
            <Link to="/">
              Home
            </Link>

            <i className="fa-solid fa-chevron-right"></i>

            <Link to="/">
              Courses
            </Link>

            <i className="fa-solid fa-chevron-right"></i>

            <span>
              {course.title}
            </span>
          </div>

          <div className="course-detail-layout">

            {/* =================================
                MAIN COURSE INFORMATION
                ================================= */}

            <div className="course-detail-main">

              <div className="course-detail-category">
                {course.category}
              </div>

              <h1>
                {course.title}
              </h1>

              <p className="course-detail-short-description">
                {course.shortDescription}
              </p>

              <div className="course-detail-rating">

                <span className="course-detail-stars">
                  <i className="fa-solid fa-star"></i>
                </span>

                <strong>
                  {Number(
                    course.rating?.average || 0
                  ).toFixed(1)}
                </strong>

                <span>
                  (
                  {course.rating?.count || 0}
                  {" "}
                  ratings)
                </span>

              </div>

              <div className="course-detail-meta">

                {/* Level */}

                <div>
                  <span className="course-detail-meta-icon">
                    <i className="fa-solid fa-signal"></i>
                  </span>

                  <span>
                    <small>
                      Level
                    </small>

                    <strong>
                      {course.difficulty}
                    </strong>
                  </span>
                </div>

                {/* Lessons */}

                <div>
                  <span className="course-detail-meta-icon">
                    <i className="fa-solid fa-book-open"></i>
                  </span>

                  <span>
                    <small>
                      Lessons
                    </small>

                    <strong>
                      {course.totalLessons || 0}
                    </strong>
                  </span>
                </div>

                {/* Duration */}

                <div>
                  <span className="course-detail-meta-icon">
                    <i className="fa-regular fa-clock"></i>
                  </span>

                  <span>
                    <small>
                      Duration
                    </small>

                    <strong>
                      {course.estimatedDuration || 0}
                      {" "}
                      min
                    </strong>
                  </span>
                </div>

                {/* Students */}

                <div>
                  <span className="course-detail-meta-icon">
                    <i className="fa-solid fa-users"></i>
                  </span>

                  <span>
                    <small>
                      Students
                    </small>

                    <strong>
                      {course.enrollmentCount || 0}
                    </strong>
                  </span>
                </div>

              </div>
            </div>

            {/* =================================
                COURSE PURCHASE CARD
                ================================= */}

            <aside className="course-detail-card qpa-card">

              <div className="course-detail-thumbnail">

                {course.thumbnail ? (
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                  />
                ) : (
                  <div className="course-detail-thumbnail-placeholder">
                    <i className="fa-solid fa-graduation-cap"></i>
                  </div>
                )}

              </div>

              <div className="course-detail-card-content">

                <div className="course-detail-price">
                  {formatPrice(course)}
                </div>

                <div className="course-detail-access">

                  <i className="fa-solid fa-circle-check"></i>

                  {isFreeCourse
                    ? "Free access"
                    : "Premium course"}

                </div>

                {/* =================================
                    ACTION BUTTON
                    ================================= */}

                {canContinue ? (
                  <Link
                    to={`/learn/${course.slug}`}
                    className="qpa-btn qpa-btn-primary course-detail-action"
                  >
                    Continue Course

                    <span>
                      →
                    </span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="qpa-btn qpa-btn-primary course-detail-action"
                    onClick={
                      isFreeCourse
                        ? handleEnrollment
                        : handlePayment
                    }
                    disabled={
                      enrollmentLoading ||
                      paymentLoading ||
                      accessLoading
                    }
                  >
                    {enrollmentLoading ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin"></i>

                        Enrolling...
                      </>
                    ) : paymentLoading ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin"></i>

                        Processing...
                      </>
                    ) : isFreeCourse ? (
                      <>
                        Start Course
                        <span>
                          →
                        </span>
                      </>
                    ) : (
                      <>
                        Buy Now
                        <span>
                          →
                        </span>
                      </>
                    )}
                  </button>
                )}

                {/* Enrollment message */}

                {enrollmentMessage && (
                  <div className="course-enrollment-message">

                    <i className="fa-solid fa-circle-check"></i>

                    <span>
                      {enrollmentMessage}
                    </span>

                  </div>
                )}

                {paymentMessage && (
  <div className="course-enrollment-message">
    <i className="fa-solid fa-circle-exclamation"></i>
    <span>{paymentMessage}</span>
  </div>
)}

                <p className="course-detail-action-note">
                  {canContinue
                    ? "You already have access to this course."
                    : isFreeCourse
                    ? "Enroll for free and start learning immediately."
                    : "Secure payment gives you access to the complete course."}
                </p>

              </div>
            </aside>

          </div>
        </div>
      </section>

      {/* =====================================
          COURSE CONTENT
          ===================================== */}

      <section className="course-detail-content-section qpa-section-sm">

        <div className="qpa-container">

          <div className="course-content-layout">

            {/* =================================
                DESCRIPTION + CURRICULUM
                ================================= */}

            <div className="course-description-panel">

              <div className="course-panel-header">
                <span>
                  About this course
                </span>
              </div>

              <div className="course-description-text">

                {course.description
                  .split("\n")
                  .map(
                    (paragraph, index) => (
                      <p key={index}>
                        {paragraph}
                      </p>
                    )
                  )}

              </div>

              {/* Curriculum */}

              <div className="course-curriculum">

                <div className="course-panel-heading">

                  <div>

                    <span className="course-panel-eyebrow">
                      Curriculum
                    </span>

                    <h2>
                      Course modules & lessons
                    </h2>

                  </div>

                  <span className="course-lesson-count">
                    {course.modules?.length || 0}
                    {" "}
                    modules
                  </span>

                </div>

                {course.modules?.length > 0 ? (

                  <div className="course-modules">

                    {course.modules.map(
                      (
                        module,
                        moduleIndex
                      ) => (

                        <div
                          className="course-module"
                          key={module._id}
                        >

                          <div className="course-module-header">

                            <div className="course-module-number">
                              {String(
                                moduleIndex + 1
                              ).padStart(
                                2,
                                "0"
                              )}
                            </div>

                            <div className="course-module-info">

                              <h3>
                                {module.title}
                              </h3>

                              {module.description && (
                                <p>
                                  {module.description}
                                </p>
                              )}

                            </div>

                            <span className="course-module-count">
                              {module.lessons?.length || 0}
                              {" "}
                              lessons
                            </span>

                          </div>

                          {module.lessons?.length > 0 && (

                            <div className="course-lessons">

                              {module.lessons.map(
                                (lesson) => (

                                  <div
                                    className="course-lesson"
                                    key={lesson._id}
                                  >

                                    <div className="course-lesson-icon">

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

                                    </div>

                                    <div className="course-lesson-info">

                                      <strong>
                                        {lesson.title}
                                      </strong>

                                      <span>
                                        {lesson.type}

                                        {lesson.duration
                                          ? ` • ${lesson.duration} min`
                                          : ""}
                                      </span>

                                    </div>

                                    {lesson.isFreePreview && (
                                      <span className="preview-badge">
                                        Preview
                                      </span>
                                    )}

                                  </div>

                                )
                              )}

                            </div>

                          )}

                        </div>

                      )
                    )}

                  </div>

                ) : (

                  <div className="course-no-content">

                    <i className="fa-solid fa-layer-group"></i>

                    <p>
                      Course curriculum will be
                      available soon.
                    </p>

                  </div>

                )}

              </div>
            </div>

            {/* =================================
                INSTRUCTOR
                ================================= */}

            <aside className="course-instructor-card qpa-card">

              <div className="course-panel-eyebrow">
                Instructor
              </div>

              <div className="course-instructor">

                <div className="course-instructor-image">

                  {course.instructor?.image ? (
                    <img
                      src={course.instructor.image}
                      alt={
                        course.instructor.name
                      }
                    />
                  ) : (
                    <i className="fa-solid fa-user"></i>
                  )}

                </div>

                <div>

                  <h3>
                    {course.instructor?.name ||
                      "QPA Academy"}
                  </h3>

                  <span>
                    QPA Instructor
                  </span>

                </div>

              </div>

              {course.instructor?.bio && (
                <p className="course-instructor-bio">
                  {course.instructor.bio}
                </p>
              )}

            </aside>

          </div>

            <CourseReviews
            courseId={course._id}
            onSummaryChange={handleReviewSummary}
          />

        </div>

      </section>
    </main>
  );
};

export default CourseDetail;