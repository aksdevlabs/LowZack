import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

/* =========================================================
   SUPABASE STORAGE
   MUSIC AUDIO FILES
========================================================= */

import { supabase } from "../../supabase";

import {
  onAuthStateChanged,
} from "firebase/auth";

import {
  useNavigate,
} from "react-router-dom";

import {
  auth,
  db,
} from "../../firebase";

import "./AdminPage.css";
import AdminNavbar from "../../components/AdminNavbar";


/* =========================================================
   LOWZACK
   ADMIN PAGE
   KARYA MANAGEMENT
========================================================= */


/* =========================================================
   FIRESTORE
========================================================= */

const WORKS_COLLECTION = "karya";


/* =========================================================
   CATEGORY
========================================================= */

const CATEGORY_OPTIONS = [
  {
    value: "music",
    label: "MUSIC",
  },
  {
    value: "music-video",
    label: "MUSIC VIDEO",
  },
  {
    value: "video-lyric",
    label: "VIDEO LYRIC",
  },
  {
    value: "live-performance",
    label: "LIVE PERFORMANCE",
  },
];


const MUSIC_SUBCATEGORY_OPTIONS = [
  {
    value: "single",
    label: "SINGLE",
  },
  {
    value: "album",
    label: "ALBUM",
  },
];


/* =========================================================
   DEFAULT FORM
========================================================= */

const getEmptyForm = () => ({
  title: "",
  artist: "LOWZACK",

  category: "music",

  subcategory: "single",

  albumName: "",
  albumMode: "new",

  audioUrl: "",
  audioFileName: "",
  audioStoragePath: "",

  youtubeUrl: "",

  year: new Date()
    .getFullYear()
    .toString(),

  description: "",

  featured: false,
});

/* =========================================================
   FORM NORMALIZER
   Prevents uncontrolled -> controlled React warnings
========================================================= */

function normalizeFormValue(value, fallback = "") {
  return value === undefined || value === null
    ? fallback
    : value;
}

function normalizeForm(work = {}) {
  const category =
    normalizeFormValue(
      work.category,
      "music"
    );

  const subcategory =
    normalizeFormValue(
      work.subcategory,
      "single"
    );

  const albumName =
    normalizeFormValue(
      work.albumName
    );

  return {
    title: normalizeFormValue(
      work.title
    ),

    artist: normalizeFormValue(
      work.artist,
      "LOWZACK"
    ),

    category,

    subcategory,

    albumName,

    albumMode:
      subcategory === "album" &&
      albumName
        ? "existing"
        : "new",

    audioUrl: normalizeFormValue(
      work.audioUrl
    ),

    audioFileName:
      normalizeFormValue(
        work.audioFileName
      ),

    audioStoragePath:
      normalizeFormValue(
        work.audioStoragePath
      ),

    youtubeUrl:
      normalizeFormValue(
        work.youtubeUrl
      ),

    year: normalizeFormValue(
      work.year,
      new Date()
        .getFullYear()
        .toString()
    ),

    description:
      normalizeFormValue(
        work.description
      ),

    featured:
      work.featured === true,
  };
}


/* =========================================================
   YOUTUBE HELPERS
========================================================= */

function extractYoutubeId(value) {
  if (!value) return "";

  const input = value.trim();

  /*
    SUPPORT:

    https://www.youtube.com/watch?v=VIDEO_ID
    https://youtu.be/VIDEO_ID
    https://www.youtube.com/shorts/VIDEO_ID
    https://www.youtube.com/embed/VIDEO_ID
    https://www.youtube.com/live/VIDEO_ID
  */

  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\s]+)/i,
    /(?:youtu\.be\/)([^?&\s]+)/i,
    /(?:youtube\.com\/shorts\/)([^?&\s]+)/i,
    /(?:youtube\.com\/embed\/)([^?&\s]+)/i,
    /(?:youtube\.com\/live\/)([^?&\s]+)/i,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);

    if (match?.[1]) {
      return match[1];
    }
  }

  /*
    Kalau admin memasukkan
    YouTube video ID langsung.
  */

  if (
    /^[a-zA-Z0-9_-]{11}$/.test(input)
  ) {
    return input;
  }

  return "";
}


function getYoutubeThumbnail(videoId) {
  if (!videoId) return "";

  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}


function getYoutubeEmbed(videoId) {
  if (!videoId) return "";

  return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
}


function getYoutubeWatchUrl(videoId) {
  if (!videoId) return "#";

  return `https://www.youtube.com/watch?v=${videoId}`;
}

/* =========================================================
   LABEL HELPERS
========================================================= */

function getCategoryLabel(category) {
  const item = CATEGORY_OPTIONS.find(
    (option) =>
      option.value === category
  );

  return item?.label || "KARYA";
}


function getSubcategoryLabel(subcategory) {
  const item =
    MUSIC_SUBCATEGORY_OPTIONS.find(
      (option) =>
        option.value === subcategory
    );

  return item?.label || "";
}


function getDisplayCategory(work) {
  const category = getCategoryLabel(
    work?.category || ""
  );

  const subcategory =
    work?.subcategory === "album"
      ? "ALBUM"
      : "SINGLE";

  return `${category} · ${subcategory}`;
}


/* =========================================================
   DATE FORMATTER
========================================================= */

function formatDate(timestamp) {
  if (!timestamp) return "—";

  try {
    const date = timestamp.toDate
      ? timestamp.toDate()
      : new Date(timestamp);

    return new Intl.DateTimeFormat(
      "en-US",
      {
        year: "numeric",
        month: "short",
        day: "2-digit",
      }
    ).format(date);
  } catch {
    return "—";
  }
}


/* =========================================================
   ADMIN PAGE
========================================================= */

function AdminPage() {

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

  const [loadingWorks, setLoadingWorks] =
    useState(true);

  const [firebaseError, setFirebaseError] =
    useState("");


  /* =======================================================
     UI
  ======================================================= */

  const [activeSection, setActiveSection] =
    useState("dashboard");

  const [showForm, setShowForm] =
    useState(false);

  const [showPreview, setShowPreview] =
    useState(false);

  const [editingWork, setEditingWork] =
    useState(null);

  const [previewWork, setPreviewWork] =
    useState(null);

  const [saving, setSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState(null);


  /* =======================================================
     FORM
  ======================================================= */

  const [form, setForm] =
    useState(getEmptyForm());

  const [formError, setFormError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [audioFile, setAudioFile] =
    useState(null);

  const [audioUploading, setAudioUploading] =
    useState(false);


  /* =======================================================
     SEARCH / FILTER
  ======================================================= */

  const [searchQuery, setSearchQuery] =
    useState("");

  const [categoryFilter, setCategoryFilter] =
    useState("ALL");


  /* =======================================================
     AUTH LISTENER
  ======================================================= */

  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(
        auth,
        (user) => {

          if (!user) {

            setCurrentUser(null);

            setAuthLoading(false);

            navigate(
              "/admin/login",
              {
                replace: true,
              }
            );

            return;
          }

          setCurrentUser(user);

          setAuthLoading(false);
        }
      );

    return () => unsubscribe();

  }, [navigate]);


  /* =======================================================
     FIRESTORE REALTIME LISTENER
  ======================================================= */

  useEffect(() => {

    if (!currentUser) {
      return;
    }

    setLoadingWorks(true);

    setFirebaseError("");

    const worksRef =
      collection(
        db,
        WORKS_COLLECTION
      );

    const worksQuery =
      query(
        worksRef,
        orderBy(
          "createdAt",
          "desc"
        )
      );

    const unsubscribe =
      onSnapshot(
        worksQuery,

        (snapshot) => {

          const data =
            snapshot.docs.map(
              (item) => ({
                id: item.id,
                ...item.data(),
              })
            );

          setWorks(data);

          setLoadingWorks(false);
        },

        (error) => {

          console.error(
            "Firestore karya error:",
            error
          );

          setFirebaseError(
            error?.message ||
            "Unable to load Karya from Firebase."
          );

          setLoadingWorks(false);
        }
      );

    return () => unsubscribe();

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

    return () => clearTimeout(timer);

  }, [successMessage]);


  /* =======================================================
     ESCAPE KEY
  ======================================================= */

  useEffect(() => {

    const handleKeyDown = (event) => {

      if (event.key !== "Escape") {
        return;
      }

      setShowPreview(false);

      setShowForm(false);

      setPreviewWork(null);

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

  }, []);


  /* =======================================================
     BODY SCROLL LOCK
  ======================================================= */

  useEffect(() => {

    const locked =
      showForm ||
      showPreview;

    document.body.style.overflow =
      locked
        ? "hidden"
        : "";

    return () => {
      document.body.style.overflow = "";
    };

  }, [
    showForm,
    showPreview,
  ]);


  /* =======================================================
     DERIVED DATA
  ======================================================= */

  const totalWorks =
    works.length;


  const musicWorks =
    works.filter(
      (work) =>
        work.category === "music"
    ).length;


  const musicVideos =
    works.filter(
      (work) =>
        work.category ===
        "music-video"
    ).length;


  const lyricVideos =
    works.filter(
      (work) =>
        work.category ===
        "video-lyric"
    ).length;


  const livePerformances =
    works.filter(
      (work) =>
        work.category ===
        "live-performance"
    ).length;


  const featuredWorks =
    works.filter(
      (work) =>
        work.featured === true
    ).length;


  const albumWorks =
    works.filter(
      (work) =>
        work.subcategory === "album"
    );


  const albumNames =
    [
      ...new Set(
        albumWorks
          .map(
            (work) =>
              work.albumName
          )
          .filter(Boolean)
      ),
    ];


  const latestWork =
    works.length
      ? works[0]
      : null;


  /* =======================================================
     FILTERED WORKS
  ======================================================= */

  const filteredWorks =
    useMemo(() => {

      const search =
        searchQuery
          .trim()
          .toLowerCase();

      return works.filter(
        (work) => {

          const matchesSearch =
            !search ||
            String(
              work.title || ""
            )
              .toLowerCase()
              .includes(search) ||

            String(
              work.artist || ""
            )
              .toLowerCase()
              .includes(search) ||

            String(
              work.category || ""
            )
              .toLowerCase()
              .includes(search) ||

            String(
              work.subcategory || ""
            )
              .toLowerCase()
              .includes(search) ||

            String(
              work.albumName || ""
            )
              .toLowerCase()
              .includes(search) ||

            String(
              work.year || ""
            )
              .toLowerCase()
              .includes(search);


          const matchesCategory =
            categoryFilter === "ALL" ||
            work.category ===
            categoryFilter;


          return (
            matchesSearch &&
            matchesCategory
          );
        }
      );

    }, [
      works,
      searchQuery,
      categoryFilter,
    ]);


  /* =======================================================
     FORM HANDLER
  ======================================================= */

  const handleFormChange = (
    event
  ) => {

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
          type === "checkbox"
            ? checked
            : value,
      })
    );

    setFormError("");
  };


  /* =======================================================
     CATEGORY CHANGE
  ======================================================= */

  const handleCategoryChange =
    (category) => {

      setForm(
        (previous) => ({
          ...previous,
          category,

          subcategory:
            previous.subcategory ||
            "single",

          youtubeUrl:
            normalizeFormValue(
              previous.youtubeUrl
            ),

          albumName:
            previous.subcategory === "album"
              ? normalizeFormValue(
                  previous.albumName
                )
              : "",

          albumMode:
            previous.subcategory === "album"
              ? (
                  previous.albumName
                    ? "existing"
                    : "new"
                )
              : "new",
        })
      );

      setFormError("");
    };


  /* =======================================================
     MUSIC SUBCATEGORY CHANGE
  ======================================================= */

  const handleSubcategoryChange =
    (subcategory) => {

      setForm(
        (previous) => ({
          ...previous,
          subcategory,

          albumName:
            subcategory === "album"
              ? normalizeFormValue(
                  previous.albumName
                )
              : "",

          albumMode:
            subcategory === "album"
              ? (
                  previous.albumName
                    ? "existing"
                    : "new"
                )
              : "new",
        })
      );

      setFormError("");
    };


  /* =======================================================
     OPEN ADD FORM
  ======================================================= */

  const openAddForm = () => {

    setEditingWork(null);

    setForm(
      getEmptyForm()
    );

    setFormError("");
    setAudioFile(null);

    setShowForm(true);


  };


  /* =======================================================
     OPEN EDIT FORM
  ======================================================= */

  const openEditForm =
    (work) => {

      setEditingWork(work);

      setForm(
        normalizeForm(work)
      );

      setFormError("");
      setAudioFile(null);

      setShowForm(true);
    };


  /* =======================================================
     CLOSE FORM
  ======================================================= */

  const closeForm = () => {

    if (saving) {
      return;
    }

    setShowForm(false);

    setEditingWork(null);

    setForm(
      getEmptyForm()
    );

    setFormError("");
    setAudioFile(null);
  };


  /* =======================================================
     AUDIO FILE
  ======================================================= */

  const handleAudioFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "audio/mpeg",
      "audio/wav",
      "audio/x-wav",
      "audio/mp4",
      "audio/x-m4a",
      "audio/aac",
      "audio/flac",
      "audio/ogg",
    ];

    const extension = file.name
      .split(".")
      .pop()
      ?.toLowerCase();

    const allowedExtensions = [
      "mp3",
      "wav",
      "m4a",
      "aac",
      "flac",
      "ogg",
    ];

    if (
      !allowedTypes.includes(file.type) &&
      !allowedExtensions.includes(extension)
    ) {
      setFormError(
        "Invalid audio file. Use MP3, WAV, M4A, AAC, FLAC or OGG."
      );
      return;
    }

    const maxSize = 50 * 1024 * 1024;

    if (file.size > maxSize) {
      setFormError(
        "Audio file is too large. Maximum size is 50 MB."
      );
      return;
    }

    setAudioFile(file);

    setForm((previous) => ({
      ...previous,
      audioFileName: file.name,
    }));

    setFormError("");
  };

  const removeSelectedAudio = () => {
    setAudioFile(null);

    setForm((previous) => ({
      ...previous,
      audioFileName: "",
      audioUrl: "",
      audioStoragePath: "",
    }));

    setFormError("");
  };


  /* =======================================================
     SAVE WORK
  ======================================================= */

  const handleSubmit =
    async (event) => {

      event.preventDefault();

      setFormError("");

      setSuccessMessage("");

      const title =
        form.title.trim();

      const artist =
        form.artist.trim() ||
        "LOWZACK";

      const youtubeUrl =
        form.youtubeUrl.trim();

      const year =
        form.year.trim();

      const description =
        form.description.trim();

      const albumName =
        form.albumName.trim();

      const videoId =
        extractYoutubeId(
          youtubeUrl
        );


      /* -------------------------------------------------------
         VALIDATION
      ------------------------------------------------------- */

      if (!title) {
        setFormError(
          "Please enter the work title."
        );
        return;
      }

      if (!year) {
        setFormError(
          "Please enter the release year."
        );
        return;
      }

      if (!form.subcategory) {
        setFormError(
          "Please select Single or Album."
        );
        return;
      }

      if (
        form.subcategory === "album" &&
        !albumName
      ) {
        setFormError(
          form.albumMode === "existing"
            ? "Please select an existing album."
            : "Please enter the new album name."
        );
        return;
      }

      /* -------------------------------------------------------
         BOTH SOURCES ARE REQUIRED

         Every release now stores:
         1. YouTube URL for VIDEO
         2. Supabase audio URL for AUDIO

         There is no longer an AUDIO / VIDEO choice.
      ------------------------------------------------------- */

      if (!youtubeUrl) {
        setFormError(
          "Please enter the YouTube URL."
        );
        return;
      }

      if (!videoId) {
        setFormError(
          "Invalid YouTube URL. Please use a valid YouTube video link."
        );
        return;
      }

      if (!audioFile && !form.audioUrl) {
        setFormError(
          "Please upload an audio file."
        );
        return;
      }

      /* -------------------------------------------------------
         AUDIO UPLOAD
      ------------------------------------------------------- */

      let finalAudioUrl = form.audioUrl || "";
      let finalAudioFileName = form.audioFileName || "";
      let finalAudioStoragePath =
        form.audioStoragePath || "";

      if (audioFile) {
        setAudioUploading(true);

        try {
          const safeFileName = audioFile.name
            .replace(/[^a-zA-Z0-9._-]/g, "-");

          const filePath =
            `karya-audio/${Date.now()}-${safeFileName}`;

          const {
            error: uploadError,
          } = await supabase.storage
            .from("audio")
            .upload(
              filePath,
              audioFile,
              {
                cacheControl: "3600",
                contentType:
                  audioFile.type || "audio/mpeg",
                upsert: false,
              }
            );

          if (uploadError) {
            throw uploadError;
          }

          const {
            data: publicUrlData,
          } = supabase.storage
            .from("audio")
            .getPublicUrl(
              filePath
            );

          if (!publicUrlData?.publicUrl) {
            throw new Error(
              "Supabase did not return a public audio URL."
            );
          }

          finalAudioUrl =
            publicUrlData.publicUrl;

          finalAudioFileName =
            audioFile.name;

          finalAudioStoragePath =
            filePath;

        } catch (error) {
          console.error(
            "Audio upload error:",
            error
          );

          setFormError(
            error?.message ||
            "Failed to upload audio file."
          );

          setAudioUploading(false);

          return;
        }

        setAudioUploading(false);
      }

      /* -------------------------------------------------------
         PAYLOAD
      ------------------------------------------------------- */

      const thumbnail =
        videoId
          ? getYoutubeThumbnail(
            videoId
          )
          : "";


      const payload = {

        title,

        artist,

        category:
          form.category,

        subcategory:
          form.subcategory,

        albumName:
          form.subcategory === "album"
            ? albumName
            : "",

        /*
         * Kept for backward compatibility with older
         * documents. New releases always contain BOTH
         * audio + video sources.
         */
        mediaType: "both",

        youtubeUrl,

        videoId,

        audioUrl: finalAudioUrl,

        audioFileName:
          finalAudioFileName,

        audioStoragePath:
          finalAudioStoragePath,

        thumbnail:
          thumbnail,

        year,

        description,

        featured:
          Boolean(
            form.featured
          ),

        updatedAt:
          serverTimestamp(),
      };


      try {

        setSaving(true);


        /* -----------------------------------------------------
           EDIT
        ----------------------------------------------------- */

        if (editingWork) {

          const workRef =
            doc(
              db,
              WORKS_COLLECTION,
              editingWork.id
            );

          await updateDoc(
            workRef,
            payload
          );

          setSuccessMessage(
            "Karya updated successfully."
          );
        }


        /* -----------------------------------------------------
           ADD
        ----------------------------------------------------- */

        else {

          await addDoc(
            collection(
              db,
              WORKS_COLLECTION
            ),
            {
              ...payload,

              createdAt:
                serverTimestamp(),
            }
          );

          setSuccessMessage(
            "Karya added successfully."
          );
        }


        closeForm();

      } catch (error) {

        console.error(
          "Save karya error:",
          error
        );

        setFormError(
          error?.message ||
          "Failed to save karya."
        );

      } finally {

        setSaving(false);
      }
    };


  /* =======================================================
     DELETE WORK
  ======================================================= */

  const handleDelete =
    async (work) => {

      const confirmed =
        window.confirm(
          `Delete "${work.title}"?\n\nThis action cannot be undone.`
        );


      if (!confirmed) {
        return;
      }


      try {

        setDeletingId(
          work.id
        );


        await deleteDoc(
          doc(
            db,
            WORKS_COLLECTION,
            work.id
          )
        );


        setSuccessMessage(
          "Karya deleted successfully."
        );

      } catch (error) {

        console.error(
          "Delete karya error:",
          error
        );

        setFirebaseError(
          error?.message ||
          "Failed to delete karya."
        );

      } finally {

        setDeletingId(null);
      }
    };


  /* =======================================================
     OPEN PREVIEW
  ======================================================= */

  const openPreview =
    (work) => {

      const resolvedVideoId =
        normalizeFormValue(
          work.videoId
        ) ||
        extractYoutubeId(
          normalizeFormValue(
            work.youtubeUrl
          )
        );

      const hasYoutubeSource =
        Boolean(resolvedVideoId);

      if (!hasYoutubeSource) {
        return;
      }

      setPreviewWork({
        ...work,
        videoId:
          resolvedVideoId,
      });

      setShowPreview(true);
    };


  /* =======================================================
     NAVIGATION
  ======================================================= */

  const handleSectionChange =
    (section) => {

      setActiveSection(
        section
      );


    };


  /* =======================================================
     AUTH LOADING
  ======================================================= */

  if (authLoading) {

    return (
      <div className="admin-loading-screen">

        <div className="admin-loading-mark">
          L
        </div>

        <div className="admin-loading-text">
          AUTHENTICATING
        </div>

      </div>
    );
  }


  /* =======================================================
     MAIN
  ======================================================= */

  return (

    <div className="lowzack-admin">


      {/* =====================================================
                             ADMIN NAVBAR
          ===================================================== */}

      <AdminNavbar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        karyaCount={works.length}
      />


      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <main className="admin-main">


        {/* ===================================================
            TOPBAR
        =================================================== */}

        <header className="admin-topbar">

          <div className="admin-topbar-left">


            <div>

              <div className="admin-page-eyebrow">
                LOWZACK / ADMIN
              </div>

              <h1>

                {activeSection ===
                  "dashboard"
                  ? "Dashboard"
                  : "Karya"}

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


        {/* ===================================================
            CONTENT
        =================================================== */}

        <div className="admin-content">


          {/* =================================================
              SUCCESS MESSAGE
          ================================================= */}

          {successMessage && (

            <div className="admin-alert admin-alert-success">

              <span>
                ✓
              </span>

              {successMessage}

            </div>

          )}


          {/* =================================================
              FIREBASE ERROR
          ================================================= */}

          {firebaseError && (

            <div className="admin-alert admin-alert-error">

              <span>
                !
              </span>

              {firebaseError}

              <button
                type="button"
                onClick={() =>
                  setFirebaseError("")
                }
              >
                ×
              </button>

            </div>

          )}


          {/* =================================================
              DASHBOARD
          ================================================= */}

          {activeSection ===
            "dashboard" && (

              <section className="admin-dashboard">


                {/* SECTION HEADING */}

                <div className="admin-section-heading">

                  <div>

                    <span>
                      OVERVIEW
                    </span>

                    <h2>
                      Welcome back.
                    </h2>

                    <p>
                      Manage the Lowzack
                      website content
                      from one place.
                    </p>

                  </div>


                  <button
                    type="button"
                    className="admin-primary-button"
                    onClick={
                      openAddForm
                    }
                  >

                    <span>
                      +
                    </span>

                    RELEASE

                  </button>

                </div>


                {/* =============================================
                  STATISTICS
              ============================================= */}

                <div className="admin-stat-grid">


                  <div className="admin-stat-card">

                    <div className="admin-stat-label">
                      TOTAL KARYA
                    </div>

                    <div className="admin-stat-value">
                      {totalWorks}
                    </div>

                    <div className="admin-stat-footer">
                      ALL CONTENT
                    </div>

                  </div>


                  <div className="admin-stat-card">

                    <div className="admin-stat-label">
                      MUSIC
                    </div>

                    <div className="admin-stat-value">
                      {musicWorks}
                    </div>

                    <div className="admin-stat-footer">
                      SINGLE + ALBUM
                    </div>

                  </div>


                  <div className="admin-stat-card">

                    <div className="admin-stat-label">
                      VIDEOS
                    </div>

                    <div className="admin-stat-value">
                      {musicVideos}
                    </div>

                    <div className="admin-stat-footer">
                      MUSIC VIDEO
                    </div>

                  </div>


                  <div className="admin-stat-card">

                    <div className="admin-stat-label">
                      ALBUMS
                    </div>

                    <div className="admin-stat-value">
                      {albumNames.length}
                    </div>

                    <div className="admin-stat-footer">
                      UNIQUE ALBUMS
                    </div>

                  </div>

                </div>


                {/* =============================================
                  SECONDARY STATISTICS
              ============================================= */}

                <div className="admin-stat-grid">


                  <div className="admin-stat-card">

                    <div className="admin-stat-label">
                      VIDEO LYRIC
                    </div>

                    <div className="admin-stat-value">
                      {lyricVideos}
                    </div>

                    <div className="admin-stat-footer">
                      LYRIC CONTENT
                    </div>

                  </div>


                  <div className="admin-stat-card">

                    <div className="admin-stat-label">
                      LIVE
                    </div>

                    <div className="admin-stat-value">
                      {livePerformances}
                    </div>

                    <div className="admin-stat-footer">
                      LIVE PERFORMANCE
                    </div>

                  </div>


                  <div className="admin-stat-card">

                    <div className="admin-stat-label">
                      FEATURED
                    </div>

                    <div className="admin-stat-value">
                      {featuredWorks}
                    </div>

                    <div className="admin-stat-footer">
                      FEATURED CONTENT
                    </div>

                  </div>


                  <div className="admin-stat-card">

                    <div className="admin-stat-label">
                      LATEST
                    </div>

                    <div className="admin-stat-value admin-stat-latest">

                      {latestWork
                        ? latestWork.year
                        : "—"}

                    </div>

                    <div className="admin-stat-footer">
                      LATEST RELEASE
                    </div>

                  </div>

                </div>


                {/* =============================================
                  RECENT CONTENT
              ============================================= */}

                <div className="admin-dashboard-block">

                  <div className="admin-block-header">

                    <div>

                      <span>
                        RECENT CONTENT
                      </span>

                      <h3>
                        Latest Karya
                      </h3>

                    </div>


                    <button
                      type="button"
                      className="admin-text-button"
                      onClick={() =>
                        handleSectionChange(
                          "works"
                        )
                      }
                    >
                      VIEW ALL →
                    </button>

                  </div>


                  {loadingWorks ? (

                    <div className="admin-inline-loading">
                      Loading karya...
                    </div>

                  ) : works.length === 0 ? (

                    <div className="admin-empty-state">

                      <div className="admin-empty-icon">
                        ◇
                      </div>

                      <h3>
                        No karya yet
                      </h3>

                      <p>
                        Add your first
                        Lowzack karya
                        to get started.
                      </p>

                      <button
                        type="button"
                        className="admin-secondary-button"
                        onClick={
                          openAddForm
                        }
                      >
                        RELEASE
                      </button>

                    </div>

                  ) : (

                    <div className="admin-recent-list">

                      {works
                        .slice(0, 5)
                        .map(
                          (work) => (

                            <div
                              className="admin-recent-item"
                              key={
                                work.id
                              }
                            >

                              <div className="admin-recent-thumb">

                                {work.thumbnail ? (

                                  <img
                                    src={
                                      work.thumbnail
                                    }
                                    alt={
                                      work.title
                                    }
                                  />

                                ) : (

                                  <div className="admin-recent-no-image">
                                    MUSIC
                                  </div>

                                )}

                                {(work.videoId ||
                                  extractYoutubeId(work.youtubeUrl)) && (
                                  <span>
                                    ▶
                                  </span>
                                )}

                              </div>


                              <div className="admin-recent-info">

                                <strong>
                                  {work.title}
                                </strong>

                                <span>

                                  {getDisplayCategory(
                                    work
                                  )}

                                  {" · "}

                                  {work.year}

                                </span>

                              </div>


                              {work.featured && (

                                <span className="admin-featured-badge">
                                  FEATURED
                                </span>

                              )}

                            </div>

                          )
                        )}

                    </div>

                  )}

                </div>

              </section>

            )}


          {/* =================================================
              KARYA
          ================================================= */}

          {activeSection ===
            "works" && (

              <section className="admin-videos-section">


                {/* SECTION HEADING */}

                <div className="admin-section-heading">

                  <div>

                    <span>
                      CONTENT MANAGEMENT
                    </span>

                    <h2>
                      Karya
                    </h2>

                    <p>
                      Add, edit and manage
                      all Lowzack works.
                    </p>

                  </div>


                  <button
                    type="button"
                    className="admin-primary-button"
                    onClick={
                      openAddForm
                    }
                  >

                    <span>
                      +
                    </span>

                    RELEASE

                  </button>

                </div>


                {/* =============================================
                  TOOLBAR
              ============================================= */}

                <div className="admin-video-toolbar">

                  <div className="admin-search">

                    <span>
                      ⌕
                    </span>

                    <input
                      type="search"
                      placeholder="SEARCH KARYA..."
                      value={
                        searchQuery
                      }
                      onChange={(event) =>
                        setSearchQuery(
                          event.target.value
                        )
                      }
                    />

                  </div>


                  <div className="admin-filter">

                    <label htmlFor="karya-category-filter">
                      CATEGORY
                    </label>

                    <select
                      id="karya-category-filter"
                      value={
                        categoryFilter
                      }
                      onChange={(event) =>
                        setCategoryFilter(
                          event.target.value
                        )
                      }
                    >

                      <option value="ALL">
                        ALL
                      </option>

                      {CATEGORY_OPTIONS.map(
                        (category) => (

                          <option
                            key={
                              category.value
                            }
                            value={
                              category.value
                            }
                          >
                            {category.label}
                          </option>

                        )
                      )}

                    </select>

                  </div>

                </div>


                {/* =============================================
                  RESULT COUNT
              ============================================= */}

                <div className="admin-results-line">

                  <span>

                    SHOWING{" "}

                    <strong>
                      {filteredWorks.length}
                    </strong>

                    {" "}OF{" "}

                    <strong>
                      {works.length}
                    </strong>

                    {" "}KARYA

                  </span>

                </div>


                {/* =============================================
                  LOADING
              ============================================= */}

                {loadingWorks ? (

                  <div className="admin-large-loading">

                    <div className="admin-spinner" />

                    <span>
                      LOADING KARYA...
                    </span>

                  </div>

                ) : filteredWorks.length === 0 ? (

                  <div className="admin-empty-state admin-empty-large">

                    <div className="admin-empty-icon">

                      {works.length
                        ? "⌕"
                        : "◇"}

                    </div>

                    <h3>

                      {works.length
                        ? "No karya found"
                        : "No karya yet"}

                    </h3>

                    <p>

                      {works.length
                        ? "Try changing your search or category filter."
                        : "Your Karya collection is currently empty."}

                    </p>


                    {!works.length && (

                      <button
                        type="button"
                        className="admin-secondary-button"
                        onClick={
                          openAddForm
                        }
                      >
                        RELEASE
                      </button>

                    )}

                  </div>

                ) : (

                  <div className="admin-video-grid">

                    {filteredWorks.map(
                      (work) => (

                        <article
                          className="admin-video-card"
                          key={
                            work.id
                          }
                        >


                          {/* =================================
                            THUMBNAIL
                        ================================= */}

                          <button
                            type="button"
                            className="admin-video-image"
                            onClick={() =>
                              openPreview(
                                work
                              )
                            }
                            disabled={
                              !(
                                work.videoId ||
                                extractYoutubeId(
                                  work.youtubeUrl
                                )
                              )
                            }
                          >

                            {work.thumbnail ? (

                              <img
                                src={
                                  work.thumbnail
                                }
                                alt={
                                  work.title
                                }
                                loading="lazy"
                              />

                            ) : (

                              <div className="admin-work-placeholder">

                                <span>
                                  LOWZACK
                                </span>

                                <strong>
                                  {getCategoryLabel(
                                    work.category
                                  )}
                                </strong>

                              </div>

                            )}


                            <div className="admin-video-image-overlay" />


                            {(work.videoId ||
                              extractYoutubeId(work.youtubeUrl)) && (

                              <span className="admin-play-button">
                                ▶
                              </span>

                            )}


                            {work.featured && (

                              <span className="admin-featured-label">
                                FEATURED
                              </span>

                            )}

                          </button>


                          {/* =================================
                            INFO
                        ================================= */}

                          <div className="admin-video-card-body">


                            <div className="admin-video-card-meta">

                              <span>
                                {getDisplayCategory(
                                  work
                                )}
                              </span>

                              <span>
                                {work.year ||
                                  "—"}
                              </span>

                            </div>


                            <h3>
                              {work.title}
                            </h3>


                            <p>

                              {work.subcategory === "album" &&
                                work.albumName
                                ? `Album: ${work.albumName}`
                                : work.description ||
                                "No description added."}

                            </p>


                            {/* ===============================
                              ACTIONS
                          =============================== */}

                            <div className="admin-video-actions">


                              {(work.videoId ||
                                extractYoutubeId(work.youtubeUrl)) && (

                                <button
                                  type="button"
                                  className="admin-action-button preview"
                                  onClick={() =>
                                    openPreview(
                                      work
                                    )
                                  }
                                >
                                  ▶ PREVIEW
                                </button>

                              )}


                              <button
                                type="button"
                                className="admin-action-button edit"
                                onClick={() =>
                                  openEditForm(
                                    work
                                  )
                                }
                              >
                                EDIT
                              </button>


                              <button
                                type="button"
                                className="admin-action-button delete"
                                onClick={() =>
                                  handleDelete(
                                    work
                                  )
                                }
                                disabled={
                                  deletingId ===
                                  work.id
                                }
                              >

                                {deletingId ===
                                  work.id
                                  ? "..."
                                  : "DELETE"}

                              </button>

                            </div>

                          </div>

                        </article>

                      )
                    )}

                  </div>

                )}

              </section>

            )}

        </div>

      </main>


      {/* =====================================================
          ADD / EDIT MODAL
      ===================================================== */}

      {showForm && (

        <div
          className="admin-modal-backdrop"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {
              closeForm();
            }

          }}
        >

          <div
            className="admin-form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-work-form-title"
          >


            {/* ===============================================
                MODAL HEADER
            =============================================== */}

            <div className="admin-modal-header">

              <div>

                <span>
                  {editingWork
                    ? "EDIT CONTENT"
                    : "NEW RELEASE"}
                </span>

                <h2 id="admin-work-form-title">

                  {editingWork
                    ? "Edit Karya"
                    : "Release"}

                </h2>

              </div>


              <button
                type="button"
                className="admin-modal-close"
                onClick={
                  closeForm
                }
                disabled={
                  saving
                }
              >
                ×
              </button>

            </div>


            {/* ===============================================
                FORM
            =============================================== */}

            <form
              className="admin-video-form"
              onSubmit={
                handleSubmit
              }
            >


              {/* =============================================
                  TITLE
              ============================================= */}

              <div className="admin-form-field">

                <label htmlFor="work-title">

                  TITLE

                  <span>
                    *
                  </span>

                </label>

                <input
                  id="work-title"
                  name="title"
                  type="text"
                  placeholder="e.g. NOW YOU KNOW!"
                  value={
                    form.title
                  }
                  onChange={
                    handleFormChange
                  }
                  autoComplete="off"
                />

              </div>


              {/* =============================================
                  ARTIST
              ============================================= */}

              <div className="admin-form-field">

                <label htmlFor="work-artist">
                  ARTIST
                </label>

                <input
                  id="work-artist"
                  name="artist"
                  type="text"
                  placeholder="LOWZACK"
                  value={
                    form.artist
                  }
                  onChange={
                    handleFormChange
                  }
                  autoComplete="off"
                />

              </div>


              {/* =============================================
                  CATEGORY
              ============================================= */}

              <div className="admin-form-field">

                <label>
                  CATEGORY
                  <span>
                    *
                  </span>
                </label>


                <div className="admin-category-selector">

                  {CATEGORY_OPTIONS.map(
                    (category) => (

                      <button
                        key={
                          category.value
                        }
                        type="button"
                        className={
                          form.category ===
                            category.value
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          handleCategoryChange(
                            category.value
                          )
                        }
                      >
                        {category.label}
                      </button>

                    )
                  )}

                </div>

              </div>


              {/* =============================================
                  MUSIC TYPE
              ============================================= */}

              <div className="admin-form-field">

                    <label>
                      MUSIC TYPE
                      <span>
                        *
                      </span>
                    </label>


                    <div className="admin-category-selector">

                      {MUSIC_SUBCATEGORY_OPTIONS.map(
                        (subcategory) => (

                          <button
                            key={
                              subcategory.value
                            }
                            type="button"
                            className={
                              form.subcategory ===
                                subcategory.value
                                ? "active"
                                : ""
                            }
                            onClick={() =>
                              handleSubcategoryChange(
                                subcategory.value
                              )
                            }
                          >
                            {
                              subcategory.label
                            }
                          </button>

                        )
                      )}

                    </div>

                </div>


              {/* =============================================
                  RELEASE SOURCES
              ============================================= */}

              <div className="admin-form-field">

                <label>
                  RELEASE SOURCES
                  <span>
                    *
                  </span>
                </label>

                <div className="admin-source-summary">

                  <div className="admin-source-chip">
                    <strong>
                      VIDEO
                    </strong>
                    <span>
                      YouTube URL
                    </span>
                  </div>

                  <div className="admin-source-chip">
                    <strong>
                      AUDIO
                    </strong>
                    <span>
                      Supabase upload
                    </span>
                  </div>

                </div>

                <small>
                  Every release must include both a YouTube video and a direct audio file.
                </small>

              </div>

              {/* =================================================
                  ALBUM
              ================================================= */}

              {form.subcategory === "album" && (

                <div className="admin-form-field">

                  <label>
                    ALBUM
                    <span>
                      *
                    </span>
                  </label>

                  <div className="admin-category-selector">

                    <button
                      type="button"
                      className={
                        form.albumMode === "new"
                          ? "active"
                          : ""
                      }
                      onClick={() => {
                        setForm((previous) => ({
                          ...previous,
                          albumMode: "new",
                          albumName: "",
                        }));
                        setFormError("");
                      }}
                    >
                      NEW ALBUM
                    </button>

                    <button
                      type="button"
                      className={
                        form.albumMode === "existing"
                          ? "active"
                          : ""
                      }
                      onClick={() => {
                        setForm((previous) => ({
                          ...previous,
                          albumMode: "existing",
                          albumName:
                            albumNames[0] ||
                            "",
                        }));
                        setFormError("");
                      }}
                      disabled={
                        albumNames.length === 0
                      }
                    >
                      EXISTING ALBUM
                    </button>

                  </div>

                  {form.albumMode === "new" ? (

                    <input
                      id="work-album-name"
                      name="albumName"
                      type="text"
                      placeholder="e.g. THE LOST TAPES"
                      value={
                        form.albumName
                      }
                      onChange={
                        handleFormChange
                      }
                      autoComplete="off"
                    />

                  ) : (

                    <select
                      id="work-album-name"
                      name="albumName"
                      value={
                        form.albumName
                      }
                      onChange={
                        handleFormChange
                      }
                      disabled={
                        albumNames.length === 0
                      }
                    >
                      <option value="">
                        SELECT ALBUM
                      </option>

                      {albumNames.map(
                        (album) => (
                          <option
                            key={album}
                            value={album}
                          >
                            {album}
                          </option>
                        )
                      )}
                    </select>

                  )}

                  <small>
                    {form.albumMode === "new"
                      ? "Create a new album and use the same name for every track in it."
                      : "Select an album that was already added before."}
                  </small>

                </div>

              )}

              {/* =================================================
                  VIDEO SOURCE
              ================================================= */}

              <div className="admin-form-field">

                <label htmlFor="work-youtube-url">
                  VIDEO / YOUTUBE URL
                  <span>
                    *
                  </span>
                </label>

                <input
                  id="work-youtube-url"
                  name="youtubeUrl"
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={
                    form.youtubeUrl
                  }
                  onChange={
                    handleFormChange
                  }
                />

                <small>
                  Paste the full YouTube video URL.
                </small>

                {extractYoutubeId(
                  form.youtubeUrl
                ) && (

                  <div className="admin-form-youtube-preview">

                    <img
                      src={
                        getYoutubeThumbnail(
                          extractYoutubeId(
                            form.youtubeUrl
                          )
                        )
                      }
                      alt="YouTube preview"
                    />

                    <div>

                      <span>
                        YOUTUBE SOURCE DETECTED
                      </span>

                      <strong>
                        ID:{" "}
                        {extractYoutubeId(
                          form.youtubeUrl
                        )}
                      </strong>

                    </div>

                  </div>

                )}

              </div>


              {/* =================================================
                  AUDIO SOURCE
              ================================================= */}

              <div className="admin-form-field">

                <label htmlFor="work-audio-file">
                  AUDIO FILE
                  <span>
                    *
                  </span>
                </label>

                <input
                  id="work-audio-file"
                  type="file"
                  accept=".mp3,.wav,.m4a,.aac,.flac,.ogg,audio/*"
                  onChange={
                    handleAudioFileChange
                  }
                />

                <small>
                  Upload MP3, WAV, M4A, AAC, FLAC or OGG to Supabase. Maximum 50 MB.
                </small>

                {(audioFile ||
                  form.audioFileName ||
                  form.audioUrl) && (

                  <div className="admin-audio-uploaded">

                    <div>
                      <span>
                        AUDIO SOURCE
                      </span>

                      <strong>
                        {audioFile?.name ||
                          form.audioFileName ||
                          "Audio file uploaded"}
                      </strong>
                    </div>

                    {audioFile && (
                      <button
                        type="button"
                        className="admin-secondary-button"
                        onClick={
                          removeSelectedAudio
                        }
                      >
                        REMOVE
                      </button>
                    )}

                  </div>

                )}

              </div>

              {/* =============================================
                  YEAR + CATEGORY SUMMARY
              ============================================= */}

              <div className="admin-form-row">


                {/* YEAR */}

                <div className="admin-form-field">

                  <label htmlFor="work-year">

                    YEAR

                    <span>
                      *
                    </span>

                  </label>

                  <input
                    id="work-year"
                    name="year"
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="2026"
                    value={
                      form.year
                    }
                    onChange={
                      handleFormChange
                    }
                  />

                </div>


                {/* CURRENT TYPE */}

                <div className="admin-form-field">

                  <label>
                    CONTENT TYPE
                  </label>

                  <div className="admin-form-static-value">

                    {getCategoryLabel(
                      form.category
                    )}

                    {form.category ===
                      "music" &&
                      form.subcategory && (
                        <>
                          {" · "}
                          {
                            getSubcategoryLabel(
                              form.subcategory
                            )
                          }
                        </>
                      )}

                  </div>

                </div>

              </div>


              {/* =============================================
                  DESCRIPTION
              ============================================= */}

              <div className="admin-form-field">

                <label htmlFor="work-description">
                  DESCRIPTION
                </label>

                <textarea
                  id="work-description"
                  name="description"
                  rows={5}
                  placeholder="Write a short description..."
                  value={
                    form.description
                  }
                  onChange={
                    handleFormChange
                  }
                />

              </div>


              {/* =============================================
                  FEATURED
              ============================================= */}

              <label className="admin-featured-toggle">

                <input
                  type="checkbox"
                  name="featured"
                  checked={
                    form.featured
                  }
                  onChange={
                    handleFormChange
                  }
                />

                <span className="admin-custom-checkbox">
                  ✓
                </span>

                <span className="admin-featured-copy">

                  <strong>
                    FEATURED CONTENT
                  </strong>

                  <small>
                    Highlight this
                    karya as featured
                    content.
                  </small>

                </span>

              </label>


              {/* =============================================
                  ERROR
              ============================================= */}

              {formError && (

                <div className="admin-form-error">

                  <span>
                    !
                  </span>

                  {formError}

                </div>

              )}


              {/* =============================================
                  ACTIONS
              ============================================= */}

              <div className="admin-form-actions">

                <button
                  type="button"
                  className="admin-secondary-button"
                  onClick={
                    closeForm
                  }
                  disabled={
                    saving ||
                    audioUploading
                  }
                >
                  CANCEL
                </button>


                <button
                  type="submit"
                  className="admin-primary-button"
                  disabled={
                    saving ||
                    audioUploading
                  }
                >

                  {saving || audioUploading ? (

                    <>
                      <span className="admin-button-spinner" />
                      {audioUploading
                        ? "UPLOADING AUDIO..."
                        : "SAVING..."}
                    </>

                  ) : (

                    <>
                      {editingWork
                        ? "SAVE CHANGES"
                        : "RELEASE"}
                    </>

                  )}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {/* =====================================================
          YOUTUBE PREVIEW MODAL
      ===================================================== */}

      {showPreview &&
        previewWork &&
        previewWork.videoId && (

          <div
            className="admin-preview-backdrop"
            onMouseDown={(event) => {

              if (
                event.target ===
                event.currentTarget
              ) {

                setShowPreview(
                  false
                );

                setPreviewWork(
                  null
                );

              }

            }}
          >

            <div
              className="admin-preview-modal"
              role="dialog"
              aria-modal="true"
            >


              {/* HEADER */}

              <div className="admin-preview-header">

                <div>

                  <span>
                    LOWZACK / KARYA
                  </span>

                  <h2>
                    {previewWork.title}
                  </h2>

                </div>


                <button
                  type="button"
                  className="admin-modal-close"
                  onClick={() => {

                    setShowPreview(
                      false
                    );

                    setPreviewWork(
                      null
                    );

                  }}
                >
                  ×
                </button>

              </div>


              {/* PLAYER */}

              <div className="admin-video-player">

                <iframe
                  src={getYoutubeEmbed(
                    previewWork.videoId
                  )}
                  title={previewWork.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />

              </div>


              {/* INFO */}

              <div className="admin-preview-info">

                <div className="admin-preview-meta">

                  <span>
                    {getDisplayCategory(
                      previewWork
                    )}
                  </span>

                  <span>
                    {previewWork.year}
                  </span>

                  {previewWork.featured && (

                    <span className="admin-preview-featured">
                      FEATURED
                    </span>

                  )}

                </div>


                {previewWork.audioUrl && (
                  <p>
                    Audio source:{" "}
                    {previewWork.audioFileName ||
                      "Supabase audio"}
                  </p>
                )}

                {previewWork.category ===
                  "music" &&
                  previewWork.subcategory ===
                  "album" &&
                  previewWork.albumName && (

                    <p>
                      Album:{" "}
                      {
                        previewWork.albumName
                      }
                    </p>

                  )}


                {previewWork.description && (

                  <p>
                    {
                      previewWork.description
                    }
                  </p>

                )}


                <div className="admin-preview-actions">


                  <a
                    href={getYoutubeWatchUrl(
                      previewWork.videoId
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="admin-secondary-button"
                  >
                    OPEN ON YOUTUBE ↗
                  </a>


                  <button
                    type="button"
                    className="admin-primary-button"
                    onClick={() => {

                      setShowPreview(
                        false
                      );

                      setPreviewWork(
                        null
                      );

                      openEditForm(
                        previewWork
                      );

                    }}
                  >
                    EDIT KARYA
                  </button>

                </div>

              </div>

            </div>

          </div>

        )}

    </div>
  );
}


export default AdminPage;