import React, {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import {
  auth,
  db,
} from "../../firebase";

import "./AdminLogin.css";


/* =========================================================
   LOWZACK
   ADMIN LOGIN
========================================================= */


function AdminLogin() {

  const navigate =
    useNavigate();

  const location =
    useLocation();


  /* =======================================================
     FORM STATE
  ======================================================= */

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");


  /* =======================================================
     UI STATE
  ======================================================= */

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [checkingAuth, setCheckingAuth] =
    useState(true);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");


  /* =======================================================
     REGISTRATION / REDIRECT MESSAGE

     Jika user selesai register:

     /admin/register
          ↓
     /admin/login

     location.state membawa pesan:

     "Account berhasil dibuat.
      Tunggu approval admin sebelum login."
  ======================================================= */

  useEffect(() => {

    const state =
      location.state;


    if (
      state?.registrationSuccess
    ) {

      setSuccess(
        state.message ||
        "Account berhasil dibuat. Tunggu approval admin sebelum login."
      );


      /*
         Hapus state dari browser history.

         Tujuannya agar ketika user refresh halaman,
         pesan registrationSuccess tidak muncul lagi.
      */

      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );

    }


  }, [location]);


  /* =======================================================
     AUTH SESSION CHECK

     Saat halaman login dibuka:

     1. Tidak login
        → tetap di login.

     2. Sudah login + role admin
        → /admin

     3. Sudah login + role user
        → signOut()
        → tetap di login.

     Ini mencegah user biasa yang masih memiliki
     Firebase session masuk ke dashboard.
  ======================================================= */

  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (user) => {

          /* =================================================
             BELUM LOGIN
          ================================================= */

          if (!user) {

            setCheckingAuth(false);

            return;

          }


          try {

            /* ===============================================
               GET FIRESTORE USER PROFILE
            =============================================== */

            const userRef =
              doc(
                db,
                "users",
                user.uid
              );


            const userSnapshot =
              await getDoc(
                userRef
              );


            /* ===============================================
               ADMIN
            =============================================== */

            if (
              userSnapshot.exists()
              &&
              userSnapshot.data()?.role === "admin"
            ) {

              navigate(
                "/admin",
                {
                  replace: true,
                }
              );

              return;

            }


            /* ===============================================
               BUKAN ADMIN

               User bisa saja authenticated di Firebase,
               tetapi belum mendapatkan approval admin.
            =============================================== */

            await signOut(auth);

            setCheckingAuth(false);


          } catch (error) {

            console.error(
              "Admin login session check error:",
              error
            );


            /*
               Jika pengecekan Firestore gagal,
               jangan biarkan session tetap aktif.
            */

            try {

              await signOut(auth);

            } catch (signOutError) {

              console.error(
                "Sign out error:",
                signOutError
              );

            }


            setCheckingAuth(false);

          }

        }
      );


    return () => {

      unsubscribe();

    };

  }, [navigate]);


  /* =======================================================
     CLEAR ERROR
  ======================================================= */

  useEffect(() => {

    if (!error) {

      return;

    }


    const timer =
      setTimeout(() => {

        setError("");

      }, 7000);


    return () => {

      clearTimeout(timer);

    };

  }, [error]);


  /* =======================================================
     FIREBASE ERROR TRANSLATOR
  ======================================================= */

  const getFirebaseErrorMessage = (
    errorCode
  ) => {

    switch (errorCode) {


      /* ===================================================
         INVALID CREDENTIAL
      =================================================== */

      case "auth/invalid-credential":

        return (
          "Email atau password salah."
        );


      /* ===================================================
         INVALID EMAIL
      =================================================== */

      case "auth/invalid-email":

        return (
          "Format email tidak valid."
        );


      /* ===================================================
         USER DISABLED
      =================================================== */

      case "auth/user-disabled":

        return (
          "Akun ini telah dinonaktifkan."
        );


      /* ===================================================
         USER NOT FOUND
      =================================================== */

      case "auth/user-not-found":

        return (
          "Akun tidak ditemukan."
        );


      /* ===================================================
         WRONG PASSWORD
      =================================================== */

      case "auth/wrong-password":

        return (
          "Email atau password salah."
        );


      /* ===================================================
         TOO MANY REQUESTS
      =================================================== */

      case "auth/too-many-requests":

        return (
          "Terlalu banyak percobaan. Silakan coba lagi nanti."
        );


      /* ===================================================
         NETWORK
      =================================================== */

      case "auth/network-request-failed":

        return (
          "Koneksi gagal. Periksa koneksi internet kamu."
        );


      /* ===================================================
         FIRESTORE PERMISSION
      =================================================== */

      case "permission-denied":

      case "firestore/permission-denied":

        return (
          "Tidak dapat memeriksa status akun. Pastikan Firestore Rules sudah dipublish."
        );


      /* ===================================================
         DEFAULT
      =================================================== */

      default:

        return (
          "Login gagal. Silakan coba lagi."
        );

    }

  };


  /* =======================================================
     HANDLE LOGIN
  ======================================================= */

  const handleLogin =
    async (event) => {

      event.preventDefault();


      /* ===================================================
         RESET MESSAGE
      =================================================== */

      setError("");

      setSuccess("");


      /* ===================================================
         NORMALIZE EMAIL
      =================================================== */

      const normalizedEmail =
        email.trim().toLowerCase();


      /* ===================================================
         VALIDATE EMAIL
      =================================================== */

      if (!normalizedEmail) {

        setError(
          "Email wajib diisi."
        );

        return;

      }


      /* ===================================================
         VALIDATE PASSWORD
      =================================================== */

      if (!password) {

        setError(
          "Password wajib diisi."
        );

        return;

      }


      try {

        setLoading(true);


        /* =================================================
           STEP 1
           FIREBASE AUTHENTICATION

           Email + password harus benar terlebih dahulu.
        ================================================= */

        const userCredential =
          await signInWithEmailAndPassword(
            auth,
            normalizedEmail,
            password
          );


        const user =
          userCredential.user;


        /* =================================================
           STEP 2
           GET FIRESTORE PROFILE

           Collection:
           users

           Document:
           Firebase Auth UID
        ================================================= */

        const userRef =
          doc(
            db,
            "users",
            user.uid
          );


        const userSnapshot =
          await getDoc(
            userRef
          );


        /* =================================================
           STEP 3
           PROFILE TIDAK ADA
        ================================================= */

        if (
          !userSnapshot.exists()
        ) {

          /*
             Firebase Auth account ada,
             tetapi Firestore profile tidak ditemukan.

             Jangan izinkan dashboard.
          */

          await signOut(auth);


          setError(
            "Profile akun tidak ditemukan. Silakan hubungi administrator."
          );


          return;

        }


        /* =================================================
           STEP 4
           GET USER DATA
        ================================================= */

        const userData =
          userSnapshot.data();


        /* =================================================
           STEP 5
           ROLE CHECK

           HANYA:

           role === "admin"

           yang boleh masuk dashboard.
        ================================================= */

        if (
          userData?.role !== "admin"
        ) {

          /*
             Account sudah terdaftar,
             tetapi DEV belum mengubah:

             role: "user"

             menjadi:

             role: "admin"
          */

          await signOut(auth);


          setError(
            "Account belum disetujui admin. Silakan tunggu approval sebelum login."
          );


          return;

        }


        /* =================================================
           STEP 6
           ADMIN VERIFIED
        ================================================= */

        setSuccess(
          "Admin access verified. Redirecting..."
        );


        /* =================================================
           DESTINATION

           Jika user sebelumnya mencoba membuka:

           /admin

           ProtectedRoute akan mengirim:

           state.from

           Jika tidak ada,
           gunakan /admin.
        ================================================= */

        const destination =
          location.state?.from?.pathname ||
          "/admin";


        /* =================================================
           REDIRECT
        ================================================= */

        setTimeout(() => {

          navigate(
            destination,
            {
              replace: true,
            }
          );

        }, 300);


      } catch (error) {

        console.error(
          "Admin login error:",
          error
        );


        setError(
          getFirebaseErrorMessage(
            error?.code
          )
        );


      } finally {

        setLoading(false);

      }

    };


  /* =======================================================
     AUTH CHECK LOADING
  ======================================================= */

  if (checkingAuth) {

    return (

      <main className="admin-auth-page">

        <div className="admin-auth-loading">

          <div className="admin-auth-loader" />

          <span>
            CHECKING SESSION
          </span>

        </div>

      </main>

    );

  }


  /* =======================================================
     LOGIN PAGE
  ======================================================= */

  return (

    <main className="admin-auth-page">


      {/* =================================================
          BACKGROUND
      ================================================= */}

      <div className="admin-auth-background">

        <div className="admin-auth-grid" />

        <div className="admin-auth-glow" />

      </div>


      {/* =================================================
          TOP BRAND
      ================================================= */}

      <div className="admin-auth-topbar">

        <Link
          to="/"
          className="admin-auth-brand"
        >

          <span>
            LOWZACK
          </span>

          <small>
            ADMIN
          </small>

        </Link>


        <Link
          to="/"
          className="admin-auth-back"
        >

          <span>
            ↖
          </span>

          BACK TO SITE

        </Link>

      </div>


      {/* =================================================
          LOGIN WRAPPER
      ================================================= */}

      <section className="admin-auth-container">


        {/* =================================================
            HEADER
        ================================================= */}

        <div className="admin-auth-header">

          <span className="admin-auth-eyebrow">
            LOWZACK / ADMIN SYSTEM
          </span>


          <h1>
            SIGN
            <br />
            IN.
          </h1>


          <p>
            Sign in to access the Lowzack
            management system.
          </p>

        </div>


        {/* =================================================
            LOGIN CARD
        ================================================= */}

        <div className="admin-auth-card">


          {/* =================================================
              CARD TOP
          ================================================= */}

          <div className="admin-auth-card-top">

            <span>
              ADMIN LOGIN
            </span>

            <span>
              01
            </span>

          </div>


          {/* =================================================
              ERROR MESSAGE
          ================================================= */}

          {error && (

            <div
              className="admin-auth-message admin-auth-error"
              role="alert"
            >

              <span className="admin-auth-message-icon">
                !
              </span>

              <span>
                {error}
              </span>

            </div>

          )}


          {/* =================================================
              SUCCESS MESSAGE
          ================================================= */}

          {success && (

            <div
              className="admin-auth-message admin-auth-success"
              role="status"
            >

              <span className="admin-auth-message-icon">
                ✓
              </span>

              <span>
                {success}
              </span>

            </div>

          )}


          {/* =================================================
              FORM
          ================================================= */}

          <form
            className="admin-auth-form"
            onSubmit={handleLogin}
          >


            {/* ===============================================
                EMAIL
            =============================================== */}

            <div className="admin-auth-field">

              <label htmlFor="login-email">
                EMAIL ADDRESS
              </label>


              <input
                id="login-email"
                type="email"
                name="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                placeholder="admin@example.com"
                autoComplete="email"
                disabled={loading}
                required
              />

            </div>


            {/* ===============================================
                PASSWORD
            =============================================== */}

            <div className="admin-auth-field">

              <label htmlFor="login-password">
                PASSWORD
              </label>


              <div className="admin-auth-password">

                <input
                  id="login-password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  name="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={loading}
                  required
                />


                <button
                  type="button"
                  className="admin-auth-password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (previous) =>
                        !previous
                    )
                  }
                  disabled={loading}
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >

                  {showPassword
                    ? "HIDE"
                    : "SHOW"
                  }

                </button>

              </div>

            </div>


            {/* ===============================================
                SUBMIT
            =============================================== */}

            <button
              type="submit"
              className="admin-auth-submit"
              disabled={loading}
            >

              <span>

                {loading
                  ? "VERIFYING ACCESS..."
                  : "SIGN IN"
                }

              </span>


              <span className="admin-auth-submit-arrow">

                {loading
                  ? "..."
                  : "→"
                }

              </span>

            </button>

          </form>


          {/* =================================================
              REGISTER FOOTER
          ================================================= */}

          <div className="admin-auth-card-footer">

            <span>
              NEED AN ACCOUNT?
            </span>


            <Link
              to="/admin/register"
            >

              REGISTER

              <span>
                ↗
              </span>

            </Link>

          </div>

        </div>


        {/* =================================================
            SECURITY NOTE
        ================================================= */}

        <div className="admin-auth-note">

          <span className="admin-auth-note-icon">
            ◆
          </span>

          <p>
            ADMIN ACCESS IS RESTRICTED.
            <br />
            APPROVAL IS REQUIRED BEFORE LOGIN.
          </p>

        </div>

      </section>


      {/* =================================================
          PAGE FOOTER
      ================================================= */}

      <footer className="admin-auth-footer">

        <span>
          LOWZACK
        </span>

        <span>
          ADMIN SYSTEM
        </span>

        <span>
          © {new Date().getFullYear()}
        </span>

      </footer>

    </main>

  );

}


export default AdminLogin;