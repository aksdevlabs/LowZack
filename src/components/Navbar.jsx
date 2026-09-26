import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Link,
  useLocation,
} from "react-router-dom";

import {
  SiYoutube,
  SiSpotify,
  SiSoundcloud,
  SiTiktok,
  SiInstagram,
} from "react-icons/si";

import "./Navbar.css";
import lowzackBiography from "../assets/lowzack-biography.jpeg";


/* =========================================================
   LOWZACK
   NAVBAR
========================================================= */


/* =========================================================
   SOCIAL LINKS
========================================================= */

const socialLinks = [
  {
    label: "YOUTUBE",
    url: "https://www.youtube.com/@LowZack14",
    icon: SiYoutube,
  },

  {
    label: "SPOTIFY",
    url: "https://open.spotify.com/intl-id/artist/0UBJuKa2JLp9dhyvKDuAFx?si=SrUQAm1PQhKBgFH5uamTYA",
    icon: SiSpotify,
  },

  {
    label: "SOUNDCLOUD",
    url: "https://soundcloud.com/lowzack-music",
    icon: SiSoundcloud,
  },

  {
    label: "TIKTOK",
    url: "https://www.tiktok.com/@lowzack14",
    icon: SiTiktok,
  },

  {
    label: "INSTAGRAM",
    url: "https://www.instagram.com/lowzack14",
    icon: SiInstagram,
  },
];


/* =========================================================
   NAVIGATION
========================================================= */

const navigation = [
  {
    label: "HOME",
    path: "/",
  },

  {
    label: "DISCOGRAPHY",
    path: "/discography",
  },

  {
    label: "RELEASES",
    path: "/releases",
  },

  {
    label: "BIOGRAPHY",
    path: "/biography",
  },
];


/* =========================================================
   NAVBAR
========================================================= */

function Navbar() {

  const [
    menuOpen,
    setMenuOpen,
  ] = useState(false);

  const menuToggleRef = useRef(null);


  const location =
    useLocation();


  /* =======================================================
     BODY SCROLL LOCK
  ======================================================= */

  useEffect(() => {

    document.body.style.overflow =
      menuOpen
        ? "hidden"
        : "";


    return () => {

      document.body.style.overflow =
        "";

    };

  }, [
    menuOpen,
  ]);


  /* =======================================================
     CLOSE MENU — FOCUS SAFE
  ======================================================= */

  const closeMenu = () => {

    setMenuOpen(false);

    window.requestAnimationFrame(() => {
      menuToggleRef.current?.focus();
    });

  };


  /* =======================================================
     ESCAPE KEY
  ======================================================= */

  useEffect(() => {

    const handleKeyDown = (event) => {

      if (event.key === "Escape" && menuOpen) {
        closeMenu();
      }

    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };

  }, [menuOpen]);


  /* =======================================================
     ACTIVE ROUTE
  ======================================================= */

  const isActive = (
    path
  ) => {

    /*
     * HOME harus exact.
    */

    if (
      path === "/"
    ) {

      return (
        location.pathname === "/"
      );

    }


    /*
     * Halaman lain menggunakan startsWith
     * agar sub-route tetap dianggap aktif.
    */

    return location.pathname.startsWith(
      path
    );

  };


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>

      {/* ===================================================
          DESKTOP NAVBAR
      =================================================== */}

      <header className="lowzack-navbar">

        <div className="nav-inner">


          {/* =================================================
              LOGO
          ================================================= */}

          <Link
            to="/"
            className="nav-logo"
            onClick={
              closeMenu
            }
            aria-label="Lowzack Home"
          >
            <img
              src={lowzackBiography}
              alt="Lowzack"
              className="nav-logo-image"
            />
            <span className="nav-logo-text">LOWZACK</span>
          </Link>


          {/* =================================================
              DESKTOP NAVIGATION
          ================================================= */}

          <nav
            className="desktop-nav"
            aria-label="Main navigation"
          >

            {navigation.map(
              (item) => (

                <Link
                  key={
                    item.path
                  }
                  to={
                    item.path
                  }
                  className={`nav-link ${isActive(
                    item.path
                  )
                    ? "active"
                    : ""
                    }`}
                >

                  {
                    item.label
                  }

                </Link>

              )
            )}


            {/* =============================================
                CONTACT
            ============================================= */}

            <a
              href="mailto:contact@lowzack.com"
              className="nav-link"
            >
              CONTACT
            </a>

          </nav>


          {/* =================================================
              DESKTOP SOCIAL LINKS
          ================================================= */}

          <div
            className="nav-socials"
            aria-label="Social media"
          >

            {socialLinks.map(
              (social) => {

                const Icon =
                  social.icon;

                return (
                  <a
                    key={
                      social.label
                    }
                    href={
                      social.url
                    }
                    className="nav-social"
                    target="_blank"
                    rel="noreferrer"
                    aria-label={
                      social.label
                    }
                    title={
                      social.label
                    }
                  >

                    <Icon
                      aria-hidden="true"
                    />

                  </a>
                );

              }
            )}

          </div>


          {/* =================================================
              MOBILE MENU BUTTON
          ================================================= */}

          <button
            ref={menuToggleRef}
            type="button"
            className={`menu-toggle ${menuOpen
              ? "active"
              : ""
              }`}
            onClick={() =>
              setMenuOpen(
                (
                  previous
                ) =>
                  !previous
              )
            }
            aria-label={
              menuOpen
                ? "Close navigation"
                : "Open navigation"
            }
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation-panel"
          >

            <span />
            <span />
            <span />

          </button>

        </div>

      </header>


      {/* ===================================================
          MOBILE MENU
          The fixed Navbar remains the only top header.
          The menu begins below it — no duplicated header.
      =================================================== */}

      <div
        id="mobile-navigation-panel"
        className={`mobile-menu ${menuOpen
          ? "mobile-menu-open"
          : ""
          }`}
        aria-hidden={!menuOpen}
        inert={!menuOpen}
      >

        <div className="mobile-menu-inner">

          <nav
            className="mobile-navigation"
            aria-label="Mobile navigation"
          >

            {navigation.map((item) => (

              <Link
                key={item.path}
                to={item.path}
                onClick={closeMenu}
                className={
                  isActive(item.path)
                    ? "active"
                    : ""
                }
              >

                <span>{item.label}</span>

                <span className="mobile-nav-arrow">
                  ↗
                </span>

              </Link>

            ))}

            <a
              href="mailto:contact@lowzack.com"
              onClick={closeMenu}
            >

              <span>CONTACT</span>

              <span className="mobile-nav-arrow">
                ↗
              </span>

            </a>

          </nav>

          <div className="mobile-menu-bottom">

            <span className="mobile-social-label">
              FOLLOW LOWZACK
            </span>

            <div
              className="mobile-menu-socials"
              aria-label="Social media"
            >

              {socialLinks.map((social) => {

                const Icon = social.icon;

                return (
                  <a
                    key={social.label}
                    href={social.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={closeMenu}
                    aria-label={social.label}
                    title={social.label}
                  >

                    <Icon aria-hidden="true" />

                    <span>{social.label}</span>

                  </a>
                );

              })}

            </div>

            <div className="footnav-powered">
              POWERED BY <span>AKSDEVLABS</span>
            </div>

            <div className="mobile-menu-copy">
              © {new Date().getFullYear()} LOWZACK
            </div>

          </div>

        </div>

      </div>

    </>
  );

}


/* =========================================================
   EXPORT
========================================================= */

export default Navbar;