import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import Releases from "./pages/Releases";
import Discography from "./pages/DISCOGRAPHY";
import Biography from "./pages/Biography";

import AdminPage from "./pages/Admin/AdminPage";
import AdminLogin from "./pages/Admin/AdminLogin";
import AdminRegister from "./pages/Admin/AdminRegister";
import AdminDiscography from "./pages/Admin/AdminDiscography";

import ProtectedRoute from "./pages/Admin/ProtectedRoute";


/* =========================================================
   LOWZACK
   APP ROUTER
========================================================= */


/* =========================================================
   APP CONTENT

   Navbar publik hanya ditampilkan pada halaman website.

   Footer publik juga hanya ditampilkan pada halaman website.

   Semua route /admin/* tidak menggunakan Navbar publik
   dan Footer publik karena halaman Admin memiliki
   AdminNavbar sendiri.
========================================================= */

function AppContent() {

  const location = useLocation();

  const isAdminRoute =
    location.pathname.startsWith("/admin");


  return (
    <>

      {/* =====================================================
          PUBLIC NAVBAR

          Navbar muncul pada halaman publik.

          Tidak muncul pada:
          /admin
          /admin/login
          /admin/register
          /admin/*
      ===================================================== */}

      {!isAdminRoute && <Navbar />}


      {/* =====================================================
          ROUTES
      ===================================================== */}

      <Routes>


        {/* ===================================================
            HOME
            /
        =================================================== */}

        <Route
          path="/"
          element={<Home />}
        />


        {/* ===================================================
            RELEASES
            /releases

            Data diambil dari:

            Firestore
            collection: "releases"

            Data berasal dari AdminPage.jsx.
        =================================================== */}

        <Route
          path="/releases"
          element={<Releases />}
        />


        {/* ===================================================
            DISCOGRAPHY
            /discography

            Halaman daftar seluruh karya LOWZACK.

            Data nantinya dapat disinkronkan dengan
            Admin Discography melalui Firestore
            collection: "karya".
        =================================================== */}

        <Route
          path="/discography"
          element={<Discography />}
        />


        {/* ===================================================
            BIOGRAPHY
            /biography

            Halaman biografi LOWZACK.
        =================================================== */}

        <Route
          path="/biography"
          element={<Biography />}
        />


        {/* ===================================================
            RELEASE DETAIL
            /release/:id
        =================================================== */}

        {/*
        <Route
          path="/release/:id"
          element={<ReleaseDetail />}
        />
        */}


        {/* ===================================================
            ARCHIVE
            /archive
        =================================================== */}

        {/*
        <Route
          path="/archive"
          element={<Archive />}
        />
        */}


        {/* ===================================================
            ADMIN LOGIN
            /admin/login
        =================================================== */}

        <Route
          path="/admin/login"
          element={<AdminLogin />}
        />


        {/* ===================================================
            ADMIN REGISTER
            /admin/register
        =================================================== */}

        <Route
          path="/admin/register"
          element={<AdminRegister />}
        />


        {/* ===================================================
            ADMIN DASHBOARD
            /admin

            Protected Route
        =================================================== */}

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        />


        {/* ===================================================
            ADMIN DISCOGRAPHY
            /admin/discography

            Digunakan untuk mengelola seluruh karya MUSIC
            yang ditampilkan pada halaman public:

            /discography

            Source of truth:
            Firestore collection "karya"
        =================================================== */}

        <Route
          path="/admin/discography"
          element={
            <ProtectedRoute>
              <AdminDiscography />
            </ProtectedRoute>
          }
        />


        {/* ===================================================
            ADMIN VIDEOS
            /admin/videos

            Belum digunakan.
        =================================================== */}

        {/*
        <Route
          path="/admin/videos"
          element={
            <ProtectedRoute>
              <AdminVideos />
            </ProtectedRoute>
          }
        />
        */}


        {/* ===================================================
            ADMIN RELEASES
            /admin/releases

            Belum digunakan.

            Jika nanti Admin Releases dibuat sebagai halaman
            terpisah, route ini bisa diaktifkan.
        =================================================== */}

        {/*
        <Route
          path="/admin/releases"
          element={
            <ProtectedRoute>
              <AdminReleases />
            </ProtectedRoute>
          }
        />
        */}


        {/* ===================================================
            ADMIN ARCHIVE
            /admin/archive

            Belum digunakan.
        =================================================== */}

        {/*
        <Route
          path="/admin/archive"
          element={
            <ProtectedRoute>
              <AdminArchive />
            </ProtectedRoute>
          }
        />
        */}


      </Routes>


      {/* =====================================================
          PUBLIC FOOTER

          Footer hanya muncul pada halaman publik.

          Tidak muncul pada:
          /admin
          /admin/login
          /admin/register
          /admin/*
      ===================================================== */}

      {!isAdminRoute && <Footer />}

    </>
  );
}


/* =========================================================
   APP
========================================================= */

function App() {

  return (
    <BrowserRouter>

      <AppContent />

    </BrowserRouter>
  );
}


/* =========================================================
   EXPORT
========================================================= */

export default App;
