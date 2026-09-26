import React, {
  useEffect,
  useState,
} from "react";

import {
  Navigate,
  useLocation,
} from "react-router-dom";

import {
  onAuthStateChanged,
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


/* =========================================================
   LOWZACK
   ADMIN PROTECTED ROUTE
========================================================= */


function ProtectedRoute({
  children,
}) {

  const location =
    useLocation();


  /* =======================================================
     STATE
  ======================================================= */

  const [status, setStatus] =
    useState("loading");

  /*
     Possible:

     loading
     admin
     unauthorized
  */


  /* =======================================================
     AUTH + ROLE CHECK
  ======================================================= */

  useEffect(() => {

    let mounted = true;


    const unsubscribe =
      onAuthStateChanged(
        auth,
        async (user) => {

          /* =================================================
             USER BELUM LOGIN
          ================================================= */

          if (!user) {

            if (mounted) {

              setStatus(
                "unauthorized"
              );

            }

            return;

          }


          /* =================================================
             GET FIRESTORE PROFILE
          ================================================= */

          try {

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
               PROFILE TIDAK DITEMUKAN
            =============================================== */

            if (
              !userSnapshot.exists()
            ) {

              await signOut(auth);


              if (mounted) {

                setStatus(
                  "unauthorized"
                );

              }

              return;

            }


            const userData =
              userSnapshot.data();


            /* ===============================================
               ROLE CHECK
            =============================================== */

            if (
              userData?.role !== "admin"
            ) {

              /*
                 User authenticated tetapi bukan admin.

                 Jangan biarkan session tetap aktif
                 ketika mencoba masuk dashboard.
              */

              await signOut(auth);


              if (mounted) {

                setStatus(
                  "unauthorized"
                );

              }

              return;

            }


            /* ===============================================
               ADMIN VERIFIED
            =============================================== */

            if (mounted) {

              setStatus(
                "admin"
              );

            }


          } catch (error) {

            console.error(
              "Protected route authorization error:",
              error
            );


            try {

              await signOut(auth);

            } catch (signOutError) {

              console.error(
                "Protected route sign out error:",
                signOutError
              );

            }


            if (mounted) {

              setStatus(
                "unauthorized"
              );

            }

          }

        }
      );


    return () => {

      mounted = false;

      unsubscribe();

    };

  }, []);


  /* =======================================================
     LOADING
  ======================================================= */

  if (
    status === "loading"
  ) {

    return (

      <main className="admin-auth-page">

        <div className="admin-auth-loading">

          <div className="admin-auth-loader" />

          <span>
            AUTHORIZING ACCESS
          </span>

        </div>

      </main>

    );

  }


  /* =======================================================
     UNAUTHORIZED
  ======================================================= */

  if (
    status === "unauthorized"
  ) {

    return (

      <Navigate
        to="/admin/login"
        replace
        state={{
          from: location,
          message:
            "Admin approval is required to access the dashboard.",
        }}
      />

    );

  }


  /* =======================================================
     ADMIN
  ======================================================= */

  return children;

}


export default ProtectedRoute;