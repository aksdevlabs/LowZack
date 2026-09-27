import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  collection,
  onSnapshot,
} from "firebase/firestore";

import {
  Link,
} from "react-router-dom";

import {
  db,
} from "../firebase";

import Navbar from "../components/Navbar";
import bannerLowzack from "../assets/bannerlowzack.jpeg";
import bannerLowzack4 from "../assets/bannerlowzack4.jpeg";

import "../styles/Home.css";


/* =========================================================
   LOWZACK
   OFFICIAL ARTIST WEBSITE
   HOME PAGE
========================================================= */


/* =========================================================
   HERO DATA
========================================================= */

const heroData = {
  title: "LOWZACK",

  eyebrow:
    "REAL SOUND. REAL STORY.",

  role:
    "RAPPER / SONGWRITER / INDONESIAN HIP-HOP ARTIST",

  description:
    "LowZack is a rapper from Bogor, Indonesia.\nStarting his career in 2018, he's known as a lyrical rapper who can execute beats and instruments across all genres.\nLowZack is an independent hip-hop/rap artist affiliated with MEGABAYZ Enterprises.",

  image:
    bannerLowzack,
};


/* =========================================================
   RELEASE DATA
   SOURCE: FIRESTORE / karya
========================================================= */

const RELEASES_COLLECTION = "karya";
const DISCOGRAPHY_COLLECTION = "Discography";


/* =========================================================
   YOUTUBE DATA API
   Source of truth for real YouTube view counts.
========================================================= */

const YOUTUBE_API_KEY =
  import.meta.env.VITE_YOUTUBE_API_KEY || "";


const getYoutubeViews = async (
  videoIds
) => {
  const uniqueIds = [
    ...new Set(
      videoIds.filter(Boolean)
    ),
  ];

  if (
    !YOUTUBE_API_KEY ||
    uniqueIds.length === 0
  ) {
    return {};
  }

  const viewMap = {};

  /*
   * YouTube videos.list menerima maksimal
   * 50 video ID dalam satu request.
   */
  for (
    let index = 0;
    index < uniqueIds.length;
    index += 50
  ) {
    const batch = uniqueIds.slice(
      index,
      index + 50
    );

    const params = new URLSearchParams({
      part: "statistics",
      id: batch.join(","),
      key: YOUTUBE_API_KEY,
    });

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(
          `YouTube API error: ${response.status}`
        );
      }

      const data =
        await response.json();

      (data.items || []).forEach(
        (item) => {
          viewMap[item.id] = Number(
            item.statistics?.viewCount || 0
          );
        }
      );
    } catch (apiError) {
      console.error(
        "LOWZACK YouTube views error:",
        apiError
      );
    }
  }

  return viewMap;
};


const extractYoutubeId = (value) => {
  if (!value) return "";

  const input = String(value).trim();

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

  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return input;
  }

  return "";
};


const getReleaseThumbnail = (release) => {
  if (release?.thumbnail) {
    return release.thumbnail;
  }

  const videoId =
    release?.videoId ||
    extractYoutubeId(
      release?.youtubeUrl
    );

  if (videoId) {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  }

  return "";
};


const isLowzackTrack = (release) =>
  Boolean(String(release?.audioUrl || "").trim());


/* =========================================================
   LEGACY AUDIO RELEASE CHECK
   Keeps release-link matching compatible with older records.
========================================================= */

const isMusicAudio = (release) => {
  const audioUrl = String(
    release?.audioUrl || ""
  ).trim();

  if (!audioUrl) {
    return false;
  }

  const mediaType = String(
    release?.mediaType || ""
  ).toLowerCase();

  const category = String(
    release?.category || ""
  ).toLowerCase();

  // New records contain both audio + YouTube.
  // Treat them as the current release instead of searching
  // for a separate video record.
  if (Boolean(release?.videoId || extractYoutubeId(release?.youtubeUrl))) {
    return false;
  }

  return (
    mediaType === "audio" ||
    (category === "music" && !Boolean(release?.videoId || extractYoutubeId(release?.youtubeUrl)))
  );
};


const getReleaseYoutubeId = (release) => {
  const directVideoId = String(
    release?.videoId || ""
  ).trim();

  if (directVideoId) {
    return directVideoId;
  }

  return extractYoutubeId(
    release?.youtubeUrl
  );
};

const getTrackTitle = (release) =>
  release?.title ||
  release?.name ||
  "UNTITLED";

const getTrackArtist = (release) =>
  release?.artist ||
  release?.Artis ||
  "LOWZACK";


const getReleaseViewCount = (
  release,
  youtubeViews = {}
) => {
  const videoId = getReleaseYoutubeId(release);

  if (!videoId) {
    return null;
  }

  if (
    Object.prototype.hasOwnProperty.call(
      youtubeViews,
      videoId
    )
  ) {
    return Number(youtubeViews[videoId]) || 0;
  }

  /*
   * IMPORTANT:
   * Jangan fallback ke field Firestore seperti views/viewCount.
   * MOST VIEWS harus memakai total view asli dari YouTube.
   */
  return null;
};


const formatReleaseViews = (
  release,
  youtubeViews = {},
  youtubeViewsLoading = false
) => {
  const views = getReleaseViewCount(
    release,
    youtubeViews
  );

  if (views === null) {
    return youtubeViewsLoading
      ? "UPDATING VIEWS..."
      : "VIEWS UNAVAILABLE";
  }

  if (views >= 1000000000) {
    return `${(
      views / 1000000000
    )
      .toFixed(1)
      .replace(/\.0$/, "")}B views`;
  }

  if (views >= 1000000) {
    return `${(
      views / 1000000
    )
      .toFixed(1)
      .replace(/\.0$/, "")}M views`;
  }

  if (views >= 1000) {
    return `${(
      views / 1000
    )
      .toFixed(1)
      .replace(/\.0$/, "")}K views`;
  }

  return `${views.toLocaleString(
    "en-US"
  )} views`;
};


const getNewestRelease = (items) => {
  return sortReleases(items)[0] || null;
};


const getMostViewedRelease = (
  items,
  youtubeViews = {}
) => {
  const releasesWithViews = items.filter(
    (release) =>
      getReleaseViewCount(
        release,
        youtubeViews
      ) !== null
  );

  if (releasesWithViews.length === 0) {
    return null;
  }

  return [...releasesWithViews].sort(
    (first, second) =>
      getReleaseViewCount(
        second,
        youtubeViews
      ) -
      getReleaseViewCount(
        first,
        youtubeViews
      )
  )[0] || null;
};


const getReleaseYear = (release) => {
  if (release?.year) {
    return String(release.year);
  }

  if (release?.createdAt?.toDate) {
    return String(
      release.createdAt
        .toDate()
        .getFullYear()
    );
  }

  return "";
};


const getReleaseType = (release) => {
  const category =
    String(
      release?.category || ""
    ).toLowerCase();

  const subcategory =
    String(
      release?.subcategory || ""
    ).toLowerCase();

  const explicitType =
    String(
      release?.type ||
      release?.releaseType ||
      ""
    ).toUpperCase();

  if (explicitType === "EP") {
    return "EP";
  }

  if (
    category === "music" &&
    subcategory === "album"
  ) {
    return "ALBUM";
  }

  if (
    category === "music" &&
    subcategory === "single"
  ) {
    return "SINGLE";
  }

  if (explicitType === "ALBUM") {
    return "ALBUM";
  }

  if (explicitType === "SINGLE") {
    return "SINGLE";
  }

  return explicitType || "SINGLE";
};


const sortReleases = (items) => {
  return [...items].sort(
    (first, second) => {

      const yearA =
        Number(
          first?.year || 0
        );

      const yearB =
        Number(
          second?.year || 0
        );

      if (yearA !== yearB) {
        return yearB - yearA;
      }

      const createdA =
        first?.createdAt?.toMillis?.() ||
        0;

      const createdB =
        second?.createdAt?.toMillis?.() ||
        0;

      return createdB - createdA;
    }
  );
};


/* =========================================================
   LATEST TRACKS
   Derived from Firestore releases inside Home.
========================================================= */


/* =========================================================
   FEATURED VIDEO
========================================================= */

const featuredVideo = {
  title:
    "Lowzack - Jalan Sendiri",

  subtitle:
    "Official Music Video",

  views:
    "482K views",

  date:
    "8 months ago",

  image:
    "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1600&q=90",
};


/* =========================================================
   ARTIST QUOTE
========================================================= */

const artistQuote = {
  quote:
    "SENI UNTUK HIDUP, HIDUP UNTUK SENI",

  subtitle:
    "(Teruslah menghidupi seni hingga seni menghidupi mu)",

  author:
    "LOWZACK",

  // Quote background uses bannerlowzack4.jpeg
  // from src/assets/
  image:
    bannerLowzack4,
};


/* =========================================================
   SOCIAL LINKS
========================================================= */

const socialLinks = [
  {
    label:
      "YOUTUBE",

    url:
      "#",
  },

  {
    label:
      "SPOTIFY",

    url:
      "https://open.spotify.com/",
  },

  {
    label:
      "SOUNDCLOUD",

    url:
      "#",
  },

  {
    label:
      "X",

    url:
      "#",
  },

  {
    label:
      "TIKTOK",

    url:
      "#",
  },
];


/* =========================================================
   HELPERS
========================================================= */

const scrollToSection = (id) => {
  const element =
    document.getElementById(id);

  if (!element) {
    return;
  }

  element.scrollIntoView({
    behavior:
      "smooth",

    block:
      "start",
  });
};


/* =========================================================
   HOME COMPONENT
========================================================= */

function Home() {
  const [
    activeFilter,
    setActiveFilter,
  ] = useState("ALL");

  /*
   * RELEASE CAROUSEL
   * Desktop shows 12 releases at a time.
   */
  const getReleasePageSize = () => {
    if (typeof window === "undefined") {
      return 12;
    }

    // Mobile: 4 columns x 2 rows = 8 cards
    // Tablet: 3 columns x 2 rows = 6 cards
    // Desktop: 6 columns x 2 rows = 12 cards
    if (window.innerWidth <= 700) {
      return 8;
    }

    if (window.innerWidth <= 1200) {
      return 6;
    }

    return 12;
  };

  const [releasesPerPage, setReleasesPerPage] = useState(
    getReleasePageSize
  );

  const [releaseLayoutReady, setReleaseLayoutReady] =
    useState(false);

  const [
    releasePage,
    setReleasePage,
  ] = useState(0);

  const [
    activeTrack,
    setActiveTrack,
  ] = useState(null);

  const [
    isPlayerMinimized,
    setIsPlayerMinimized,
  ] = useState(false);

  const audioRef = useRef(null);

  const [
    isPlaying,
    setIsPlaying,
  ] = useState(false);

  const [
    currentTime,
    setCurrentTime,
  ] = useState(0);

  const [
    duration,
    setDuration,
  ] = useState(0);

  const [
    volume,
    setVolume,
  ] = useState(1);


  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return "00:00";
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds =
      Math.floor(seconds % 60);

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };


  const togglePlayback = async () => {
    const audio = audioRef.current;

    if (!audio || !activeTrack?.audioUrl) {
      return;
    }

    try {
      if (audio.paused) {
        await audio.play();
      } else {
        audio.pause();
      }
    } catch (error) {
      console.error(
        "Audio playback error:",
        error
      );
    }
  };


  const handleSeek = (event) => {
    const audio = audioRef.current;

    if (!audio || !duration) {
      return;
    }

    const nextTime =
      Number(event.target.value);

    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };


  const handleVolumeChange = (event) => {
    const nextVolume = Math.min(
      1,
      Math.max(0, Number(event.target.value))
    );

    setVolume(nextVolume);

    if (audioRef.current) {
      audioRef.current.volume = nextVolume;
    }
  };


  const changeVolume = (amount) => {
    const nextVolume = Math.min(
      1,
      Math.max(0, Number((volume + amount).toFixed(2)))
    );

    setVolume(nextVolume);

    if (audioRef.current) {
      audioRef.current.volume = nextVolume;
    }
  };



  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);


  /* =======================================================
     FIRESTORE / KARYA
  ======================================================= */

  const [
    releases,
    setReleases,
  ] = useState([]);

  const [
    releasesLoading,
    setReleasesLoading,
  ] = useState(true);

  const [
    releasesError,
    setReleasesError,
  ] = useState("");


  const [
    discographyTracks,
    setDiscographyTracks,
  ] = useState([]);


  const [
    youtubeViews,
    setYoutubeViews,
  ] = useState({});

  const [
    youtubeViewsLoading,
    setYoutubeViewsLoading,
  ] = useState(false);


  const [
    youtubeViewsError,
    setYoutubeViewsError,
  ] = useState("");


  useEffect(() => {

    setReleasesLoading(true);
    setReleasesError("");

    const releasesRef =
      collection(
        db,
        RELEASES_COLLECTION
      );

    const unsubscribe =
      onSnapshot(
        releasesRef,

        (snapshot) => {

          const firestoreReleases =
            snapshot.docs.map(
              (document) => ({
                id:
                  document.id,

                ...document.data(),
              })
            );

          setReleases(
            sortReleases(
              firestoreReleases
            )
          );

          setReleasesLoading(false);
        },

        (snapshotError) => {

          console.error(
            "Home Karya Firestore error:",
            snapshotError
          );

          setReleasesError(
            "Unable to load releases right now."
          );

          setReleasesLoading(false);
        }
      );

    return () => {
      unsubscribe();
    };

  }, []);


  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, DISCOGRAPHY_COLLECTION),
      (snapshot) => {
        const tracks = snapshot.docs.map((document) => {
          const data = document.data();
          const artist = data.Artis || data.artist || "LOWZACK";

          return {
            id: document.id,
            ...data,
            title: data.JudulLagu || data.title || data.name || "UNTITLED",
            artist: Array.isArray(artist) ? artist.join(", ") : String(artist),
            audioUrl: data.audioUrl || data.AudioUrl || "",
            youtubeUrl: data.Sumber?.youtube || data.youtubeUrl || "",
            year: data.TahunRilis || data.year || "",
          };
        });

        setDiscographyTracks(sortReleases(tracks));
      },
      (snapshotError) => {
        console.error("Home Discography Firestore error:", snapshotError);
        setDiscographyTracks([]);
      }
    );

    return () => unsubscribe();
  }, []);


  /* =======================================================
     YOUTUBE REAL-TIME VIEW COUNTS
     Ambil total views asli dari YouTube berdasarkan
     videoId yang tersimpan di Firestore.
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    const videoIds = [
      ...new Set(
        releases
          .map((release) =>
            getReleaseYoutubeId(release)
          )
          .filter(Boolean)
      ),
    ];

    if (videoIds.length === 0) {
      setYoutubeViews({});
      setYoutubeViewsError("");
      setYoutubeViewsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    if (!YOUTUBE_API_KEY) {
      const message =
        "VITE_YOUTUBE_API_KEY belum tersedia.";

      console.error(
        `LOWZACK YouTube views: ${message}`
      );

      setYoutubeViews({});
      setYoutubeViewsError(message);
      setYoutubeViewsLoading(false);

      return () => {
        cancelled = true;
      };
    }

    setYoutubeViewsLoading(true);
    setYoutubeViewsError("");

    getYoutubeViews(videoIds)
      .then((viewMap) => {
        if (cancelled) {
          return;
        }

        setYoutubeViews(viewMap);

        if (Object.keys(viewMap).length === 0) {
          setYoutubeViewsError(
            "YouTube views tidak berhasil diambil. Periksa API key dan video ID."
          );
        }
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        console.error(
          "LOWZACK YouTube views error:",
          error
        );

        setYoutubeViews({});
        setYoutubeViewsError(
          "YouTube views tidak berhasil diambil."
        );
      })
      .finally(() => {
        if (!cancelled) {
          setYoutubeViewsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [releases]);


  /* =======================================================
     FILTERED RELEASES
     ALL RELEASES tetap berasal dari Firestore / karya.
  ======================================================= */

  const filteredReleases = useMemo(() => {
    if (activeFilter === "ALL") {
      return releases;
    }

    return releases.filter(
      (release) =>
        getReleaseType(release) === activeFilter
    );
  }, [
    releases,
    activeFilter,
  ]);


  /* =======================================================
     LATEST TRACKS
     Diambil otomatis dari 5 release terbaru di collection karya.
  ======================================================= */

  const releasePageCount = Math.max(
    1,
    Math.ceil(
      filteredReleases.length /
      releasesPerPage
    )
  );

  const visibleReleases = useMemo(() => {
    const start =
      releasePage *
      releasesPerPage;

    return filteredReleases.slice(
      start,
      start + releasesPerPage
    );
  }, [
    filteredReleases,
    releasePage,
    releasesPerPage,
  ]);

  useLayoutEffect(() => {
    const handleReleasePageSize = () => {
      const nextSize = getReleasePageSize();

      setReleasesPerPage((currentSize) => {
        if (currentSize === nextSize) {
          return currentSize;
        }

        setReleasePage(0);
        return nextSize;
      });

      setReleaseLayoutReady(true);
    };

    // Run immediately on mount so the first render uses
    // the current viewport instead of waiting for refresh.
    handleReleasePageSize();

    // React to browser resize/orientation changes immediately.
    window.addEventListener("resize", handleReleasePageSize);
    window.addEventListener("orientationchange", handleReleasePageSize);

    // Mobile browsers can change the visual viewport without
    // firing the normal resize event consistently.
    const visualViewport = window.visualViewport;

    if (visualViewport) {
      visualViewport.addEventListener(
        "resize",
        handleReleasePageSize
      );
    }

    return () => {
      window.removeEventListener(
        "resize",
        handleReleasePageSize
      );
      window.removeEventListener(
        "orientationchange",
        handleReleasePageSize
      );

      if (visualViewport) {
        visualViewport.removeEventListener(
          "resize",
          handleReleasePageSize
        );
      }
    };
  }, []);

  useEffect(() => {
    setReleasePage(0);
  }, [activeFilter, releasesPerPage]);

  useEffect(() => {
    if (releasePage >= releasePageCount) {
      setReleasePage(
        releasePageCount - 1
      );
    }
  }, [
    releasePage,
    releasePageCount,
  ]);

  const canGoPreviousReleasePage =
    releasePage > 0;

  const canGoNextReleasePage =
    releasePage <
    releasePageCount - 1;


  const lowzackTracks = useMemo(() => {
    return discographyTracks
      .filter((release) => isLowzackTrack(release))
      .map((release, index) => ({
        id: release.id,
        number: index + 1,
        title: getTrackTitle(release),
        duration:
          release.duration ||
          release.audioDuration ||
          "--:--",
        audioUrl: String(release.audioUrl || "").trim(),
        youtubeUrl: release.youtubeUrl || "",
        youtubeId: getReleaseYoutubeId(release),
        cover: getReleaseThumbnail(release),
        artist: getTrackArtist(release),
        isPlaylistTrack: true,
      }));
  }, [discographyTracks]);


  /* =======================================================
     LOWZACK TRACK PLAYLIST
     Automatically advances to the next uploaded audio.
  ======================================================= */

  const playTrackByIndex = async (nextIndex) => {
    if (
      nextIndex < 0 ||
      nextIndex >= lowzackTracks.length
    ) {
      return false;
    }

    const nextTrack = lowzackTracks[nextIndex];

    if (!nextTrack?.audioUrl) {
      return false;
    }

    setActiveTrack(nextTrack);
    return true;
  };

  const handleTrackEnded = async () => {
    if (!activeTrack?.id) {
      return;
    }

    // Only LOWZACK TRACK is an automatic playlist.
    // Releases selected from the collection stop when the song ends.
    if (!activeTrack.isPlaylistTrack) {
      setIsPlaying(false);
      setCurrentTime(0);

      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }

      return;
    }

    const currentIndex = lowzackTracks.findIndex(
      (track) => track.id === activeTrack.id
    );

    if (
      currentIndex === -1 ||
      currentIndex >= lowzackTracks.length - 1
    ) {
      setIsPlaying(false);
      setCurrentTime(0);

      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }

      return;
    }

    await playTrackByIndex(currentIndex + 1);
  };


  useEffect(() => {
    const audio = audioRef.current;

    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);

    if (!audio || !activeTrack?.audioUrl) {
      return;
    }

    audio.volume = volume;

    const handleLoadedMetadata = () => {
      setDuration(
        Number.isFinite(audio.duration)
          ? audio.duration
          : 0
      );
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      void handleTrackEnded();
    };

    audio.addEventListener(
      "loadedmetadata",
      handleLoadedMetadata
    );

    audio.addEventListener(
      "timeupdate",
      handleTimeUpdate
    );

    audio.addEventListener(
      "play",
      handlePlay
    );

    audio.addEventListener(
      "pause",
      handlePause
    );

    audio.addEventListener(
      "ended",
      handleEnded
    );

    audio.load();

    const playWhenReady = async () => {
      try {
        await audio.play();
      } catch {
        // Browser may block autoplay.
        // User can press the play button.
      }
    };

    if (audio.readyState >= 2) {
      playWhenReady();
    } else {
      audio.addEventListener(
        "canplay",
        playWhenReady,
        { once: true }
      );
    }

    return () => {
      audio.pause();

      audio.removeEventListener(
        "loadedmetadata",
        handleLoadedMetadata
      );

      audio.removeEventListener(
        "timeupdate",
        handleTimeUpdate
      );

      audio.removeEventListener(
        "play",
        handlePlay
      );

      audio.removeEventListener(
        "pause",
        handlePause
      );

      audio.removeEventListener(
        "ended",
        handleEnded
      );
    };
  }, [
    activeTrack?.audioUrl,
    activeTrack?.id,
    lowzackTracks,
  ]);


  return (
    <main className="lowzack-home">


      {/* =====================================================
          NAVBAR COMPONENT
          
          Navbar dibuat sepenuhnya di:
          src/components/Navbar.jsx
          
          Home.jsx hanya memanggil component-nya.
      ===================================================== */}

      <Navbar />


      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="hero">


        {/* =================================================
            BACKGROUND
        ================================================= */}

        <div className="hero-image">

          <img
            src={heroData.image}
            alt="Lowzack"
          />

        </div>


        {/* =================================================
            OVERLAY
        ================================================= */}

        <div className="hero-overlay" />

        <div className="hero-vignette" />

        <div className="hero-noise" />


        {/* =================================================
            HERO CONTENT
        ================================================= */}

        <div className="hero-content">


          <span className="hero-eyebrow">
            {heroData.eyebrow}
          </span>


          <h1 className="hero-title">
            {heroData.title}
          </h1>


          <div className="hero-details">


            <span className="hero-role">
              {heroData.role}
            </span>


            <p className="hero-description">
              {heroData.description.split("\n").map((line, index) => (
                <React.Fragment key={index}>
                  {line}
                  {index < heroData.description.split("\n").length - 1 && (
                    <br />
                  )}
                </React.Fragment>
              ))}
            </p>


            <button
              type="button"
              className="listen-button"
              onClick={() =>
                scrollToSection(
                  "discography"
                )
              }
            >

              <span className="listen-icon">
                ▶
              </span>

              <span>
                LISTEN NOW
              </span>

            </button>


          </div>

        </div>


        {/* =================================================
            HERO RIGHT TEXT
        ================================================= */}

        <div className="hero-side">

          <span>
            LOWZACK
          </span>

          <p>
            MUSIC
            <br />
            IS
            <br />
            MY
            <br />
            THERAPY
          </p>

        </div>


        {/* =================================================
            HERO SCROLL
        ================================================= */}

        <button
          type="button"
          className="hero-scroll"
          onClick={() =>
            scrollToSection(
              "discography"
            )
          }
        >

          SCROLL

          <span>
            ↓
          </span>

        </button>


      </section>


      {/* =====================================================
          DISCOGRAPHY
      ===================================================== */}

      <section
        className="discography-section"
        id="discography"
      >

        <div className="section-container">


          {/* =================================================
              SECTION HEADER
          ================================================= */}

          <div className="discography-header">


            <div>

              <span className="section-eyebrow">
                DISCOGRAPHY
              </span>

              <h2>
                ALL RELEASES
              </h2>

            </div>


            {/* =================================================
                FILTER
            ================================================= */}

            <div className="release-filters">

              {[
                "ALL",
                "SINGLE",
                "EP",
                "ALBUM",
              ].map(
                (filter) => (

                  <button
                    key={filter}
                    type="button"
                    className={
                      activeFilter ===
                        filter
                        ? "active"
                        : ""
                    }
                    onClick={() =>
                      setActiveFilter(
                        filter
                      )
                    }
                  >

                    {filter ===
                      "SINGLE"
                      ? "SINGLES"
                      : filter}

                  </button>

                )
              )}

            </div>

          </div>


          {/* =================================================
              RELEASE GRID
          ================================================= */}

          <div className="release-carousel">

            {releasesLoading ? (

              <div className="release-grid-state">
                LOADING RELEASES
              </div>

            ) : releasesError ? (

              <div className="release-grid-state release-grid-error">
                {releasesError}
              </div>

            ) : filteredReleases.length === 0 ? (

              <div className="release-grid-state">
                NO RELEASES FOUND
              </div>

            ) : !releaseLayoutReady ? (

              <div className="release-grid-state">
                LOADING RELEASES
              </div>

            ) : (

              <>
                {releasePageCount > 1 && (
                  <button
                    type="button"
                    className="release-carousel-arrow release-carousel-arrow-prev"
                    onClick={() =>
                      setReleasePage(
                        (currentPage) =>
                          Math.max(
                            0,
                            currentPage - 1
                          )
                      )
                    }
                    disabled={!canGoPreviousReleasePage}
                    aria-label="Previous releases"
                    title="Previous releases"
                  >
                    ‹
                  </button>
                )}

                <div className="release-grid">
                  {visibleReleases.map(
                    (release) => {

                  const thumbnail =
                    getReleaseThumbnail(
                      release
                    );

                  const releaseType =
                    getReleaseType(
                      release
                    );

                  const releaseYear =
                    getReleaseYear(
                      release
                    );

                  const title =
                    release.title ||
                    "UNTITLED";

                  const matchingVideoRelease = isMusicAudio(release)
                    ? releases.find((candidate) =>
                      candidate.id !== release.id &&
                      String(candidate?.title || "").trim().toLowerCase() ===
                      String(release?.title || "").trim().toLowerCase() &&
                      !isMusicAudio(candidate) &&
                      Boolean(getReleaseYoutubeId(candidate))
                    )
                    : release;

                  const releaseUrl =
                    `/releases?title=${encodeURIComponent(
                      matchingVideoRelease?.title || title
                    )}${matchingVideoRelease?.id
                      ? `&releaseId=${encodeURIComponent(matchingVideoRelease.id)}`
                      : ""
                    }`;

                  const audioUrl =
                    release.audioUrl ||
                    "";

                  const youtubeId =
                    getReleaseYoutubeId(release);

                  return (

                    <article
                      className="release-card"
                      key={release.id}
                    >

                      <Link
                        to={releaseUrl}
                        state={{
                          releaseId:
                            matchingVideoRelease?.id || release.id,
                          title:
                            matchingVideoRelease?.title || title,
                          fromHomeWatchVideo: true,
                        }}
                        className="release-cover-link"
                        aria-label={
                          `Open ${title} in Releases`
                        }
                      >

                        <div className="release-cover">

                          {thumbnail ? (

                            <img
                              src={thumbnail}
                              alt={title}
                              loading="lazy"
                            />

                          ) : (

                            <div className="release-cover-fallback">
                              LOWZACK
                            </div>

                          )}

                          <div className="release-cover-overlay">

                            <span>
                              WATCH VIDEO
                            </span>

                          </div>

                          <span className="release-pg">
                            PARENTAL
                            <br />
                            ADVISORY
                          </span>

                        </div>

                      </Link>


                      <div className="release-info">

                        <div>

                          <h3>
                            {title}
                          </h3>

                          <p>
                            {
                              releaseType ===
                                "SINGLE"
                                ? "Single"
                                : releaseType
                            }
                            {" · "}
                            {releaseYear}
                          </p>

                        </div>


                        <button
                          type="button"
                          className="release-play"
                          disabled={!audioUrl}
                          onClick={() => {

                            if (!audioUrl) {
                              return;
                            }

                            setIsPlayerMinimized(false);

                            setActiveTrack({
                              id:
                                release.id,

                              title:
                                title,

                              artist:
                                release.artist ||
                                "LOWZACK",

                              cover:
                                thumbnail,

                              audioUrl:
                                audioUrl,

                              youtubeUrl:
                                release.youtubeUrl ||
                                "",

                              youtubeId:
                                youtubeId,

                              duration:
                                release.duration ||
                                release.audioDuration ||
                                "--:--",
                              isPlaylistTrack: false,
                            });

                          }}
                          aria-label={
                            audioUrl || youtubeId
                              ? `Play ${title}`
                              : `${title} has no audio`
                          }
                          title={
                            audioUrl
                              ? "Play audio"
                              : youtubeId
                                ? "Play from YouTube audio source"
                                : "Audio not available"
                          }
                        >
                          ▶
                        </button>

                      </div>

                    </article>

                  );

                    }
                  )}
                </div>

                {releasePageCount > 1 && (
                  <button
                    type="button"
                    className="release-carousel-arrow release-carousel-arrow-next"
                    onClick={() =>
                      setReleasePage(
                        (currentPage) =>
                          Math.min(
                            releasePageCount - 1,
                            currentPage + 1
                          )
                      )
                    }
                    disabled={!canGoNextReleasePage}
                    aria-label="Next releases"
                    title="Next releases"
                  >
                    ›
                  </button>
                )}

                {releasePageCount > 1 && (
                  <div className="release-carousel-status">
                    <span>{releasePage + 1}</span>
                    <span className="release-carousel-status-divider">/</span>
                    <span>{releasePageCount}</span>
                  </div>
                )}
              </>
            )}

          </div>

        </div>

      </section>


      {/* =====================================================
          FEATURED MUSIC / LOWZACK TRACK
      ===================================================== */}

      <section className="music-showcase">

        <div className="section-container">

          <div className="music-showcase-grid">


            {/* =================================================
                RELEASE HIGHLIGHTS
                MOST VIEWS + NEWEST
            ================================================= */}

            <div className="release-highlight-stack">

              {[
                {
                  label: "MOST VIEWS",
                  release: getMostViewedRelease(
                    releases,
                    youtubeViews
                  ),
                },
                {
                  label: "NEWEST",
                  release: getNewestRelease(releases),
                },
              ].map(({ label, release }) => {

                if (!release) {
                  return (
                    <div
                      className="featured-video release-highlight-card"
                      key={label}
                    >
                      <div className="featured-video-image">
                        <div className="release-grid-state">
                          {label === "MOST VIEWS"
                            ? youtubeViewsLoading
                              ? "UPDATING YOUTUBE VIEWS..."
                              : youtubeViewsError
                                ? "YOUTUBE VIEWS UNAVAILABLE"
                                : "NO YOUTUBE VIEWS"
                            : "NO RELEASES YET"}
                        </div>
                      </div>
                    </div>
                  );
                }

                const highlightThumbnail =
                  getReleaseThumbnail(release);

                const highlightTitle =
                  getTrackTitle(release);

                const highlightType =
                  getReleaseType(release);

                const highlightYear =
                  getReleaseYear(release);

                const highlightVideoId =
                  getReleaseYoutubeId(release);

                const highlightReleaseUrl =
                  `/releases?title=${encodeURIComponent(
                    highlightTitle
                  )}${release.id
                    ? `&releaseId=${encodeURIComponent(
                        release.id
                      )}`
                    : ""
                  }`;

                return (
                  <Link
                    key={`${label}-${release.id}`}
                    to={highlightReleaseUrl}
                    state={{
                      releaseId: release.id,
                      title: highlightTitle,
                      fromHomeWatchVideo: true,
                    }}
                    className="featured-video release-highlight-card"
                    aria-label={`${label}: ${highlightTitle}`}
                  >

                    <div className="featured-video-image">

                      {highlightThumbnail ? (
                        <img
                          src={highlightThumbnail}
                          alt={highlightTitle}
                        />
                      ) : (
                        <div className="release-cover-fallback">
                          LOWZACK
                        </div>
                      )}

                      <span
                        style={{
                          position: "absolute",
                          top: "14px",
                          left: "14px",
                          zIndex: 3,
                          padding: "6px 9px",
                          background: "#D4AF37",
                          color: "#050505",
                          fontSize: "9px",
                          fontWeight: 900,
                          letterSpacing: "1.5px",
                          lineHeight: 1,
                        }}
                      >
                        {label}
                      </span>

                      {highlightVideoId && (
                        <span className="featured-play">
                          ▶
                        </span>
                      )}

                      <div className="featured-video-bottom">

                        <span>
                          ◉
                        </span>

                        <strong>
                          {highlightTitle}
                        </strong>

                        <span>
                          →
                        </span>

                      </div>

                    </div>

                    <div
                      className="video-meta"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "12px",
                      }}
                    >

                      <span>
                        {highlightType}
                        {" · "}
                        {highlightYear}
                      </span>

                      <span>
                        {label === "MOST VIEWS"
                          ? formatReleaseViews(
                              release,
                              youtubeViews,
                              youtubeViewsLoading
                            )
                          : "LATEST RELEASE"}
                      </span>

                    </div>

                  </Link>
                );
              })}

            </div>


            {/* =================================================
                LATEST TRACKS
            ================================================= */}

            <div className="latest-tracks">

              <div className="tracks-header">

                <h2>
                  LOWZACK TRACK
                </h2>

                <Link
                  to="/discography"
                >
                  SEE ALL →
                </Link>

              </div>


              <div className="track-list">

                {lowzackTracks.length === 0 ? (
                  <div className="track-list-empty">
                    NO LOWZACK TRACKS YET
                  </div>
                ) : (
                  lowzackTracks.map(
                    (track) => (

                    <button
                      type="button"
                      className={`track-row ${activeTrack?.id ===
                        track.id
                        ? "active"
                        : ""
                        }`}
                      key={track.id}
                      onClick={() => {

                        if (!track.audioUrl && !track.youtubeId) {
                          return;
                        }

                        setIsPlayerMinimized(false);

                        setActiveTrack(
                          track
                        );

                      }}
                    >


                      <span className="track-number">
                        {String(
                          track.number
                        ).padStart(
                          2,
                          "0"
                        )}
                      </span>


                      <span className="track-title">
                        {track.title}
                      </span>


                      <span className="track-duration">
                        {track.duration}
                      </span>


                      <span className="track-play">
                        {!track.audioUrl && !track.youtubeId
                          ? "—"
                          : activeTrack?.id ===
                            track.id
                            ? "Ⅱ"
                            : "▶"}
                      </span>


                    </button>

                  )
                  )
                )}

              </div>

            </div>


            {/* =================================================
                QUOTE
            ================================================= */}

            <div className="artist-quote">

              <img
                src={artistQuote.image}
                alt="Lowzack"
              />


              <div className="artist-quote-overlay" />


              <div className="artist-quote-content">

                <span>
                  “
                </span>

                <p>
                  {artistQuote.quote}
                </p>

                <p className="artist-quote-subtitle">
                  {artistQuote.subtitle}
                </p>

                <small>
                  —{" "}
                  {artistQuote.author}
                </small>

              </div>

            </div>


          </div>

        </div>

      </section>
      
      {/* =====================================================
          TRACK / RELEASE PLAYER MODAL
      ===================================================== */}

      {activeTrack && (

        <div
          className={`track-modal ${
            isPlayerMinimized
              ? "track-modal-minimized"
              : ""
          }`}
          onClick={() => {
            if (!isPlayerMinimized) {
              setActiveTrack(null);
              setIsPlayerMinimized(false);
            }
          }}
        >

          <div
            className={`track-modal-inner ${
              isPlayerMinimized
                ? "track-modal-inner-minimized"
                : ""
            }`}
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <audio
              ref={audioRef}
              src={activeTrack.audioUrl || ""}
              preload="metadata"
              aria-hidden="true"
            />

            {isPlayerMinimized ? (

              <div className="track-mini-player">

                <div className="track-mini-cover">
                  <img
                    src={
                      activeTrack.cover ||
                      activeTrack.image ||
                      heroData.image
                    }
                    alt={activeTrack.title}
                  />
                </div>

                <div className="track-mini-info">
                  <strong>{activeTrack.title}</strong>
                  <span>
                    {activeTrack.artist ||
                      "LOWZACK"}
                  </span>
                </div>

                <button
                  type="button"
                  className="track-mini-play"
                  onClick={togglePlayback}
                  aria-label={
                    isPlaying
                      ? "Pause"
                      : "Play"
                  }
                >
                  {isPlaying ? "Ⅱ" : "▶"}
                </button>

                <button
                  type="button"
                  className="track-mini-expand"
                  onClick={() =>
                    setIsPlayerMinimized(false)
                  }
                  aria-label="Expand player"
                  title="Expand player"
                >
                  ↖
                </button>

                <button
                  type="button"
                  className="track-mini-close"
                  onClick={() => {
                    setActiveTrack(null);
                    setIsPlayerMinimized(false);
                  }}
                  aria-label="Close player"
                  title="Close player"
                >
                  ×
                </button>

                <div
                  className="track-mini-progress"
                  style={{
                    "--mini-progress":
                      duration
                        ? `${Math.min(
                            100,
                            (currentTime / duration) * 100
                          )}%`
                        : "0%",
                  }}
                />

              </div>

            ) : (

              <>

                <button
                  type="button"
                  className="track-modal-minimize"
                  onClick={() =>
                    setIsPlayerMinimized(true)
                  }
                  aria-label="Minimize player"
                  title="Minimize player"
                >
                  ↘
                </button>

                <button
                  type="button"
                  className="track-modal-close"
                  onClick={() => {
                    setActiveTrack(null);
                    setIsPlayerMinimized(false);
                  }}
                  aria-label="Close player"
                >
                  ×
                </button>

                <div className="track-modal-cover">

                  <img
                    src={
                      activeTrack.cover ||
                      activeTrack.image ||
                      heroData.image
                    }
                    alt={activeTrack.title}
                  />

                </div>

                <div className="track-modal-content">

                  <span className="track-modal-eyebrow">
                    NOW PLAYING
                  </span>

                  <h2>
                    {activeTrack.title}
                  </h2>

                  <p>
                    {activeTrack.artist ||
                      "LOWZACK"}
                  </p>

                  {activeTrack.audioUrl ? (

                    <div className="custom-audio-player">

                      <button
                        type="button"
                        className="custom-audio-play"
                        onClick={togglePlayback}
                        aria-label={
                          isPlaying
                            ? "Pause"
                            : "Play"
                        }
                      >
                        {isPlaying ? "Ⅱ" : "▶"}
                      </button>

                      <div className="custom-audio-progress">

                        <input
                          type="range"
                          min="0"
                          max={duration || 0}
                          step="0.01"
                          value={
                            Math.min(
                              currentTime,
                              duration || 0
                            )
                          }
                          style={{
                            "--audio-progress":
                              duration
                                ? `${Math.min(
                                    100,
                                    (currentTime / duration) * 100
                                  )}%`
                                : "0%",
                          }}
                          onChange={handleSeek}
                          aria-label="Audio progress"
                        />

                      </div>

                      <div className="custom-audio-volume">

                        <button
                          type="button"
                          className="custom-audio-volume-button"
                          onClick={() => changeVolume(-0.1)}
                          disabled={volume <= 0}
                          aria-label="Decrease volume"
                          title="Decrease volume"
                        >
                          −
                        </button>

                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={volume}
                          style={{
                            "--audio-volume":
                              `${Math.round(volume * 100)}%`,
                          }}
                          onChange={handleVolumeChange}
                          aria-label={`Volume ${Math.round(volume * 100)} percent`}
                        />

                        <button
                          type="button"
                          className="custom-audio-volume-button"
                          onClick={() => changeVolume(0.1)}
                          disabled={volume >= 1}
                          aria-label="Increase volume"
                          title="Increase volume"
                        >
                          +
                        </button>

                      </div>

                      <span className="custom-audio-time">
                        {formatTime(currentTime)}
                      </span>

                    </div>

                  ) : (

                    <div className="custom-audio-unavailable">

                      <span>
                        DIRECT AUDIO NOT AVAILABLE
                      </span>

                      <small>
                        MUSIC AUDIO membutuhkan file audio langsung.
                      </small>

                    </div>

                  )}

                </div>

              </>

            )}

          </div>

        </div>

      )}


    </main>
  );
}


export default Home;