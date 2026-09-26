import React, {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import {
  auth,
  db,
} from "../../firebase";

import "./AdminRegister.css";


/* =========================================================
   LOWZACK
   ADMIN REGISTER
========================================================= */


function AdminRegister() {

  const navigate = useNavigate();


  /* =======================================================
     FORM STATE
  ======================================================= */

  const [fullName, setFullName] = useState("");

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");


  /* =======================================================
     UI STATE
  ======================================================= */

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
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
     AUTH CHECK

     REGISTER PAGE TIDAK BOLEH otomatis membawa user
     biasa ke dashboard.

     Jika user sudah login:

     role = admin
       → dashboard

     role = user
       → tetap di register/login area

     Karena setelah register kita langsung signOut(),
     user baru tidak akan masuk dashboard.
  ======================================================= */

  useEffect(() => {

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {

        if (!user) {

          setCheckingAuth(false);

          return;
        }


        try {

          const userRef = doc(
            db,
            "users",
            user.uid
          );

          const userSnapshot =
            await getDoc(userRef);


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


          /*
             User biasa tidak diarahkan ke dashboard.
             Tetap di halaman register.
          */

          setCheckingAuth(false);

        } catch (error) {

          console.error(
            "Register auth check error:",
            error
          );

          setCheckingAuth(false);

        }

      }
    );


    return () => {

      unsubscribe();

    };

  }, [navigate]);


  /* =======================================================
     CLEAR MESSAGE
  ======================================================= */

  useEffect(() => {

    if (!error && !success) {

      return;

    }


    const timer = setTimeout(() => {

      setError("");

      setSuccess("");

    }, 7000);


    return () => {

      clearTimeout(timer);

    };

  }, [error, success]);


  /* =======================================================
     FIREBASE ERROR TRANSLATOR
  ======================================================= */

  const getFirebaseErrorMessage = (
    errorCode
  ) => {

    switch (errorCode) {

      case "auth/email-already-in-use":

        return (
          "Email ini sudah terdaftar. Silakan login."
        );


      case "auth/invalid-email":

        return (
          "Format email tidak valid."
        );


      case "auth/weak-password":

        return (
          "Password terlalu lemah. Gunakan minimal 6 karakter."
        );


      case "auth/operation-not-allowed":

        return (
          "Email & Password Authentication belum diaktifkan di Firebase."
        );


      case "auth/network-request-failed":

        return (
          "Koneksi gagal. Periksa koneksi internet kamu."
        );


      case "auth/too-many-requests":

        return (
          "Terlalu banyak percobaan. Silakan coba lagi nanti."
        );


      case "permission-denied":

      case "firestore/permission-denied":

        return (
          "Firestore menolak akses. Pastikan Firestore Rules sudah dipublish."
        );


      default:

        return (
          "Registrasi gagal. Silakan coba lagi."
        );

    }

  };


  /* =======================================================
     HANDLE REGISTER
  ======================================================= */

  const handleRegister = async (
    event
  ) => {

    event.preventDefault();


    setError("");

    setSuccess("");


    /* =====================================================
       NORMALIZE
    ===================================================== */

    const normalizedFullName =
      fullName.trim();

    const normalizedEmail =
      email.trim().toLowerCase();


    /* =====================================================
       VALIDATE FULL NAME
    ===================================================== */

    if (!normalizedFullName) {

      setError(
        "Full Name wajib diisi."
      );

      return;

    }


    if (
      normalizedFullName.length < 2
    ) {

      setError(
        "Full Name terlalu pendek."
      );

      return;

    }


    /* =====================================================
       VALIDATE EMAIL
    ===================================================== */

    if (!normalizedEmail) {

      setError(
        "Email wajib diisi."
      );

      return;

    }


    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    if (
      !emailPattern.test(
        normalizedEmail
      )
    ) {

      setError(
        "Masukkan alamat email yang valid."
      );

      return;

    }


    /* =====================================================
       VALIDATE PASSWORD
    ===================================================== */

    if (!password) {

      setError(
        "Password wajib diisi."
      );

      return;

    }


    if (password.length < 6) {

      setError(
        "Password minimal 6 karakter."
      );

      return;

    }


    /* =====================================================
       CONFIRM PASSWORD
    ===================================================== */

    if (!confirmPassword) {

      setError(
        "Konfirmasi password wajib diisi."
      );

      return;

    }


    if (
      password !== confirmPassword
    ) {

      setError(
        "Password dan konfirmasi password tidak sama."
      );

      return;

    }


    /* =====================================================
       REGISTER
    ===================================================== */

    try {

      setLoading(true);


      /* ===================================================
         CREATE FIREBASE AUTH USER
      =================================================== */

      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          normalizedEmail,
          password
        );


      const user =
        userCredential.user;


      const uid =
        user.uid;


      /* ===================================================
         CREATE FIRESTORE PROFILE

         ROLE SELALU "user".

         TIDAK ADA:
         - email admin
         - primary admin
         - custom claim
         - automatic admin
      =================================================== */

      await setDoc(
        doc(
          db,
          "users",
          uid
        ),
        {
          FullName:
            normalizedFullName,

          uid:
            uid,

          role:
            "user",

          createdAt:
            serverTimestamp(),
        }
      );


      /* ===================================================
         LOGOUT

         createUserWithEmailAndPassword()
         otomatis membuat user login.

         Kita TIDAK ingin user baru langsung
         mempunyai session admin.

         Maka setelah profile berhasil dibuat,
         user langsung di-logout.
      =================================================== */

      await signOut(auth);


      /* ===================================================
         SUCCESS
      =================================================== */

      setSuccess(
        "Account berhasil dibuat. Menunggu approval admin."
      );


      /* ===================================================
         RESET FORM
      =================================================== */

      setFullName("");

      setEmail("");

      setPassword("");

      setConfirmPassword("");


      /* ===================================================
         REDIRECT LOGIN

         User TIDAK masuk dashboard.

         User harus menunggu DEV mengubah:

         role: "user"

         menjadi:

         role: "admin"
      =================================================== */

      setTimeout(() => {

        navigate(
          "/admin/login",
          {
            replace: true,

            state: {
              registrationSuccess:
                true,

              message:
                "Account berhasil dibuat. Tunggu approval admin sebelum login.",
            },
          }
        );

      }, 1200);


    } catch (error) {

      console.error(
        "Admin registration error:",
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
     REGISTER PAGE
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
          REGISTER WRAPPER
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
            CREATE
            <br />
            ACCOUNT.
          </h1>


          <p>
            Create an account to request
            access to the Lowzack management system.
          </p>

        </div>


        {/* =================================================
            REGISTER CARD
        ================================================= */}

        <div className="admin-auth-card">


          {/* =================================================
              CARD TOP
          ================================================= */}

          <div className="admin-auth-card-top">

            <span>
              ADMIN REGISTRATION
            </span>

            <span>
              01
            </span>

          </div>


          {/* =================================================
              ERROR
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
              SUCCESS
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
            onSubmit={handleRegister}
          >


            {/* ===============================================
                FULL NAME
            =============================================== */}

            <div className="admin-auth-field">

              <label htmlFor="register-full-name">
                FULL NAME
              </label>


              <input
                id="register-full-name"
                type="text"
                name="fullName"
                value={fullName}
                onChange={(event) =>
                  setFullName(
                    event.target.value
                  )
                }
                placeholder="Athfal Kurniawan S"
                autoComplete="name"
                disabled={loading}
                required
              />

            </div>


            {/* ===============================================
                EMAIL
            =============================================== */}

            <div className="admin-auth-field">

              <label htmlFor="register-email">
                EMAIL ADDRESS
              </label>


              <input
                id="register-email"
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

              <label htmlFor="register-password">
                PASSWORD
              </label>


              <div className="admin-auth-password">

                <input
                  id="register-password"
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
                  placeholder="Minimum 6 characters"
                  autoComplete="new-password"
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
                CONFIRM PASSWORD
            =============================================== */}

            <div className="admin-auth-field">

              <label htmlFor="register-confirm-password">
                CONFIRM PASSWORD
              </label>


              <div className="admin-auth-password">

                <input
                  id="register-confirm-password"
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target.value
                    )
                  }
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  disabled={loading}
                  required
                />


                <button
                  type="button"
                  className="admin-auth-password-toggle"
                  onClick={() =>
                    setShowConfirmPassword(
                      (previous) =>
                        !previous
                    )
                  }
                  disabled={loading}
                  aria-label={
                    showConfirmPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >

                  {showConfirmPassword
                    ? "HIDE"
                    : "SHOW"
                  }

                </button>

              </div>

            </div>


            {/* ===============================================
                PASSWORD STATUS
            =============================================== */}

            {password && (

              <div className="admin-password-status">

                <span
                  className={
                    password.length >= 6
                      ? "valid"
                      : ""
                  }
                >

                  {password.length >= 6
                    ? "✓"
                    : "○"
                  }

                  MINIMUM 6 CHARACTERS

                </span>


                <span
                  className={
                    password &&
                    confirmPassword &&
                    password === confirmPassword
                      ? "valid"
                      : ""
                  }
                >

                  {password &&
                  confirmPassword &&
                  password === confirmPassword
                    ? "✓"
                    : "○"
                  }

                  PASSWORDS MATCH

                </span>

              </div>

            )}


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
                  ? "CREATING ACCOUNT..."
                  : "CREATE ACCOUNT"
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
              FOOTER
          ================================================= */}

          <div className="admin-auth-card-footer">

            <span>
              ALREADY HAVE AN ACCOUNT?
            </span>


            <Link
              to="/admin/login"
            >

              SIGN IN

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
            ADMIN ACCESS REQUIRES APPROVAL.
            <br />
            YOUR ACCOUNT MUST BE APPROVED BEFORE LOGIN.
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


export default AdminRegister;