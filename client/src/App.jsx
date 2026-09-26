import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";

import { AuthProvider } from "./context/AuthContext";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoutes from "./components/AdminRoutes";

import Hero from "./components/Hero";
import CourseSection from "./components/CourseSection";
import AcademySection from "./components/AcademySection";

import Dashboard from "./pages/Dashboard";
import CourseDetail from "./pages/CourseDetail";
import CourseLearning from "./pages/CourseLearning";
import TestEngine from "./pages/TestEngine";
import Leaderboard from "./pages/Leaderboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgetPassword from "./pages/ForgetPassword";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import Courses from "./pages/Courses";
import HelpCenter from "./pages/HelpCenter";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CookiePolicy from "./pages/CookiePolicy";
import Email from "./pages/Email.jsx";


const Home = () => {
  return (
    <>
      <Navbar />

      <main>
        <Hero />
        <CourseSection />
        <AcademySection />
      </main>

      <Footer />
    </>
  );
};

const PublicLayout = ({ children }) => {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Analytics />
        <Routes>
          {/* HOME */}
          <Route path="/" element={<Home />} />

          {/* AUTH */}
          <Route
            path="/login"
            element={
              <PublicLayout>
                <Login />
              </PublicLayout>
            }
          />

          <Route
            path="/register"
            element={
              <PublicLayout>
                <Register />
              </PublicLayout>
            }
          />

          <Route
  path="/forget-password"
  element={
    <PublicLayout>
      <ForgetPassword />
    </PublicLayout>
  }
/>

<Route
  path="/reset-password/:token"
  element={
    <PublicLayout>
      <ResetPassword />
    </PublicLayout>
  }
/>

          {/* COURSES LISTING */}
<Route
  path="/courses"
  element={
    <PublicLayout>
      <Courses />
    </PublicLayout>
  }
/>

          {/* PUBLIC COURSES */}
          <Route
            path="/courses/:slug"
            element={
              <PublicLayout>
                <CourseDetail />
              </PublicLayout>
            }
          />

          {/* PUBLIC LEADERBOARD */}
          <Route
            path="/leaderboard"
            element={
              <PublicLayout>
                <Leaderboard />
              </PublicLayout>
            }
          />

          {/* STUDENT DASHBOARD */}
         <Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <PublicLayout>
        <Dashboard />
      </PublicLayout>
    </ProtectedRoute>
  }
/>

          {/* STUDENT PROFILE */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <PublicLayout>
                  <Profile />
                </PublicLayout>
              </ProtectedRoute>
            }
          />

          {/* COURSE LEARNING */}
          <Route
            path="/learn/:slug"
            element={
              <ProtectedRoute>
                <PublicLayout>
                  <CourseLearning />
                </PublicLayout>
              </ProtectedRoute>
            }
          />

          {/* TEST ENGINE */}
          <Route
            path="/tests/:testId"
            element={
              <ProtectedRoute>
                <PublicLayout>
                  <TestEngine />
                </PublicLayout>
              </ProtectedRoute>
            }
          />

          {/* ADMIN */}
          <Route
            path="/admin"
            element={
              <AdminRoutes>
                <AdminDashboard />
              </AdminRoutes>
            }
          />

          {/* HELP + LEGAL */}
          <Route
            path="/help"
            element={
              <PublicLayout>
                <HelpCenter />
              </PublicLayout>
            }
          />

          <Route
            path="/privacy"
            element={
              <PublicLayout>
                <PrivacyPolicy />
              </PublicLayout>
            }
          />

          <Route
            path="/terms"
            element={
              <PublicLayout>
                <TermsOfService />
              </PublicLayout>
            }
          />

          <Route
            path="/cookies"
            element={
              <PublicLayout>
                <CookiePolicy />
              </PublicLayout>
            }
          />

          {/* FALLBACK */}
          <Route
            path="*"
            element={
              <PublicLayout>
                <div className="qpa-section">
                  <div className="qpa-container">
                    <h1>404 — Page Not Found</h1>
                    <p>
                      The page you are looking for does not exist.
                    </p>
                  </div>
                </div>
              </PublicLayout>
            }
          />
          <Route path="/email" element={<Email />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;