import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  collection,
  onSnapshot,
} from "firebase/firestore";

import { db } from "../firebase";

import {
  useSearchParams,
} from "react-router-dom";

import "../styles/Releases.css";


/* =========================================================
   LOWZACK
   RELEASES
   FIRESTORE SOURCE
========================================================= */

/*
 * Releases mengambil data langsung dari collection:
 *
 * Firestore
 * └── karya
 *      ├── document 1
 *      ├── document 2
 *      └── document 3
 *
 * BUKAN dari collection "releases".
 */

const WORKS_COLLECTION = "karya";

const YOUTUBE_API_KEY =
  import.meta.env.VITE_YOUTUBE_API_KEY || "";

const getYoutubeViews = async (videoIds) => {
  const uniqueIds = [...new Set(videoIds.filter(Boolean))];

  if (!YOUTUBE_API_KEY || uniqueIds.length === 0) {
    return {};
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${uniqueIds.join(",")}&key=${YOUTUBE_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();

    return (data.items || []).reduce((result, item) => {
      result[item.id] = Number(item.statistics?.viewCount || 0);
      return result;
    }, {});
  } catch (apiError) {
    console.error("LOWZACK YouTube views error:", apiError);
    return {};
  }
};



/* =========================================================
   RELEASE CATEGORIES
========================================================= */

const RELEASE_CATEGORIES = [
  {
    value: "music-video",
    label: "MUSIC VIDEO",
  },
  {
    value: "music",
    label: "MUSIC",
  },
  {
    value: "video-lyric",
    label: "LYRIC VIDEO",
  },
  {
    value: "live-performance",
    label: "LIVE PERFORMANCE",
  },
];


/* =========================================================
   CATEGORY LABEL
========================================================= */

const getCategoryLabel = (
  category
) => {
  switch (category) {
    case "music":
      return "MUSIC";

    case "music-video":
      return "MUSIC VIDEO";

    case "video-lyric":
      return "LYRIC VIDEO";

    case "live-performance":
      return "LIVE PERFORMANCE";

    default:
      return "RELEASES";
  }
};


/* =========================================================
   SUBCATEGORY LABEL
========================================================= */

const getSubcategoryLabel = (
  subcategory
) => {
  switch (subcategory) {
    case "single":
      return "SINGLE";

    case "album":
      return "ALBUM";

    default:
      return "";
  }
};


/* =========================================================
   YOUTUBE ID EXTRACTOR
========================================================= */

const extractYoutubeId = (
  url = ""
) => {
  if (!url) {
    return "";
  }

  const value =
    String(url).trim();

  if (!value) {
    return "";
  }

  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/i,
    /youtube\.com\/embed\/([^?&]+)/i,
    /youtube\.com\/shorts\/([^?&]+)/i,
    /youtu\.be\/([^?&]+)/i,
  ];

  for (
    const pattern of patterns
  ) {
    const match =
      value.match(pattern);

    if (
      match?.[1]
    ) {
      return match[1];
    }
  }

  /*
   * Support apabila Firestore
   * menyimpan videoId langsung.
   */

  if (
    /^[a-zA-Z0-9_-]{6,}$/.test(
      value
    ) &&
    !value.includes("/") &&
    !value.includes(".")
  ) {
    return value;
  }

  return "";
};


/* =========================================================
   YOUTUBE EMBED URL
========================================================= */

const getYoutubeEmbedUrl = (
  videoId
) => {
  if (!videoId) {
    return "";
  }

  return (
    `https://www.youtube.com/embed/${videoId}` +
    "?autoplay=1" +
    "&rel=0" +
    "&modestbranding=1"
  );
};


/* =========================================================
   YOUTUBE WATCH URL
========================================================= */

const getYoutubeWatchUrl = (
  videoId
) => {
  if (!videoId) {
    return "#";
  }

  return (
    `https://www.youtube.com/watch?v=${videoId}`
  );
};


/* =========================================================
   THUMBNAIL
========================================================= */

const getThumbnail = (
  release
) => {

  /*
   * PRIORITAS 1
   * thumbnail yang disimpan di Firestore.
   */

  if (
    release?.thumbnail
  ) {
    return release.thumbnail;
  }


  /*
   * PRIORITAS 2
   * thumbnail YouTube berdasarkan videoId.
   */

  const videoId =
    release?.videoId ||
    extractYoutubeId(
      release?.youtubeUrl
    );

  if (videoId) {
    return (
      `https://img.youtube.com/vi/` +
      `${videoId}/maxresdefault.jpg`
    );
  }

  return "";
};


/* =========================================================
   GET YEAR
========================================================= */

const getYear = (
  release
) => {

  /*
   * Prioritas:
   * year dari Firestore.
   */

  if (
    release?.year
  ) {
    return String(
      release.year
    );
  }


  /*
   * Fallback:
   * ambil tahun dari createdAt.
   */

  if (
    release?.createdAt?.toDate
  ) {
    return String(
      release.createdAt
        .toDate()
        .getFullYear()
    );
  }

  return "";
};


/* =========================================================
   SORT RELEASES
========================================================= */

/*
 * URUTAN RELEASE:
 *
 * 1. Release yang PALING TERAKHIR ditambahkan Admin
 *    tampil PALING ATAS.
 *
 * 2. Urutan menggunakan createdAt dari Firestore,
 *    bukan berdasarkan tahun release.
 *
 * Jadi contoh:
 *
 * Admin menambahkan:
 * A -> 2024
 * B -> 2026
 * C -> 2025
 *
 * Maka tampilan:
 * C
 * B
 * A
 *
 * sesuai urutan waktu Admin menambahkan data.
 *
 * Jika createdAt tidak tersedia pada sebuah document,
 * document tersebut ditempatkan setelah document yang
 * memiliki createdAt.
 */

const sortReleases = (
  items
) => {

  return [
    ...items,
  ].sort(
    (
      first,
      second
    ) => {

      const createdA =
        first?.createdAt?.toMillis?.() ||
        0;

      const createdB =
        second?.createdAt?.toMillis?.() ||
        0;


      /*
       * PALING TERAKHIR DITAMBAHKAN
       * tampil paling atas.
       */

      if (
        createdA !== createdB
      ) {
        return (
          createdB -
          createdA
        );
      }


      /*
       * Kalau createdAt sama-sama tidak ada
       * atau nilainya sama, pertahankan
       * urutan Firestore snapshot.
       *
       * Return 0 = tidak mengubah urutan
       * relative item tersebut.
       */

      return 0;
    }
  );
};


/* =========================================================
   RELEASES
========================================================= */

function Releases() {

  /* =======================================================
     STATE
  ======================================================= */

  const [
    releases,
    setReleases,
  ] = useState([]);


  const [
    activeRelease,
    setActiveRelease,
  ] = useState(null);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState("");

  const [
    activeFilter,
    setActiveFilter,
  ] = useState("latest");

  const [
    youtubeViews,
    setYoutubeViews,
  ] = useState({});

  const [
    viewsLoading,
    setViewsLoading,
  ] = useState(false);


  const [
    searchParams,
  ] = useSearchParams();

  const [
    highlightedReleaseId,
    setHighlightedReleaseId,
  ] = useState("");


  /* =======================================================
     FIRESTORE REALTIME
     
     SOURCE:
     collection "karya"
     
     POLA SAMA DENGAN KARYA.JSX
  ======================================================= */

  useEffect(() => {

    setLoading(true);
    setError("");


    /*
     * Ambil collection "karya"
     */

    const worksRef =
      collection(
        db,
        WORKS_COLLECTION
      );


    /*
     * Realtime listener
     */

    const unsubscribe =
      onSnapshot(

        worksRef,

        (snapshot) => {

          /*
           * Convert semua document
           * Firestore menjadi object.
           *
           * id document juga ikut disimpan.
           */

          const firestoreWorks =
            snapshot.docs.map(
              (
                document
              ) => ({
                id:
                  document.id,

                ...document.data(),
              })
            );


          /*
           * Sort data
           */

          setReleases(
            sortReleases(
              firestoreWorks
            )
          );

          const videoIds =
            firestoreWorks
              .map(
                (release) =>
                  release?.videoId ||
                  extractYoutubeId(
                    release?.youtubeUrl
                  )
              )
              .filter(Boolean);

          setViewsLoading(true);

          getYoutubeViews(videoIds)
            .then((viewMap) => {
              setYoutubeViews(viewMap);
            })
            .finally(() => {
              setViewsLoading(false);
            });


          setLoading(false);

        },


        (snapshotError) => {

          console.error(
            "Karya Firestore error:",
            snapshotError
          );


          setError(
            "Unable to load releases right now."
          );


          setLoading(false);

        }
      );


    /*
     * Cleanup listener
     */

    return () => {
      unsubscribe();
    };

  }, []);


  /* =======================================================
     FILTER + SORT
  ======================================================= */

  const getViews = (release) => {
    const videoId =
      release?.videoId ||
      extractYoutubeId(
        release?.youtubeUrl
      );

    return youtubeViews[videoId] || 0;
  };

  const filteredReleases = useMemo(() => {
    const items = [...releases];

    if (activeFilter === "popular") {
      return items.sort((a, b) => {
        const viewsA = getViews(a);
        const viewsB = getViews(b);

        if (viewsA !== viewsB) {
          return viewsB - viewsA;
        }

        const createdA =
          a?.createdAt?.toMillis?.() || 0;

        const createdB =
          b?.createdAt?.toMillis?.() || 0;

        return createdB - createdA;
      });
    }

    if (activeFilter === "alphabetical") {
      return items.sort((a, b) =>
        String(a?.title || "").localeCompare(
          String(b?.title || ""),
          "en",
          { sensitivity: "base" }
        )
      );
    }

    // DEFAULT: TERBARU
    return sortReleases(items);
  }, [
    releases,
    activeFilter,
    youtubeViews,
  ]);


  /* =======================================================
     GROUP RELEASES BY CATEGORY
  ======================================================= */

  const groupedReleases =
    useMemo(() => {

      const groups = {};


      RELEASE_CATEGORIES.forEach(
        (
          category
        ) => {

          groups[
            category.value
          ] =
            filteredReleases.filter(
              (
                release
              ) =>
                release.category ===
                category.value
            );

        }
      );


      return groups;

    }, [
      filteredReleases,
    ]);


  /* =======================================================
     CATEGORY CAROUSEL

     Desktop:
     3 cards x 2 rows = 6 releases per category page.

     If a category contains more than 6 releases,
     arrows appear and slide to the next/previous page.

     The page size is recalculated on resize so the layout
     stays synchronized without requiring a refresh.
  ======================================================= */

  const getCategoryPageSize = () => {
    if (typeof window === "undefined") {
      return 6;
    }

    if (window.innerWidth <= 700) {
      return 4;
    }

    if (window.innerWidth <= 1100) {
      return 4;
    }

    return 6;
  };

  const [categoryPageSize, setCategoryPageSize] = useState(
    getCategoryPageSize
  );

  const [categoryPages, setCategoryPages] = useState({});

  useEffect(() => {
    const handleCategoryPageSize = () => {
      const nextSize = getCategoryPageSize();

      setCategoryPageSize((currentSize) => {
        if (currentSize === nextSize) {
          return currentSize;
        }

        setCategoryPages({});
        return nextSize;
      });
    };

    handleCategoryPageSize();

    window.addEventListener(
      "resize",
      handleCategoryPageSize
    );

    window.addEventListener(
      "orientationchange",
      handleCategoryPageSize
    );

    const visualViewport = window.visualViewport;

    if (visualViewport) {
      visualViewport.addEventListener(
        "resize",
        handleCategoryPageSize
      );
    }

    return () => {
      window.removeEventListener(
        "resize",
        handleCategoryPageSize
      );

      window.removeEventListener(
        "orientationchange",
        handleCategoryPageSize
      );

      if (visualViewport) {
        visualViewport.removeEventListener(
          "resize",
          handleCategoryPageSize
        );
      }
    };
  }, []);

  const getCategoryPageCount = (categoryValue) => {
    const items =
      groupedReleases[categoryValue] || [];

    return Math.max(
      1,
      Math.ceil(
        items.length /
          categoryPageSize
      )
    );
  };

  const getCategoryPage = (categoryValue) =>
    Math.min(
      categoryPages[categoryValue] || 0,
      getCategoryPageCount(categoryValue) - 1
    );

  const getVisibleCategoryReleases = (
    categoryValue
  ) => {
    const items =
      groupedReleases[categoryValue] || [];

    const page =
      getCategoryPage(categoryValue);

    const start =
      page *
      categoryPageSize;

    return items.slice(
      start,
      start + categoryPageSize
    );
  };

  const goToCategoryPage = (
    categoryValue,
    direction
  ) => {
    const pageCount =
      getCategoryPageCount(
        categoryValue
      );

    setCategoryPages((currentPages) => {
      const currentPage = Math.min(
        currentPages[categoryValue] || 0,
        pageCount - 1
      );

      const nextPage = Math.min(
        pageCount - 1,
        Math.max(
          0,
          currentPage + direction
        )
      );

      return {
        ...currentPages,
        [categoryValue]: nextPage,
      };
    });
  };

  useEffect(() => {
    setCategoryPages((currentPages) => {
      let changed = false;
      const nextPages = {
        ...currentPages,
      };

      RELEASE_CATEGORIES.forEach(
        (category) => {
          const pageCount =
            Math.max(
              1,
              Math.ceil(
                (
                  groupedReleases[
                    category.value
                  ] || []
                ).length /
                  categoryPageSize
              )
            );

          const currentPage =
            nextPages[
              category.value
            ] || 0;

          const safePage = Math.min(
            currentPage,
            pageCount - 1
          );

          if (
            safePage !==
            currentPage
          ) {
            nextPages[
              category.value
            ] = safePage;
            changed = true;
          }
        }
      );

      return changed
        ? nextPages
        : currentPages;
    });
  }, [
    groupedReleases,
    categoryPageSize,
  ]);

  /* =======================================================
     OPEN FROM HOME — HIGHLIGHT ONLY

     /releases?releaseId=...&title=...

     Tidak membuka modal dan tidak menjalankan video.
     Release hanya diberi efek pulse lalu dibawa ke posisi
     yang terlihat oleh user.
  ======================================================= */

  useEffect(() => {
    if (loading || filteredReleases.length === 0) {
      return;
    }

    const requestedId =
      searchParams.get("releaseId") || "";

    const requestedTitle =
      searchParams.get("title") || "";

    if (!requestedId && !requestedTitle) {
      return;
    }

    const normalizedTitle =
      requestedTitle.trim().toLowerCase();

    const target =
      (requestedId
        ? filteredReleases.find(
            (release) =>
              release.id === requestedId
          )
        : null) ||
      (normalizedTitle
        ? filteredReleases.find(
            (release) =>
              String(release?.title || "")
                .trim()
                .toLowerCase() === normalizedTitle
          )
        : null);

    if (!target) {
      return;
    }

    setHighlightedReleaseId(target.id);

    const scrollTimer = window.setTimeout(() => {
      const element = document.getElementById(
        `release-${target.id}`
      );

      if (!element) {
        return;
      }

      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      /*
       * IMPORTANT:
       * The pulse is triggered directly with the Web Animations API.
       * This does not depend on CSS @keyframes being applied.
       * Therefore the selected card visibly pulses even if another
       * stylesheet overrides animation rules.
       */
      const thumbnail =
        element.querySelector(
          ".karya-thumbnail"
        );

      const thumbnailImage =
        element.querySelector(
          ".karya-thumbnail img"
        );

      /*
       * CLEAN PULSE
       *
       * Do NOT animate the whole card.
       * Do NOT animate the thumbnail container.
       * This keeps the grid/card boundaries perfectly stable.
       *
       * The image pulses INSIDE .karya-thumbnail, which already
       * has overflow: hidden, so nothing can stick outside the
       * thumbnail and create stray lines.
       */
      const thumbnailImageAnimation =
        thumbnailImage?.animate(
          [
            {
              transform: "scale(1)",
              opacity: 1,
              filter:
                "grayscale(0%) contrast(1) brightness(1)",
            },
            {
              transform: "scale(1.035)",
              opacity: 0.82,
              filter:
                "grayscale(0%) contrast(1.08) brightness(1.18)",
              offset: 0.25,
            },
            {
              transform: "scale(1.055)",
              opacity: 1,
              filter:
                "grayscale(0%) contrast(1.12) brightness(1.28)",
              offset: 0.5,
            },
            {
              transform: "scale(1.035)",
              opacity: 0.82,
              filter:
                "grayscale(0%) contrast(1.08) brightness(1.18)",
              offset: 0.75,
            },
            {
              transform: "scale(1)",
              opacity: 1,
              filter:
                "grayscale(0%) contrast(1) brightness(1)",
            },
          ],
          {
            duration: 800,
            iterations: 8,
            easing: "ease-in-out",
            fill: "both",
          }
        );

      /*
       * Pulse only the existing thumbnail border color.
       * No pseudo-element, no negative inset, no shadow,
       * no element scaling outside the grid.
       */
      const thumbnailBorderAnimation =
        thumbnail?.animate(
          [
            {
              borderColor:
                "rgba(255, 255, 255, 0.075)",
            },
            {
              borderColor: "#D4AF37",
              offset: 0.25,
            },
            {
              borderColor: "#F0D878",
              offset: 0.5,
            },
            {
              borderColor: "#D4AF37",
              offset: 0.75,
            },
            {
              borderColor:
                "rgba(255, 255, 255, 0.075)",
            },
          ],
          {
            duration: 800,
            iterations: 8,
            easing: "ease-in-out",
            fill: "both",
          }
        );

      /*
       * Keep the play button completely inside the thumbnail.
       * Its pulse is small enough not to cross the card boundary.
       */
      const playButton =
        element.querySelector(
          ".karya-play"
        );

      const playAnimation =
        playButton?.animate(
          [
            {
              transform:
                "translate(-50%, -50%) scale(0.96)",
            },
            {
              transform:
                "translate(-50%, -50%) scale(1.12)",
              offset: 0.5,
            },
            {
              transform:
                "translate(-50%, -50%) scale(0.96)",
            },
          ],
          {
            duration: 800,
            iterations: 8,
            easing: "ease-in-out",
            fill: "both",
          }
        );

      /*
       * Clean up the Web Animations API objects when the
       * highlight is removed or the component unmounts.
       */
      element.__lowzackPulseAnimations = [
        thumbnailImageAnimation,
        thumbnailBorderAnimation,
        playAnimation,
      ].filter(Boolean);
    }, 180);

    const clearHighlightTimer = window.setTimeout(() => {
      setHighlightedReleaseId("");
    }, 7000);

    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(clearHighlightTimer);

      const element = document.getElementById(
        `release-${target.id}`
      );

      if (element?.__lowzackPulseAnimations) {
        element.__lowzackPulseAnimations.forEach(
          (animation) => {
            try {
              animation.cancel();
            } catch {
              /* ignore cleanup errors */
            }
          }
        );

        delete element.__lowzackPulseAnimations;
      }
    };
  }, [
    loading,
    filteredReleases,
    searchParams,
  ]);


  /* =======================================================
     TOTAL RELEASE COUNT
  ======================================================= */

  const releaseCount =
    filteredReleases.length;


  /* =======================================================
     OPEN RELEASE
  ======================================================= */

  const openRelease = (
    release
  ) => {

    const videoId =
      release?.videoId ||
      extractYoutubeId(
        release?.youtubeUrl
      );


    /*
     * Kalau tidak mempunyai
     * videoId, jangan buka modal.
     */

    if (!videoId) {
      return;
    }


    setActiveRelease({

      ...release,

      videoId,

    });

  };


  /* =======================================================
     CLOSE RELEASE
  ======================================================= */

  const closeRelease = () => {

    setActiveRelease(
      null
    );

  };


  /* =======================================================
     ESCAPE KEY
  ======================================================= */

  useEffect(() => {

    const handleKeyDown = (
      event
    ) => {

      if (
        event.key ===
        "Escape"
      ) {

        setActiveRelease(
          null
        );

      }

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

    if (
      activeRelease
    ) {

      document.body.style.overflow =
        "hidden";

    } else {

      document.body.style.overflow =
        "";

    }


    return () => {

      document.body.style.overflow =
        "";

    };

  }, [
    activeRelease,
  ]);


  /* =======================================================
     RELEASE CARD
  ======================================================= */

  const renderReleaseCard = (
    release
  ) => {

    const thumbnail =
      getThumbnail(
        release
      );


    const videoId =
      release?.videoId ||
      extractYoutubeId(
        release?.youtubeUrl
      );


    const year =
      getYear(
        release
      );


    const categoryLabel =
      getCategoryLabel(
        release?.category
      );


    const subcategoryLabel =
      getSubcategoryLabel(
        release?.subcategory
      );


    const hasVideo =
      Boolean(
        videoId
      );


    return (

      <article
        id={`release-${release.id}`}
        key={
          release.id
        }
        className={`karya-card ${
          highlightedReleaseId === release.id
            ? "karya-card-highlighted"
            : ""
        }`}
        data-release-highlighted={
          highlightedReleaseId === release.id
            ? "true"
            : "false"
        }
      >


        {/* =================================================
            THUMBNAIL
        ================================================= */}

        {hasVideo ? (

          <button
            type="button"
            className="karya-thumbnail"
            onClick={() =>
              openRelease(
                release
              )
            }
            aria-label={
              `Open ${
                release.title ||
                "release"
              }`
            }
          >

            {thumbnail ? (

              <img
                src={
                  thumbnail
                }
                alt={
                  `${
                    release.title ||
                    "Release"
                  } - ${
                    release.artist ||
                    "LOWZACK"
                  }`
                }
                loading="lazy"
              />

            ) : (

              <div className="karya-no-image">

                <span>
                  LOWZACK
                </span>

                <strong>
                  {
                    categoryLabel
                  }
                </strong>

              </div>

            )}


            <div
              className="
                karya-image-overlay
              "
            />


            <span className="karya-play">

              <span className="karya-play-icon">
                ▶
              </span>

            </span>


            <span className="karya-card-label">

              {
                categoryLabel
              }

            </span>

          </button>

        ) : (

          <div
            className="
              karya-thumbnail
              karya-thumbnail-static
            "
          >

            {thumbnail ? (

              <img
                src={
                  thumbnail
                }
                alt={
                  `${
                    release.title ||
                    "Release"
                  } - ${
                    release.artist ||
                    "LOWZACK"
                  }`
                }
                loading="lazy"
              />

            ) : (

              <div className="karya-no-image">

                <span>
                  LOWZACK
                </span>

                <strong>
                  {
                    categoryLabel
                  }
                </strong>

              </div>

            )}


            <div
              className="
                karya-image-overlay
              "
            />


            <span className="karya-card-label">

              {
                categoryLabel
              }

            </span>

          </div>

        )}


        {/* =================================================
            CARD INFO
        ================================================= */}

        <div className="karya-card-info">


          <div className="karya-card-main">


            <div className="karya-title-row">

              <h2>

                {
                  release.title ||
                  "UNTITLED"
                }

              </h2>

            </div>


            <span className="karya-artist">

              {
                release.artist ||
                "LOWZACK"
              }

            </span>

            {videoId && (
              <span className="karya-views">
                {getViews(
                  release
                ).toLocaleString("en-US")} VIEWS
              </span>
            )}


            {/* =============================================
                ALBUM NAME
            ============================================= */}

            {release.albumName && (

              <span className="karya-album-name">

                {
                  release.albumName
                }

              </span>

            )}

          </div>


          {/* =================================================
              META
          ================================================= */}

          <div className="karya-card-meta">


            {year && (

              <span>
                {
                  year
                }
              </span>

            )}


            {subcategoryLabel ? (

              <span>
                {
                  subcategoryLabel
                }
              </span>

            ) : (

              <span>
                {
                  categoryLabel
                }
              </span>

            )}

          </div>

        </div>


        {/* =================================================
            DESCRIPTION
        ================================================= */}

        {release.description && (

          <p className="karya-card-description">

            {
              release.description
            }

          </p>

        )}

      </article>

    );

  };


  /* =======================================================
     CATEGORY SECTION
  ======================================================= */

  const renderCategorySection = (
    category
  ) => {

    const categoryReleases =
      groupedReleases[
        category.value
      ] || [];

    const categoryIndex =
      RELEASE_CATEGORIES.indexOf(
        category
      ) + 1;

    const categoryPage =
      getCategoryPage(
        category.value
      );

    const categoryPageCount =
      getCategoryPageCount(
        category.value
      );

    const visibleCategoryReleases =
      getVisibleCategoryReleases(
        category.value
      );

    const canGoPrevious =
      categoryPage > 0;

    const canGoNext =
      categoryPage <
      categoryPageCount - 1;

    return (

      <section
        key={
          category.value
        }
        className="
          karya-category-section
        "
      >

        {/* =================================================
            CATEGORY HEADER
        ================================================= */}

        <div className="karya-category-heading">

          <div className="karya-category-title-wrap">

            <span className="karya-category-number">

              {String(
                categoryIndex
              ).padStart(
                2,
                "0"
              )}

            </span>

            <h2>
              {
                category.label
              }
            </h2>

          </div>

          <div className="karya-category-heading-right">

            <span className="karya-category-count">

              {String(
                categoryReleases.length
              ).padStart(
                2,
                "0"
              )}

            </span>

            {categoryPageCount > 1 && (
              <div className="karya-category-arrows">

                <button
                  type="button"
                  className="karya-category-arrow"
                  onClick={() =>
                    goToCategoryPage(
                      category.value,
                      -1
                    )
                  }
                  disabled={!canGoPrevious}
                  aria-label={`Previous ${category.label}`}
                  title={`Previous ${category.label}`}
                >
                  ‹
                </button>

                <span className="karya-category-page-status">
                  {categoryPage + 1}
                  <span>/</span>
                  {categoryPageCount}
                </span>

                <button
                  type="button"
                  className="karya-category-arrow"
                  onClick={() =>
                    goToCategoryPage(
                      category.value,
                      1
                    )
                  }
                  disabled={!canGoNext}
                  aria-label={`Next ${category.label}`}
                  title={`Next ${category.label}`}
                >
                  ›
                </button>

              </div>
            )}

          </div>

        </div>

        {/* =================================================
            CATEGORY LINE
        ================================================= */}

        <div
          className="
            karya-category-line
          "
        />

        {/* =================================================
            CATEGORY CONTENT
        ================================================= */}

        {categoryReleases.length > 0 ? (

          <div className="karya-category-carousel">

            {categoryPageCount > 1 && (
              <button
                type="button"
                className="
                  karya-category-slide-arrow
                  karya-category-slide-arrow-prev
                "
                onClick={() =>
                  goToCategoryPage(
                    category.value,
                    -1
                  )
                }
                disabled={!canGoPrevious}
                aria-label={`Previous ${category.label} releases`}
              >
                ‹
              </button>
            )}

            <div className="karya-grid">

              {visibleCategoryReleases.map(
                (
                  release
                ) =>
                  renderReleaseCard(
                    release
                  )
              )}

            </div>

            {categoryPageCount > 1 && (
              <button
                type="button"
                className="
                  karya-category-slide-arrow
                  karya-category-slide-arrow-next
                "
                onClick={() =>
                  goToCategoryPage(
                    category.value,
                    1
                  )
                }
                disabled={!canGoNext}
                aria-label={`Next ${category.label} releases`}
              >
                ›
              </button>
            )}

          </div>

        ) : (

          <div className="karya-category-empty">

            <span>
              NO RELEASES
            </span>

            <small>
              Belum ada release
              pada kategori ini.
            </small>

          </div>

        )}

      </section>

    );

  };


  /* =======================================================
     PAGE
  ======================================================= */

  return (

    <main className="lowzack-karya-page">


      {/* ===================================================
          HEADER
      =================================================== */}

      <section className="karya-header">

        <div className="karya-header-inner">


          <div className="karya-heading">


            <span className="karya-eyebrow">
              LOWZACK
            </span>


            <h1>
              RELEASES
            </h1>


            <p>
              Music, visuals, performances,
              and selected releases from Lowzack.
            </p>


          </div>


          {/* =================================================
              TOTAL COUNT
          ================================================= */}

          <div className="karya-count">

            <span>

              {String(
                releaseCount
              ).padStart(
                2,
                "0"
              )}

            </span>


            <small>
              RELEASES
            </small>

          </div>


        </div>

      </section>


      {/* ===================================================
          FILTER
      =================================================== */}

      <section className="karya-filter-section">
        <div className="karya-container">
          <div className="karya-filter-bar">

            <span className="karya-filter-label">
              SORT BY
            </span>

            <div className="karya-filter-buttons">

              <button
                type="button"
                className={
                  activeFilter === "latest"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveFilter("latest")
                }
              >
                TERBARU
              </button>

              <button
                type="button"
                className={
                  activeFilter === "popular"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveFilter("popular")
                }
              >
                TERPOPULER
              </button>

              <button
                type="button"
                className={
                  activeFilter === "alphabetical"
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setActiveFilter("alphabetical")
                }
              >
                ALFABET (A-Z)
              </button>

            </div>

            {activeFilter === "popular" &&
              viewsLoading && (
                <span className="karya-filter-status">
                  UPDATING VIEWS...
                </span>
              )}

          </div>
        </div>
      </section>

      {/* ===================================================
          LOADING
      =================================================== */}

      {loading && (

        <section className="karya-section">

          <div className="karya-container">

            <div className="karya-state">

              <div className="karya-loader" />

              <span>
                LOADING RELEASES
              </span>

            </div>

          </div>

        </section>

      )}


      {/* ===================================================
          ERROR
      =================================================== */}

      {!loading &&
        error && (

          <section className="karya-section">

            <div className="karya-container">

              <div
                className="
                  karya-state
                  karya-error
                "
              >

                <span>
                  {
                    error
                  }
                </span>

              </div>

            </div>

          </section>

        )}


      {/* ===================================================
          EMPTY
      =================================================== */}

      {!loading &&
        !error &&
        filteredReleases.length === 0 && (

          <section className="karya-section">

            <div className="karya-container">

              <div
                className="
                  karya-state
                  karya-empty
                "
              >

                <span>
                  NO RELEASES FOUND
                </span>

                <small>
                  Belum ada release
                  yang dipublikasikan.
                </small>

              </div>

            </div>

          </section>

        )}


      {/* ===================================================
          RELEASE CATEGORY SECTIONS
      =================================================== */}

      {!loading &&
        !error &&
        filteredReleases.length > 0 && (

          <section className="karya-section">

            <div className="karya-container">

              <div className="karya-sections">

                {RELEASE_CATEGORIES.map(
                  (
                    category
                  ) =>
                    renderCategorySection(
                      category
                    )
                )}

              </div>

            </div>

          </section>

        )}


      {/* ===================================================
          YOUTUBE MODAL
      =================================================== */}

      {activeRelease && (

        <div
          className="karya-modal"
          role="dialog"
          aria-modal="true"
          aria-label={
            `${
              activeRelease.title ||
              "Release"
            } video player`
          }
          onMouseDown={(
            event
          ) => {

            if (
              event.target ===
              event.currentTarget
            ) {

              closeRelease();

            }

          }}
        >


          <div className="karya-modal-inner">


            {/* =============================================
                CLOSE
            ============================================= */}

            <button
              type="button"
              className="karya-modal-close"
              onClick={
                closeRelease
              }
              aria-label="Close video"
            >
              ×
            </button>


            {/* =============================================
                VIDEO PLAYER
            ============================================= */}

            <div className="karya-player">

              <iframe
                src={
                  getYoutubeEmbedUrl(
                    activeRelease.videoId
                  )
                }
                title={
                  `${
                    activeRelease.title ||
                    "Release"
                  } - ${
                    activeRelease.artist ||
                    "LOWZACK"
                  }`
                }
                allow="
                  autoplay;
                  encrypted-media;
                  picture-in-picture;
                  fullscreen
                "
                allowFullScreen
                referrerPolicy="
                  strict-origin-when-cross-origin
                "
              />

            </div>


            {/* =============================================
                MODAL INFO
            ============================================= */}

            <div className="karya-modal-info">


              <div className="karya-modal-details">


                <span className="karya-modal-category">

                  {
                    getCategoryLabel(
                      activeRelease.category
                    )
                  }


                  {activeRelease.subcategory && (

                    <>
                      {" · "}

                      {
                        getSubcategoryLabel(
                          activeRelease.subcategory
                        )
                      }
                    </>

                  )}

                </span>


                <h2>

                  {
                    activeRelease.title ||
                    "UNTITLED"
                  }

                </h2>


                <p>

                  {
                    activeRelease.artist ||
                    "LOWZACK"
                  }


                  {getYear(
                    activeRelease
                  ) && (

                    <>
                      {" · "}

                      {
                        getYear(
                          activeRelease
                        )
                      }
                    </>

                  )}

                </p>


                {/* =========================================
                    ALBUM NAME
                ========================================= */}

                {activeRelease.albumName && (

                  <p>

                    {
                      activeRelease.albumName
                    }

                  </p>

                )}


                {/* =========================================
                    DESCRIPTION
                ========================================= */}

                {activeRelease.description && (

                  <div className="
                    karya-modal-description
                  ">

                    {
                      activeRelease.description
                    }

                  </div>

                )}

              </div>


              {/* =========================================
                  YOUTUBE LINK
              ========================================= */}

              {activeRelease.videoId && (

                <a
                  href={
                    getYoutubeWatchUrl(
                      activeRelease.videoId
                    )
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="
                    karya-youtube-link
                  "
                >

                  WATCH ON YOUTUBE

                  <span>
                    ↗
                  </span>

                </a>

              )}

            </div>

          </div>

        </div>

      )}

    </main>

  );
}


export default Releases;