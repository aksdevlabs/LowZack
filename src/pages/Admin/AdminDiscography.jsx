import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";

import {
  auth,
  db,
} from "../../firebase";

import {
  onAuthStateChanged,
} from "firebase/auth";

import "./AdminDiscography.css";
import "../../components/AdminNavbar.css";
import AdminNavbar from "../../components/AdminNavbar";


/* =========================================================
   LOWZACK
   ADMIN DISCOGRAPHY
   FIRESTORE COLLECTION: Discography

   SOURCE OF TRUTH:
   Firestore / Discography

   DISCOGRAPHY fields:
   - JudulLagu
   - Artis[]
   - TahunRilis
   - Format
   - Sumber { youtube, spotify }
========================================================= */


/* =========================================================
   FIRESTORE
========================================================= */

const DISCOGRAPHY_COLLECTION = "Discography";


/* =========================================================
   DEFAULT FORM
========================================================= */

const getEmptyForm = () => ({
  title: "",
  artists: "LOWZACK",
  albumName: "",
  year: new Date()
    .getFullYear()
    .toString(),
  format: "single",
  youtubeUrl: "",
  spotifyUrl: "",
});;


/* =========================================================
   NORMALIZE DISCOGRAPHY DATA
========================================================= */

function normalizeWork(work) {
  const artists = Array.isArray(work.Artis)
    ? work.Artis
        .filter(Boolean)
        .map((artist) => String(artist).trim())
        .filter(Boolean)
    : typeof work.Artis === "string"
      ? work.Artis
          .split(",")
          .map((artist) => artist.trim())
          .filter(Boolean)
      : ["LOWZACK"];

  return {
    ...work,

    title:
      work.JudulLagu ||
      "",

    artists:
      artists.length > 0
        ? artists
        : ["LOWZACK"],

    albumName:
      work.Album ||
      "",

    year:
      work.TahunRilis != null
        ? String(work.TahunRilis)
        : "",

    format:
      String(work.Format || "Single").toLowerCase() === "album"
        ? "album"
        : "single",

    youtubeUrl:
      work.Sumber?.youtube ||
      work.Sumber?.YouTube ||
      "",

    spotifyUrl:
      work.Sumber?.spotify ||
      work.Sumber?.Spotify ||
      "",
  };
}


/* =========================================================
   COMPONENT
========================================================= */

export default function AdminDiscography() {

  const navigate = useNavigate();

  /* =======================================================
     AUTH
  ======================================================= */

  const [currentUser, setCurrentUser] =
    useState(null);

  const [authLoading, setAuthLoading] =
    useState(true);


  /* =======================================================
     DATA
  ======================================================= */

  const [works, setWorks] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  /* =======================================================
     FORM
  ======================================================= */

  const [form, setForm] =
    useState(
      getEmptyForm()
    );

  const [editingWork, setEditingWork] =
    useState(null);

  const [showForm, setShowForm] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [formError, setFormError] =
    useState("");


  /* =======================================================
     UI
  ======================================================= */

  const [searchQuery, setSearchQuery] =
    useState("");

  const [yearFilter, setYearFilter] =
    useState("ALL");

  const [mediaFilter, setMediaFilter] =
    useState("ALL");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [deletingId, setDeletingId] =
    useState(null);


  /* =======================================================
     AUTH LISTENER
  ======================================================= */

  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(
        auth,
        (user) => {

          setCurrentUser(user);

          setAuthLoading(false);
        }
      );

    return () => {
      unsubscribe();
    };

  }, []);


  /* =======================================================
     FIRESTORE LISTENER
  ======================================================= */

  useEffect(() => {

    if (!currentUser) {
      return;
    }

    setLoading(true);
    setError("");

    const discographyRef =
      collection(
        db,
        DISCOGRAPHY_COLLECTION
      );

    const unsubscribe =
      onSnapshot(
        discographyRef,

        (snapshot) => {

          const data =
            snapshot.docs
              .map((item) => ({
                id: item.id,
                ...item.data(),
              }))
              .map(
                normalizeWork
              );

          setWorks(data);

          setLoading(false);
        },

        (snapshotError) => {

          console.error(
            "AdminDiscography Firestore error:",
            snapshotError
          );

          setError(
            snapshotError?.message ||
            "Unable to load discography."
          );

          setLoading(false);
        }
      );
    return () => {
      unsubscribe();
    };

  }, [currentUser]);


  /* =======================================================
     SUCCESS MESSAGE
  ======================================================= */

  useEffect(() => {

    if (!successMessage) {
      return;
    }

    const timer =
      setTimeout(() => {
        setSuccessMessage("");
      }, 3500);

    return () => {
      clearTimeout(timer);
    };

  }, [successMessage]);


  /* =======================================================
     ESCAPE
  ======================================================= */

  useEffect(() => {

    const handleKeyDown =
      (event) => {

        if (
          event.key !==
          "Escape"
        ) {
          return;
        }

        if (saving) {
          return;
        }

        closeForm();
      };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };

  }, [saving]);


  /* =======================================================
     BODY LOCK
  ======================================================= */

  useEffect(() => {

    document.body.style.overflow =
      showForm
        ? "hidden"
        : "";

    return () => {
      document.body.style.overflow =
        "";
    };

  }, [showForm]);


  /* =======================================================
     SORTED WORKS
  ======================================================= */

  const sortedWorks =
    useMemo(() => {

      return [...works].sort(
        (a, b) => {

          const yearA =
            Number(a.year) || 0;

          const yearB =
            Number(b.year) || 0;

          if (yearA !== yearB) {
            return yearB - yearA;
          }

          return String(a.title || "").localeCompare(
            String(b.title || "")
          );
        }
      );

    }, [works]);


  /* =======================================================
     YEARS
  ======================================================= */

  const availableYears =
    useMemo(() => {

      return [
        ...new Set(
          works
            .map(
              (work) =>
                String(
                  work.year ||
                  ""
                )
            )
            .filter(Boolean)
        ),
      ].sort(
        (a, b) =>
          Number(b) -
          Number(a)
      );

    }, [works]);


  /* =======================================================
     EXISTING ALBUMS
     Album options are collected from previously saved
     Discography entries.
  ======================================================= */

  const availableAlbums =
    useMemo(() => {

      return [
        ...new Set(
          works
            .filter(
              (work) =>
                work.format === "album" &&
                work.albumName
            )
            .map(
              (work) =>
                String(
                  work.albumName
                ).trim()
            )
            .filter(Boolean)
        ),
      ].sort((a, b) =>
        a.localeCompare(b, "en", {
          sensitivity: "base",
        })
      );

    }, [works]);


  /* =======================================================
     FILTERED
  ======================================================= */

  const filteredWorks =
    useMemo(() => {

      const search =
        searchQuery
          .trim()
          .toLowerCase();

      return sortedWorks.filter(
        (work) => {

          const artistSearchText =
            Array.isArray(
              work.artists
            )
              ? work.artists.join(" ")
              : "";

          const matchesSearch =
            !search ||
            String(
              work.title ||
              ""
            )
              .toLowerCase()
              .includes(search) ||

            artistSearchText
              .toLowerCase()
              .includes(search) ||

            String(
              work.year ||
              ""
            )
              .toLowerCase()
              .includes(search) ||

            String(
              work.format ||
              ""
            )
              .toLowerCase()
              .includes(search);

          const matchesYear =
            yearFilter ===
              "ALL" ||
            String(
              work.year ||
              ""
            ) ===
              String(
                yearFilter
              );

          const matchesMedia =
            mediaFilter ===
              "ALL" ||
            String(
              work.format ||
              ""
            ).toLowerCase() ===
              String(
                mediaFilter
              ).toLowerCase();

          return (
            matchesSearch &&
            matchesYear &&
            matchesMedia
          );
        }
      );

    }, [
      sortedWorks,
      searchQuery,
      yearFilter,
      mediaFilter,
    ]);


  /* =======================================================
     STATISTICS
  ======================================================= */

  const totalReleases =
    works.length;

  const totalSingles =
    works.filter(
      (work) =>
        work.format ===
        "single"
    ).length;

  const totalAlbums =
    works.filter(
      (work) =>
        work.format ===
        "album"
    ).length;

  const totalYoutube =
    works.filter(
      (work) =>
        Boolean(work.youtubeUrl)
    ).length;

  const totalSpotify =
    works.filter(
      (work) =>
        Boolean(work.spotifyUrl)
    ).length;


  /* =======================================================
     FORM CHANGE
  ======================================================= */

  const handleChange =
    (event) => {

      const {
        name,
        value,
        type,
        checked,
      } = event.target;

      setForm(
        (previous) => ({
          ...previous,

          [name]:
            type ===
            "checkbox"
              ? checked
              : value,
        })
      );

      setFormError("");
    };


  /* =======================================================
     OPEN ADD
  ======================================================= */

  const openAddForm =
    () => {

      setEditingWork(null);

      setForm(
        getEmptyForm()
      );

      setFormError("");

      setShowForm(true);
    };


  /* =======================================================
     OPEN EDIT
  ======================================================= */

  const openEditForm =
    (work) => {

      setEditingWork(
        work
      );

      setForm({
        title:
          work.title ||
          "",

        artists:
          Array.isArray(work.artists)
            ? work.artists.join(", ")
            : "LOWZACK",

        albumName:
          work.albumName ||
          "",

        year:
          work.year ||
          new Date()
            .getFullYear()
            .toString(),

        format:
          work.format ||
          "single",

        youtubeUrl:
          work.youtubeUrl ||
          "",

        spotifyUrl:
          work.spotifyUrl ||
          "",
      });

      setFormError("");

      setShowForm(true);
    };


  /* =======================================================
     CLOSE FORM
  ======================================================= */

  const closeForm =
    () => {

      if (saving) {
        return;
      }

      setShowForm(false);

      setEditingWork(
        null
      );

      setForm(
        getEmptyForm()
      );

      setFormError("");
    };


  /* =======================================================
     SAVE
  ======================================================= */

  const handleSubmit =
    async (event) => {

      event.preventDefault();

      if (saving) {
        return;
      }

      setFormError("");
      setSuccessMessage("");

      const title =
        form.title.trim();

      const artists =
        form.artists
          .split(",")
          .map((artist) =>
            artist.trim()
          )
          .filter(Boolean);

      const albumName =
        form.albumName.trim();

      const year =
        form.year.trim();

      const youtubeUrl =
        form.youtubeUrl.trim();

      const spotifyUrl =
        form.spotifyUrl.trim();

      const format =
        form.format === "album"
          ? "Album"
          : "Single";


      /* =====================================================
         VALIDATION
      ===================================================== */

      if (!title) {

        setFormError(
          "Please enter the song title."
        );

        return;
      }


      if (
        artists.length === 0
      ) {

        setFormError(
          "Please enter at least one artist."
        );

        return;
      }


      if (!year) {

        setFormError(
          "Please enter the release year."
        );

        return;
      }


      if (
        !/^\d{4}$/.test(
          year
        )
      ) {

        setFormError(
          "Year must contain 4 digits."
        );

        return;
      }


      if (
        form.format === "album" &&
        !albumName
      ) {

        setFormError(
          "Please select an existing album or create a new album."
        );

        return;
      }


      if (
        !youtubeUrl &&
        !spotifyUrl
      ) {

        setFormError(
          "Please enter at least one YouTube or Spotify source."
        );

        return;
      }


      /* =====================================================
         PAYLOAD
         EXACT FIRESTORE SCHEMA
      ===================================================== */

      const payload = {

        JudulLagu:
          title,

        Artis:
          artists,

        TahunRilis:
          year,

        Format:
          format,

        Album:
          format === "Album"
            ? albumName
            : "",

        Sumber: {
          youtube:
            youtubeUrl,

          spotify:
            spotifyUrl,
        },
      };


      /* =====================================================
         SAVE FIRESTORE
      ===================================================== */

      try {

        setSaving(true);


        if (editingWork) {

          const workRef =
            doc(
              db,
              DISCOGRAPHY_COLLECTION,
              editingWork.id
            );

          await updateDoc(
            workRef,
            payload
          );

          setSuccessMessage(
            "Discography updated successfully."
          );
        }


        else {

          await addDoc(
            collection(
              db,
              DISCOGRAPHY_COLLECTION
            ),
            payload
          );

          setSuccessMessage(
            "Discography added successfully."
          );
        }


        closeForm();

      } catch (saveError) {

        console.error(
          "AdminDiscography save error:",
          saveError
        );

        setFormError(
          saveError?.message ||
          "Failed to save discography."
        );

      } finally {

        setSaving(false);
      }
    };


  /* =======================================================
     DELETE
  ======================================================= */

  const handleDelete =
    async (work) => {

      if (deletingId) {
        return;
      }

      const confirmed =
        window.confirm(
          `Delete "${work.title}"?\n\nThis discography entry will be permanently removed from the "Discography" collection.`
        );

      if (!confirmed) {
        return;
      }


      try {

        setDeletingId(
          work.id
        );

        setError("");

        await deleteDoc(
          doc(
            db,
            DISCOGRAPHY_COLLECTION,
            work.id
          )
        );

        setSuccessMessage(
          "Release deleted successfully."
        );

      } catch (deleteError) {

        console.error(
          "AdminDiscography delete error:",
          deleteError
        );

        setError(
          deleteError?.message ||
          "Failed to delete release."
        );

      } finally {

        setDeletingId(null);
      }
    };


  /* =======================================================
     DUPLICATE RELEASE
  ======================================================= */

  const duplicateRelease =
    (work) => {

      setEditingWork(null);

      setForm({

        title:
          `${work.title} COPY`,

        artists:
          Array.isArray(work.artists)
            ? work.artists.join(", ")
            : "LOWZACK",

        albumName:
          work.albumName ||
          "",

        year:
          work.year ||
          new Date()
            .getFullYear()
            .toString(),

        format:
          work.format ||
          "single",

        youtubeUrl:
          work.youtubeUrl ||
          "",

        spotifyUrl:
          work.spotifyUrl ||
          "",
      });

      setFormError("");

      setShowForm(true);
    };


  /* =======================================================
     AUTH LOADING
  ======================================================= */

  if (authLoading) {

    return (
      <section className="admin-discography">
        <div className="admin-discography-state">
          <span className="admin-discography-loader" />
          <p>CHECKING ADMIN SESSION</p>
        </div>
      </section>
    );
  }


  /* =======================================================
     NO USER
  ======================================================= */

  if (!currentUser) {

    return (
      <section className="admin-discography">
        <div className="admin-discography-state">
          <strong>ADMIN SESSION REQUIRED</strong>

          <p>
            Please login to manage
            Discography.
          </p>
        </div>
      </section>
    );
  }


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="admin-discography-page">

      <AdminNavbar
        activeSection="discography"
        karyaCount={works.length}
        onSectionChange={(section) => {
          if (section === "works") {
            navigate("/admin");
          }
        }}
      />

      <main className="admin-discography-main">


      <header className="admin-topbar">

        <div className="admin-topbar-left">

          <div>

            <div className="admin-page-eyebrow">
              LOWZACK / ADMIN
            </div>

            <h1>
              Discography
            </h1>

          </div>

        </div>

        <div className="admin-topbar-right">

          <span className="admin-live-dot" />

          <span>
            SYSTEM ONLINE
          </span>

        </div>

      </header>



      <section className="admin-discography">


      {/* ===================================================
          PAGE ACTION HEADER
      =================================================== */}

      <div className="admin-discography-header">

        <div className="admin-discography-header-copy">

          <p>
            Manage LOWZACK releases
            displayed on the public
            Discography page.
          </p>

        </div>

        <button
          type="button"
          className="admin-discography-add-button"
          onClick={openAddForm}
        >
          <span>+</span>
          ADD RELEASE
        </button>

      </div>


      {/* ===================================================
          STATS
      =================================================== */}

      <div className="admin-discography-stats">

        <div className="admin-discography-stat">

          <span>
            TOTAL RELEASES
          </span>

          <strong>
            {String(
              totalReleases
            ).padStart(2, "0")}
          </strong>

        </div>


        <div className="admin-discography-stat">

          <span>
            SINGLES
          </span>

          <strong>
            {String(
              totalSingles
            ).padStart(2, "0")}
          </strong>

        </div>


        <div className="admin-discography-stat">

          <span>
            ALBUMS
          </span>

          <strong>
            {String(
              totalAlbums
            ).padStart(2, "0")}
          </strong>

        </div>


        <div className="admin-discography-stat">

          <span>
            YOUTUBE
          </span>

          <strong>
            {String(
              totalYoutube
            ).padStart(2, "0")}
          </strong>

        </div>


        <div className="admin-discography-stat">

          <span>
            SPOTIFY
          </span>

          <strong>
            {String(
              totalSpotify
            ).padStart(2, "0")}
          </strong>

        </div>

      </div>


      {/* ===================================================
          SUCCESS
      =================================================== */}

      {successMessage && (
        <div className="admin-discography-message success">
          <span>✓</span>
          {successMessage}
        </div>
      )}


      {/* ===================================================
          ERROR
      =================================================== */}

      {error && (
        <div className="admin-discography-message error">
          <span>!</span>
          {error}
        </div>
      )}


      {/* ===================================================
          TOOLBAR
      =================================================== */}

      <div className="admin-discography-toolbar">

        <div className="admin-discography-search">

          <span>
            SEARCH
          </span>

          <input
            type="text"
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(
                event.target.value
              )
            }
            placeholder="SEARCH RELEASE..."
          />

        </div>


        <div className="admin-discography-filters">

          <div className="admin-discography-filter">

            <label>
              YEAR
            </label>

            <select
              value={yearFilter}
              onChange={(event) =>
                setYearFilter(
                  event.target.value
                )
              }
            >

              <option value="ALL">
                ALL
              </option>

              {availableYears.map(
                (year) => (
                  <option
                    key={year}
                    value={year}
                  >
                    {year}
                  </option>
                )
              )}

            </select>

          </div>


          <div className="admin-discography-filter">

            <label>
              FORMAT
            </label>

            <select
              value={mediaFilter}
              onChange={(event) =>
                setMediaFilter(
                  event.target.value
                )
              }
            >

              <option value="ALL">
                ALL
              </option>

              <option value="single">
                SINGLE
              </option>

              <option value="album">
                ALBUM
              </option>

            </select>

          </div>

        </div>

      </div>


      {/* ===================================================
          CONTENT
      =================================================== */}

      <div className="admin-discography-content">


        {/* =================================================
            LOADING
        ================================================= */}

        {loading && (
          <div className="admin-discography-state">

            <span className="admin-discography-loader" />

            <strong>
              LOADING DISCOGRAPHY
            </strong>

            <p>
              Reading releases from
              Firestore.
            </p>

          </div>
        )}


        {/* =================================================
            EMPTY
        ================================================= */}

        {!loading &&
          filteredWorks.length ===
            0 && (
            <div className="admin-discography-state">

              <div className="admin-discography-empty-number">
                00
              </div>

              <strong>
                NO RELEASES FOUND
              </strong>

              <p>
                {works.length === 0
                  ? "Add your first LOWZACK discography entry."
                  : "Try changing your search or filters."}
              </p>

              {works.length === 0 && (
                <button
                  type="button"
                  onClick={openAddForm}
                  className="admin-discography-empty-button"
                >
                  + ADD FIRST RELEASE
                </button>
              )}

            </div>
          )}


        {/* =================================================
            TABLE
        ================================================= */}

        {!loading &&
          filteredWorks.length >
            0 && (

            <div className="admin-discography-table">

              <div className="admin-discography-table-head">

                <span>
                  ORDER
                </span>

                <span>
                  RELEASE
                </span>

                <span>
                  YEAR
                </span>

                <span>
                  FORMAT
                </span>

                <span>
                  ARTIST
                </span>

                <span>
                  SOURCE
                </span>

                <span>
                  ACTION
                </span>

              </div>


              <div className="admin-discography-table-body">

                {filteredWorks.map(
                  (
                    work,
                    index
                  ) => {

                    return (
                      <article
                        key={work.id}
                        className="admin-discography-row"
                      >


                        {/* ORDER */}

                        <div className="admin-discography-order">

                          <span>
                            {String(
                              index + 1
                            ).padStart(
                              2,
                              "0"
                            )}
                          </span>

                        </div>


                        {/* RELEASE */}

                        <div className="admin-discography-release">

                          <div className="admin-discography-thumbnail">

                            <div className="admin-discography-thumbnail-placeholder">
                              LOWZACK
                            </div>

                            <div className="admin-discography-thumbnail-overlay">
                              {work.format ===
                              "album"
                                ? "ALBUM"
                                : "SINGLE"}
                            </div>

                          </div>


                          <div className="admin-discography-release-info">

                            <h2>
                              {work.title}
                            </h2>

                            <div className="admin-discography-release-meta">

                              <span className="artist">
                                {Array.isArray(
                                  work.artists
                                )
                                  ? work.artists.join(
                                      " / "
                                    )
                                  : "LOWZACK"}
                              </span>

                            </div>

                          </div>

                        </div>


                        {/* YEAR */}

                        <div className="admin-discography-year">
                          {work.year ||
                            "—"}
                        </div>


                        {/* FORMAT */}

                        <div className="admin-discography-media">

                          <span
                            className={
                              work.format ===
                              "album"
                                ? "video"
                                : "audio"
                            }
                          >
                            {work.format ===
                            "album"
                              ? "ALBUM"
                              : "SINGLE"}
                          </span>

                        </div>


                        {/* ARTIST */}

                        <div className="admin-discography-category">

                          <span>
                            {Array.isArray(
                              work.artists
                            )
                              ? work.artists.join(
                                  " / "
                                )
                              : "LOWZACK"}
                          </span>

                        </div>


                        {/* SOURCE */}

                        <div className="admin-discography-date">

                          <div
                            style={{
                              display:
                                "flex",
                              flexDirection:
                                "column",
                              gap: "5px",
                            }}
                          >
                            {work.youtubeUrl && (
                              <a
                                href={
                                  work.youtubeUrl
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color:
                                    "inherit",
                                  textDecoration:
                                    "none",
                                }}
                              >
                                YOUTUBE ↗
                              </a>
                            )}

                            {work.spotifyUrl && (
                              <a
                                href={
                                  work.spotifyUrl
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color:
                                    "inherit",
                                  textDecoration:
                                    "none",
                                }}
                              >
                                SPOTIFY ↗
                              </a>
                            )}

                            {!work.youtubeUrl &&
                              !work.spotifyUrl && (
                                <span>
                                  —
                                </span>
                              )}
                          </div>

                        </div>


                        {/* ACTION */}

                        <div className="admin-discography-actions">

                          {work.youtubeUrl && (
                            <a
                              href={work.youtubeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="admin-discography-action-button view"
                              title="Open YouTube"
                            >
                              YT ↗
                            </a>
                          )}

                          {work.spotifyUrl && (
                            <a
                              href={work.spotifyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="admin-discography-action-button view"
                              title="Open Spotify"
                            >
                              SP ↗
                            </a>
                          )}


                          <button
                            type="button"
                            className="admin-discography-action-button edit"
                            onClick={() =>
                              openEditForm(
                                work
                              )
                            }
                            title="Edit release"
                          >
                            EDIT
                          </button>


                          <button
                            type="button"
                            className="admin-discography-action-button duplicate"
                            onClick={() =>
                              duplicateRelease(
                                work
                              )
                            }
                            title="Duplicate release"
                          >
                            DUP
                          </button>


                          <button
                            type="button"
                            className="admin-discography-action-button delete"
                            onClick={() =>
                              handleDelete(
                                work
                              )
                            }
                            disabled={
                              deletingId ===
                              work.id
                            }
                            title="Delete release"
                          >
                            {deletingId ===
                            work.id
                              ? "..."
                              : "DEL"}
                          </button>

                        </div>

                      </article>
                    );
                  }
                )}

              </div>

            </div>
          )}

      </div>


      {/* ===================================================
          FORM MODAL
      =================================================== */}

      {showForm && (
        <div
          className="admin-discography-modal"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {
              closeForm();
            }

          }}
        >

          <div className="admin-discography-modal-panel">


            {/* =============================================
                MODAL HEADER
            ============================================= */}

            <div className="admin-discography-modal-header">

              <div>

                <span>
                  LOWZACK / DISCOGRAPHY
                </span>

                <h2>
                  {editingWork
                    ? "EDIT RELEASE"
                    : "ADD RELEASE"}
                </h2>

              </div>


              <button
                type="button"
                onClick={
                  closeForm
                }
                disabled={
                  saving
                }
                className="admin-discography-close"
              >
                ×
              </button>

            </div>


            {/* =============================================
                FORM ERROR
            ============================================= */}

            {formError && (
              <div className="admin-discography-form-error">
                <span>!</span>
                {formError}
              </div>
            )}


            {/* =============================================
                FORM
            ============================================= */}

            <form
              onSubmit={
                handleSubmit
              }
              className="admin-discography-form"
            >


              {/* JUDUL LAGU */}

              <div className="admin-discography-field full">

                <label>
                  JUDUL LAGU
                </label>

                <input
                  type="text"
                  name="title"
                  value={
                    form.title
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. STILL YOUNG"
                  autoComplete="off"
                />

              </div>


              {/* ARTIS */}

              <div className="admin-discography-field full">

                <label>
                  ARTIS
                </label>

                <input
                  type="text"
                  name="artists"
                  value={
                    form.artists
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="LOWZACK, BAYU RIZKI, RYGA"
                />

                <small>
                  Gunakan koma untuk banyak artis. Contoh:
                  LOWZACK, BAYU RIZKI, RYGA
                </small>

              </div>


              {/* TAHUN RILIS */}

              <div className="admin-discography-field">

                <label>
                  TAHUN RILIS
                </label>

                <input
                  type="text"
                  name="year"
                  value={
                    form.year
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="2026"
                  inputMode="numeric"
                  maxLength={4}
                />

              </div>


              {/* FORMAT */}

              <div className="admin-discography-field">

                <label>
                  FORMAT
                </label>

                <select
                  name="format"
                  value={
                    form.format
                  }
                  onChange={
                    handleChange
                  }
                >

                  <option value="single">
                    SINGLE
                  </option>

                  <option value="album">
                    ALBUM
                  </option>

                </select>

              </div>


              {/* ALBUM */}

              {form.format === "album" && (
                <div className="admin-discography-field full">

                  <label>
                    ALBUM
                  </label>

                  <select
                    value={
                      form.albumName === "__NEW_ALBUM__"
                        ? "__NEW_ALBUM__"
                        : availableAlbums.includes(form.albumName)
                          ? form.albumName
                          : form.albumName
                            ? "__NEW_ALBUM__"
                            : ""
                    }
                    onChange={(event) => {
                      const value = event.target.value;

                      setForm((previous) => ({
                        ...previous,
                        albumName:
                          value === "__NEW_ALBUM__"
                            ? "__NEW_ALBUM__"
                            : value,
                      }));

                      setFormError("");
                    }}
                  >
                    <option value="">
                      SELECT ALBUM
                    </option>

                    {availableAlbums.map((album) => (
                      <option
                        key={album}
                        value={album}
                      >
                        {album}
                      </option>
                    ))}

                    <option value="__NEW_ALBUM__">
                      + CREATE NEW ALBUM
                    </option>
                  </select>

                  {(form.albumName === "__NEW_ALBUM__" ||
                    (form.albumName &&
                      !availableAlbums.includes(form.albumName))) && (
                    <input
                      type="text"
                      value={
                        form.albumName === "__NEW_ALBUM__"
                          ? ""
                          : form.albumName
                      }
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          albumName: event.target.value,
                        }))
                      }
                      placeholder="Enter new album name"
                      autoComplete="off"
                      style={{
                        marginTop: "10px",
                      }}
                    />
                  )}

                  <small>
                    Pilih album yang sudah ada, atau pilih CREATE NEW ALBUM untuk membuat album baru.
                  </small>

                </div>
              )}


              {/* YOUTUBE */}

              <div className="admin-discography-field full">

                <label>
                  YOUTUBE
                </label>

                <input
                  type="url"
                  name="youtubeUrl"
                  value={
                    form.youtubeUrl
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="https://www.youtube.com/watch?v=..."
                />

                <small>
                  Optional. Bisa dikosongkan jika hanya memiliki Spotify.
                </small>

              </div>


              {/* SPOTIFY */}

              <div className="admin-discography-field full">

                <label>
                  SPOTIFY
                </label>

                <input
                  type="url"
                  name="spotifyUrl"
                  value={
                    form.spotifyUrl
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="https://open.spotify.com/track/..."
                />

                <small>
                  Optional. Bisa dikosongkan jika hanya memiliki YouTube.
                </small>

              </div>


              {/* SOURCE PREVIEW */}

              {(form.youtubeUrl ||
                form.spotifyUrl) && (
                <div className="admin-discography-youtube-preview">

                  <div className="admin-discography-youtube-preview-head">

                    <span>
                      SOURCES
                    </span>

                    <strong>
                      {[
                        form.youtubeUrl &&
                          "YOUTUBE",
                        form.spotifyUrl &&
                          "SPOTIFY",
                      ]
                        .filter(Boolean)
                        .join(" + ")}
                    </strong>

                  </div>

                  <div
                    style={{
                      display:
                        "flex",
                      flexDirection:
                        "column",
                      gap: "8px",
                      padding:
                        "14px 0 0",
                      wordBreak:
                        "break-word",
                    }}
                  >
                    {form.youtubeUrl && (
                      <span>
                        {form.youtubeUrl}
                      </span>
                    )}

                    {form.spotifyUrl && (
                      <span>
                        {form.spotifyUrl}
                      </span>
                    )}
                  </div>

                </div>
              )}


              {/* =========================================
                  FORM ACTIONS
              ========================================= */}

              <div className="admin-discography-form-actions">

                <button
                  type="button"
                  onClick={
                    closeForm
                  }
                  disabled={
                    saving
                  }
                  className="admin-discography-cancel"
                >
                  CANCEL
                </button>


                <button
                  type="submit"
                  disabled={
                    saving
                  }
                  className="admin-discography-save"
                >

                  {saving
                    ? "SAVING..."
                    : editingWork
                      ? "UPDATE RELEASE"
                      : "ADD RELEASE"}

                </button>

              </div>

            </form>

          </div>

        </div>
      )}

        </section>
      </main>
    </div>
  );
}