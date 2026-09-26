import { useEffect, useMemo, useState } from "react";

import SectionHeading from "./SectionHeading";
import EmptyState from "./EmptyState";
import LoadingSpinner from "./LoadingSpinner";

import {
  getPublishedCourses,
} from "../services/api";

const formatPrice = (course) => {
  if (course.accessType === "free" || course.price === 0) {
    return "Free";
  }

  return `₹${Number(course.price).toLocaleString("en-IN")}`;
};

const CourseSection = () => {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState("featured");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getPublishedCourses();

        setCourses(data.courses || []);
      } catch (err) {
        console.error("Course loading error:", err);

        setError(
          err.message || "Unable to load courses right now."
        );
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, []);

  const categories = useMemo(() => {
    const uniqueCategories = [
      ...new Set(
        courses
          .map((course) => course.category)
          .filter(Boolean)
      ),
    ];

    return uniqueCategories;
  }, [courses]);

  const filteredCourses = useMemo(() => {
    let result = [...courses];

    const normalizedSearch = search
      .trim()
      .toLowerCase();

    if (normalizedSearch) {
      result = result.filter((course) => {
        const searchableText = [
          course.title,
          course.shortDescription,
          course.description,
          course.category,
          ...(course.tags || []),
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedSearch);
      });
    }

    if (category !== "all") {
      result = result.filter(
        (course) => course.category === category
      );
    }

    if (sortBy === "newest") {
      result.sort(
        (a, b) =>
          new Date(b.createdAt || 0) -
          new Date(a.createdAt || 0)
      );
    }

    if (sortBy === "price-low") {
      result.sort(
        (a, b) =>
          Number(a.price || 0) -
          Number(b.price || 0)
      );
    }

    if (sortBy === "price-high") {
      result.sort(
        (a, b) =>
          Number(b.price || 0) -
          Number(a.price || 0)
      );
    }

    if (sortBy === "rating") {
      result.sort(
        (a, b) =>
          Number(b.rating?.average || 0) -
          Number(a.rating?.average || 0)
      );
    }

    if (sortBy === "featured") {
      result.sort(
        (a, b) =>
          Number(b.featured) -
          Number(a.featured)
      );
    }

    return result;
  }, [courses, search, category, sortBy]);

  return (
    <section className="qpa-section courses-section">
      <div className="qpa-container">
        <SectionHeading
          eyebrow="Explore QPA"
          title="Courses built for real progress."
          description="Learn at your pace, practice with purpose, and build the speed and accuracy you need."
        />

        <div className="course-toolbar">
          <div className="course-search">
            <span className="course-search-icon">
              <i className="fa-solid fa-magnifying-glass"></i>
            </span>

            <input
              type="search"
              placeholder="Search courses..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              aria-label="Search courses"
            />
          </div>

          <div className="course-sort">
            <label htmlFor="course-sort">
              Sort
            </label>

            <select
              id="course-sort"
              value={sortBy}
              onChange={(event) =>
                setSortBy(event.target.value)
              }
            >
              <option value="featured">
                Featured
              </option>

              <option value="newest">
                Newest
              </option>

              <option value="rating">
                Highest Rated
              </option>

              <option value="price-low">
                Price: Low to High
              </option>

              <option value="price-high">
                Price: High to Low
              </option>
            </select>
          </div>
        </div>

        <div className="course-filters">
          <button
            type="button"
            className={
              category === "all"
                ? "course-filter active"
                : "course-filter"
            }
            onClick={() => setCategory("all")}
          >
            All Courses
          </button>

          {categories.map((item) => (
            <button
              type="button"
              key={item}
              className={
                category === item
                  ? "course-filter active"
                  : "course-filter"
              }
              onClick={() => setCategory(item)}
            >
              {item.charAt(0).toUpperCase() +
                item.slice(1)}
            </button>
          ))}
        </div>

        {loading && (
          <div className="course-state">
            <LoadingSpinner />
            <p>Loading QPA courses...</p>
          </div>
        )}

        {!loading && error && (
          <div className="course-state course-error">
            <div className="course-state-icon">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>

            <h3>Unable to load courses</h3>

            <p>{error}</p>

            <button
              type="button"
              className="qpa-btn qpa-btn-primary"
              onClick={() =>
                window.location.reload()
              }
            >
              Try Again
            </button>
          </div>
        )}

        {!loading &&
          !error &&
          filteredCourses.length === 0 && (
            <div className="course-state">
              <EmptyState
                icon="fa-solid fa-book-open"
                title={
                  courses.length === 0
                    ? "No courses published yet"
                    : "No courses found"
                }
                description={
                  courses.length === 0
                    ? "New QPA courses will appear here when they are published."
                    : "Try changing your search or category filter."
                }
              />
            </div>
          )}

        {!loading &&
          !error &&
          filteredCourses.length > 0 && (
            <div className="course-grid">
              {filteredCourses.map((course) => (
                <article
                  className="course-card qpa-card"
                  key={course._id}
                >
                  <div className="course-image">
                    {course.thumbnail ? (
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        loading="lazy"
                      />
                    ) : (
                      <div className="course-image-placeholder">
                        <i className="fa-solid fa-graduation-cap"></i>
                      </div>
                    )}

                    <div className="course-badges">
                      {course.featured && (
                        <span className="course-badge featured">
                          Featured
                        </span>
                      )}

                      <span className="course-badge">
                        {course.accessType === "free"
                          ? "Free"
                          : "Premium"}
                      </span>
                    </div>
                  </div>

                  <div className="course-content">
                    <div className="course-category">
                      {course.category}
                    </div>

                    <h3>{course.title}</h3>

                    <p className="course-description">
                      {course.shortDescription}
                    </p>

                    <div className="course-meta">
                      <span>
                        <i className="fa-regular fa-clock"></i>
                        {course.estimatedDuration || 0} min
                      </span>

                      <span>
                        <i className="fa-solid fa-book-open"></i>
                        {course.totalLessons || 0} lessons
                      </span>

                      <span>
                        <i className="fa-solid fa-signal"></i>
                        {course.difficulty}
                      </span>
                    </div>

                    <div className="course-rating">
                      <span className="rating-stars">
                        <i className="fa-solid fa-star"></i>
                      </span>

                      <strong>
                        {Number(
                          course.rating?.average || 0
                        ).toFixed(1)}
                      </strong>

                      <span>
                        ({course.rating?.count || 0})
                      </span>
                    </div>

                    <div className="course-bottom">
                      <div className="course-price">
                        {formatPrice(course)}
                      </div>

                      <button
                        type="button"
                        className="qpa-btn qpa-btn-primary course-view-btn"
                        onClick={() => {
                          window.location.href = `/courses/${course.slug}`;
                        }}
                      >
                        View Course
                        <i className="fa-solid fa-arrow-right"></i>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
      </div>
    </section>
  );
};

export default CourseSection;