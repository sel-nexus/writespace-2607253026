import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicNavbar from "./components/PublicNavbar";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Home from "./pages/Home";
import ReadBlog from "./pages/ReadBlog";
import WriteBlog from "./pages/WriteBlog";
import AdminDashboard from "./pages/AdminDashboard";
import UserManagement from "./pages/UserManagement";
import { getSession } from "./utils/auth";

const ROUTE_TITLES = {
  "/": "Landing · WriteSpace",
  "/login": "Login · WriteSpace",
  "/register": "Register · WriteSpace",
  "/blogs": "Blogs · WriteSpace",
  "/write": "Write · WriteSpace",
  "/admin": "Admin · WriteSpace",
  "/users": "Users · WriteSpace",
};

/** Compose public, authentication, and protected publishing routes. */
export function App() {
  const location = useLocation();
  const session = getSession();
  const isLanding = location.pathname === "/";

  useEffect(() => {
    if (location.pathname.startsWith("/blog/")) return undefined;

    const title = location.pathname.startsWith("/edit/")
      ? "Edit · WriteSpace"
      : ROUTE_TITLES[location.pathname] || "WriteSpace";
    document.title = title;

    return () => {
      if (document.title === title) document.title = "WriteSpace";
    };
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50">
      {isLanding ? (
        session ? (
          <Navbar session={session} />
        ) : (
          <PublicNavbar session={null} />
        )
      ) : session ? (
        <Navbar session={session} />
      ) : null}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route element={<ProtectedRoute guestOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/blogs" element={<Home />} />
          <Route path="/blog/:id" element={<ReadBlog />} />
          <Route path="/write" element={<WriteBlog />} />
          <Route path="/edit/:id" element={<WriteBlog />} />
        </Route>
        <Route element={<ProtectedRoute requiredRole="admin" />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/users" element={<UserManagement />} />
        </Route>
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </div>
  );
}

export default App;
