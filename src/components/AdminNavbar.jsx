import React, {
  useEffect,
  useState,
} from "react";

import {
  NavLink,
} from "react-router-dom";

import {
  signOut,
} from "firebase/auth";

import {
  auth,
} from "../firebase";

import "./AdminNavbar.css";


/* =========================================================
   LOWZACK
   ADMIN NAVBAR
   SIDEBAR NAVIGATION
========================================================= */

const adminNavigation = [
  {
    label: "DASHBOARD",
    type: "dashboard",
  },
  {
    label: "RELEASE",
    type: "karya",
  },
  {
    label: "DISCOGRAPHY",
    type: "discography",
  },
  {
    label: "PRODUCTS",
    type: "soon",
  },
  {
    label: "ORDERS",
    type: "soon",
  },
];


/* =========================================================
   ADMIN NAVBAR
========================================================= */

function AdminNavbar({
  activeSection = "dashboard",
  onSectionChange,
  karyaCount = 0,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);


  /* =======================================================
     BODY SCROLL LOCK
  ======================================================= */

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);


  /* =======================================================
     ESCAPE KEY
  ======================================================= */

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);


  /* =======================================================
     CLOSE MENU
  ======================================================= */

  const closeMenu = () => {
    setMenuOpen(false);
  };


  /* =======================================================
     SECTION CHANGE
  ======================================================= */

  const handleSectionChange = (section) => {
    if (typeof onSectionChange === "function") {
      onSectionChange(section);
    }

    closeMenu();
  };


  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }

    try {
      setLoggingOut(true);
      closeMenu();

      await signOut(auth);
    } catch (error) {
      console.error("Admin logout failed:", error);
      setLoggingOut(false);
    }
  };


  /* =======================================================
     ACTIVE STATE
  ======================================================= */

  const isActive = (type) => {
    if (type === "dashboard") {
      return activeSection === "dashboard";
    }

    if (type === "karya") {
      return activeSection === "works";
    }

    if (type === "discography") {
      return activeSection === "discography";
    }

    return false;
  };


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      {/* =====================================================
          DESKTOP SIDEBAR
      ===================================================== */}

      <aside
        className={`admin-sidebar ${
          menuOpen ? "admin-sidebar-open" : ""
        }`}
      >

        {/* =================================================
            BRAND
        ================================================= */}

        <div className="admin-sidebar-top">

          <NavLink
            to="/admin"
            end
            className="admin-brand"
            onClick={() =>
              handleSectionChange("dashboard")
            }
          >
            <span className="admin-brand-name">
              LOWZACK
            </span>

            <span className="admin-brand-label">
              ADMIN SYSTEM
            </span>
          </NavLink>

          <button
            type="button"
            className="admin-mobile-close"
            onClick={closeMenu}
            aria-label="Close admin navigation"
          >
            ×
          </button>

        </div>


        {/* =================================================
            NAVIGATION
        ================================================= */}

        <nav
          className="admin-navigation"
          aria-label="Admin navigation"
        >

          {adminNavigation.map((item) => {
            const active = isActive(item.type);


            /* =================================================
               DASHBOARD
            ================================================= */

            if (item.type === "dashboard") {
              return (
                <NavLink
                  key={item.label}
                  to="/admin"
                  end
                  className={`admin-nav-item ${
                    active ? "active" : ""
                  }`}
                  onClick={closeMenu}
                >
                  <span className="admin-nav-icon">
                    ◇
                  </span>

                  <span>
                    {item.label}
                  </span>
                </NavLink>
              );
            }


            /* =================================================
               KARYA
            ================================================= */

            if (item.type === "karya") {
              return (
                <button
                  key={item.label}
                  type="button"
                  className={`admin-nav-item ${
                    active ? "active" : ""
                  }`}
                  onClick={() =>
                    handleSectionChange("works")
                  }
                >
                  <span className="admin-nav-icon">
                    ▸
                  </span>

                  <span>
                    {item.label}
                  </span>

                  <span className="admin-nav-count">
                    {Number(karyaCount) || 0}
                  </span>
                </button>
              );
            }


            /* =================================================
               DISCOGRAPHY
            ================================================= */

            if (item.type === "discography") {
              return (
                <NavLink
                  key={item.label}
                  to="/admin/discography"
                  className={({ isActive: routeActive }) =>
                    `admin-nav-item ${
                      routeActive || active
                        ? "active"
                        : ""
                    }`
                  }
                  onClick={closeMenu}
                >
                  <span className="admin-nav-icon">
                    ▫
                  </span>

                  <span>
                    {item.label}
                  </span>
                </NavLink>
              );
            }


            /* =================================================
               COMING SOON
            ================================================= */

            return (
              <button
                key={item.label}
                type="button"
                className="admin-nav-item disabled"
                disabled
              >
                <span className="admin-nav-icon">
                  {item.label === "DISCOGRAPHY"
                    ? "▫"
                    : item.label === "PRODUCTS"
                      ? "+"
                      : "#"}
                </span>

                <span>
                  {item.label}
                </span>

                <span className="admin-coming">
                  SOON
                </span>
              </button>
            );
          })}

        </nav>


        {/* =================================================
            SIDEBAR BOTTOM
        ================================================= */}

        <div className="admin-sidebar-bottom">

          <div className="admin-account">

            <div className="admin-avatar">
              T
            </div>

            <div className="admin-account-info">

              <strong>
                ADMIN
              </strong>

              <span>
                AUTHENTICATED SESSION
              </span>

            </div>

          </div>


          <button
            type="button"
            className="admin-logout"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <span>
              ↪
            </span>

            <span>
              {loggingOut
                ? "LOGGING OUT..."
                : "LOG OUT"}
            </span>
          </button>

        </div>

      </aside>


      {/* =====================================================
          MOBILE TOGGLE
      ===================================================== */}

      <button
        type="button"
        className="admin-menu-button"
        onClick={() =>
          setMenuOpen((value) => !value)
        }
        aria-label={
          menuOpen
            ? "Close admin navigation"
            : "Open admin navigation"
        }
        aria-expanded={menuOpen}
      >
        <span />
        <span />
        <span />
      </button>


      {/* =====================================================
          MOBILE OVERLAY
      ===================================================== */}

      {menuOpen && (
        <button
          type="button"
          className="admin-mobile-overlay"
          onClick={closeMenu}
          aria-label="Close admin navigation"
        />
      )}
    </>
  );
}


export default AdminNavbar;