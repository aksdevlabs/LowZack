import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  collection,
  onSnapshot,
} from "firebase/firestore";

import {
  db,
} from "../firebase";

import "../styles/DISCOGRAPHY.css";

/*
  LOWZACK — DISCOGRAPHY

  SOURCE:
  Firestore / Discography

  Data managed from AdminDiscography.

  Firestore schema:
  {
    JudulLagu: "STILL YOUNG",
    Artis: ["LOWZACK", "BAYU RIZKI"],
    TahunRilis: "2026",
    Format: "Single" | "Album",
    Album: "ALBUM NAME", // optional, only for Album
    Sumber: {
      youtube: "...",
      spotify: "..."
    }
  }
*/


/* =========================================================
   FIRESTORE COLLECTION
========================================================= */

const DISCOGRAPHY_COLLECTION = "Discography";


/* =========================================================
   YOUTUBE URL HELPER
========================================================= */

function getYouTubeUrl(url) {
  if (!url) return "";

  const value = String(url).trim();

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://www.youtube.com/watch?v=${value}`;
}


/* =========================================================
   YOUTUBE VIDEO ID
========================================================= */

function getYouTubeVideoId(url) {
  if (!url) return "";

  const value = String(url).trim();

  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) {
    return value;
  }

  try {
    const parsed = new URL(value);

    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.replace(/^\//, "").split("/")[0] || "";
    }

    if (
      parsed.hostname === "www.youtube.com" ||
      parsed.hostname === "youtube.com" ||
      parsed.hostname === "m.youtube.com"
    ) {
      const queryId = parsed.searchParams.get("v");

      if (queryId) return queryId;

      const parts = parsed.pathname.split("/").filter(Boolean);

      if (parts[0] === "shorts" || parts[0] === "embed") {
        return parts[1] || "";
      }
    }
  } catch {
    return "";
  }

  return "";
}

/* =========================================================
   YOUTUBE VIEWS
========================================================= */

const YOUTUBE_API_URL =
  "https://www.googleapis.com/youtube/v3/videos";

async function fetchYouTubeViews(releases) {
  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;

  if (!apiKey) {
    console.warn(
      "LOWZACK: VITE_YOUTUBE_API_KEY is not configured."
    );

    return releases;
  }

  const videoIds = [
    ...new Set(
      releases
        .map((release) => getYouTubeVideoId(release.youtubeUrl))
        .filter(Boolean)
    ),
  ];

  if (videoIds.length === 0) {
    return releases;
  }

  const viewsMap = new Map();

  for (let index = 0; index < videoIds.length; index += 50) {
    const batch = videoIds.slice(index, index + 50);

    const params = new URLSearchParams({
      part: "statistics",
      id: batch.join(","),
      key: apiKey,
    });

    const response = await fetch(
      `${YOUTUBE_API_URL}?${params.toString()}`
    );

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(
        `YouTube API ${response.status}: ${errorText}`
      );
    }

    const data = await response.json();

    (data.items || []).forEach((item) => {
      viewsMap.set(
        item.id,
        Number(item.statistics?.viewCount || 0)
      );
    });
  }

  return releases.map((release) => {
    const videoId = getYouTubeVideoId(release.youtubeUrl);

    return {
      ...release,
      youtubeVideoId: videoId,
      youtubeViews: videoId
        ? viewsMap.get(videoId) ?? 0
        : 0,
    };
  });
}


/* =========================================================
   NORMALIZE FIRESTORE DATA
========================================================= */

function normalizeRelease(docSnap) {
  const data = docSnap.data() || {};

  const artists = Array.isArray(data.Artis)
    ? data.Artis
        .filter(Boolean)
        .map((artist) => String(artist).trim())
        .filter(Boolean)
    : typeof data.Artis === "string"
      ? data.Artis
          .split(",")
          .map((artist) => artist.trim())
          .filter(Boolean)
      : ["LOWZACK"];

  const format =
    String(data.Format || "Single").toLowerCase() === "album"
      ? "ALBUM"
      : "SINGLE";

  const youtubeUrl =
    data.Sumber?.youtube ||
    data.Sumber?.YouTube ||
    "";

  const spotifyUrl =
    data.Sumber?.spotify ||
    data.Sumber?.Spotify ||
    "";

  let createdAt = 0;

  if (data.createdAt?.toMillis) {
    createdAt = data.createdAt.toMillis();
  } else if (data.createdAt?.seconds) {
    createdAt = Number(data.createdAt.seconds) * 1000;
  } else if (data.updatedAt?.toMillis) {
    createdAt = data.updatedAt.toMillis();
  } else if (data.updatedAt?.seconds) {
    createdAt = Number(data.updatedAt.seconds) * 1000;
  }

  return {
    id: docSnap.id,

    title:
      data.JudulLagu ||
      "UNTITLED RELEASE",

    artists:
      artists.length > 0
        ? artists
        : ["LOWZACK"],

    year:
      data.TahunRilis != null
        ? String(data.TahunRilis)
        : "",

    format,

    album:
      data.Album ||
      data.album ||
      "",

    youtubeUrl:
      getYouTubeUrl(youtubeUrl),

    spotifyUrl,

    createdAt,
  };
}


/* =========================================================
   ARTIST DISPLAY
========================================================= */

function getFeaturedArtists(artists) {
  if (!Array.isArray(artists) || artists.length <= 1) {
    return "";
  }

  const featured = artists
    .slice(1)
    .filter(Boolean)
    .join(", ");

  return featured
    ? `FT. ${featured}`
    : "";
}


/* =========================================================
   FORMAT DISPLAY
========================================================= */

function getFormatLabel(release) {
  if (release.format === "ALBUM") {
    return release.album
      ? `ALBUM · ${release.album}`
      : "ALBUM";
  }

  return "SINGLE";
}


/* =========================================================
   DISCOGRAPHY
========================================================= */

function Discography() {
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [firebaseError, setFirebaseError] = useState("");
  const [youtubeError, setYoutubeError] = useState("");

  /* =======================================================
     REALTIME FIRESTORE
  ======================================================= */

  useEffect(() => {
    setLoading(true);
    setFirebaseError("");

    const collectionRef = collection(
      db,
      DISCOGRAPHY_COLLECTION
    );

    const unsubscribe = onSnapshot(
      collectionRef,
      (snapshot) => {
        const nextReleases = snapshot.docs
          .map(normalizeRelease)
          .filter((release) => release.title);

        fetchYouTubeViews(nextReleases)
          .then((releasesWithViews) => {
            setReleases(releasesWithViews);
            setYoutubeError("");
            setLoading(false);
          })
          .catch((error) => {
            console.error(
              "LOWZACK YOUTUBE API ERROR:",
              error
            );

            setReleases(
              nextReleases.map((release) => ({
                ...release,
                youtubeVideoId: getYouTubeVideoId(
                  release.youtubeUrl
                ),
                youtubeViews: 0,
              }))
            );

            setYoutubeError(
              "YouTube views are temporarily unavailable."
            );
            setLoading(false);
          });
      },
      (error) => {
        console.error(
          "LOWZACK DISCOGRAPHY FIRESTORE ERROR:",
          error
        );

        setFirebaseError(
          "Unable to load discography."
        );

        setReleases([]);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);


  /* =======================================================
     SORT

     Most popular YouTube release first.
   ======================================================= */

  const sortedReleases = useMemo(() => {
    return [...releases].sort((a, b) => {
      const aHasYouTube = Boolean(a.youtubeVideoId);
      const bHasYouTube = Boolean(b.youtubeVideoId);

      if (aHasYouTube !== bHasYouTube) {
        return aHasYouTube ? -1 : 1;
      }

      if (aHasYouTube && bHasYouTube) {
        const viewsA = Number(a.youtubeViews) || 0;
        const viewsB = Number(b.youtubeViews) || 0;

        if (viewsA !== viewsB) {
          return viewsB - viewsA;
        }
      }

      const yearA = Number(a.year) || 0;
      const yearB = Number(b.year) || 0;

      if (yearA !== yearB) {
        return yearB - yearA;
      }

      return (
        (b.createdAt || 0) -
        (a.createdAt || 0)
      );
    });
  }, [releases]);


  /* =======================================================
     COUNT
  ======================================================= */

  const releaseCount = String(
    sortedReleases.length
  ).padStart(2, "0");


  /* =======================================================
     FOOTER YEAR RANGE
  ======================================================= */

  const yearRange = useMemo(() => {
    const years = sortedReleases
      .map((release) => Number(release.year))
      .filter((year) => Number.isFinite(year) && year > 0);

    if (years.length === 0) {
      return "—";
    }

    const oldest = Math.min(...years);
    const newest = Math.max(...years);

    return oldest === newest
      ? String(newest)
      : `${oldest}—${newest}`;
  }, [sortedReleases]);


  return (
    <main className="discography-page">

      {/* =====================================================
          BACKGROUND
      ===================================================== */}

      <div
        className="discography-noise"
        aria-hidden="true"
      />


      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="discography-hero">
        <div className="discography-hero-inner">

          <div className="discography-kicker">
            <span className="discography-kicker-line" />
            LOWZACK / ARCHIVE
          </div>


          <div className="discography-heading-row">

            <div>
              <h1>
                DISCOGRAPHY
              </h1>

              <p>
                A chronological archive of LOWZACK releases,
                videos, collaborations and records.
              </p>
            </div>


            <div className="discography-count">
              <span>
                RELEASES
              </span>

              <strong>
                {releaseCount}
              </strong>
            </div>

          </div>

        </div>
      </section>


      {/* =====================================================
          RELEASE LIST
      ===================================================== */}

      <section className="discography-list-section">


        {/* ===================================================
            LIST HEADER
        =================================================== */}

        <div className="discography-list-header">
          <span>
            YEAR
          </span>

          <span>
            RELEASE
          </span>

          <span>
            FORMAT
          </span>

          <span>
            LINK
          </span>
        </div>


        {/* ===================================================
            LOADING
        =================================================== */}

        {loading && (
          <div className="discography-list">
            <div
              className="discography-row no-link"
              aria-hidden="true"
            >
              <div className="discography-year">
                —
              </div>

              <div className="discography-release">
                <div className="discography-index">
                  01
                </div>

                <div className="discography-title-wrap">
                  <h2>
                    LOADING DISCOGRAPHY
                  </h2>

                  <div className="discography-meta">
                    <span>
                      FETCHING RELEASES
                    </span>
                  </div>
                </div>
              </div>

              <div className="discography-format">
                —
              </div>

              <div className="discography-action">
                <span className="discography-action-label">
                  LOADING
                </span>

                <span
                  className="discography-arrow"
                  aria-hidden="true"
                >
                  …
                </span>
              </div>
            </div>
          </div>
        )}


        {/* ===================================================
            FIREBASE ERROR
        =================================================== */}

        {!loading && firebaseError && (
          <div className="discography-list">
            <div className="discography-row no-link">

              <div className="discography-year">
                —
              </div>

              <div className="discography-release">
                <div className="discography-index">
                  !
                </div>

                <div className="discography-title-wrap">
                  <h2>
                    UNABLE TO LOAD
                  </h2>

                  <div className="discography-meta">
                    <span>
                      PLEASE CHECK FIREBASE CONNECTION
                    </span>
                  </div>
                </div>
              </div>

              <div className="discography-format">
                ERROR
              </div>

              <div className="discography-action">
                <span className="discography-action-label">
                  OFFLINE
                </span>

                <span
                  className="discography-arrow"
                  aria-hidden="true"
                >
                  —
                </span>
              </div>

            </div>
          </div>
        )}


        {/* ===================================================
            EMPTY
        =================================================== */}

        {!loading &&
          !firebaseError &&
          sortedReleases.length === 0 && (
            <div className="discography-list">

              <div className="discography-row no-link">

                <div className="discography-year">
                  —
                </div>

                <div className="discography-release">
                  <div className="discography-index">
                    00
                  </div>

                  <div className="discography-title-wrap">
                    <h2>
                      NO RELEASES YET
                    </h2>

                    <div className="discography-meta">
                      <span>
                        ADD A RELEASE FROM ADMIN DISCOGRAPHY
                      </span>
                    </div>
                  </div>
                </div>

                <div className="discography-format">
                  —
                </div>

                <div className="discography-action">
                  <span className="discography-action-label">
                    ARCHIVE EMPTY
                  </span>

                  <span
                    className="discography-arrow"
                    aria-hidden="true"
                  >
                    —
                  </span>
                </div>

              </div>

            </div>
          )}


        {/* ===================================================
            RELEASES
        =================================================== */}

        {!loading &&
          !firebaseError &&
          sortedReleases.length > 0 && (

            <div className="discography-list">

              {sortedReleases.map(
                (release, index) => {

                  const youtubeUrl =
                    release.youtubeUrl;

                  const spotifyUrl =
                    release.spotifyUrl;

                  const hasLink =
                    Boolean(
                      youtubeUrl ||
                      spotifyUrl
                    );

                  const featuredArtists =
                    getFeaturedArtists(
                      release.artists
                    );

                  const formatLabel =
                    getFormatLabel(
                      release
                    );


                  /*
                    Prefer YouTube as the main row link.
                    If YouTube is unavailable, use Spotify.
                  */

                  const primaryUrl =
                    youtubeUrl ||
                    spotifyUrl ||
                    "";


                  return (
                    <a
                      key={release.id}
                      className={`discography-row ${
                        hasLink
                          ? "has-link"
                          : "no-link"
                      }`}
                      href={
                        hasLink
                          ? primaryUrl
                          : "#"
                      }
                      target={
                        hasLink
                          ? "_blank"
                          : undefined
                      }
                      rel={
                        hasLink
                          ? "noopener noreferrer"
                          : undefined
                      }
                      onClick={(event) => {
                        if (!hasLink) {
                          event.preventDefault();
                        }
                      }}
                    >

                      {/* =================================
                          YEAR
                      ================================= */}

                      <div className="discography-year">
                        {release.year || "—"}
                      </div>


                      {/* =================================
                          RELEASE
                      ================================= */}

                      <div className="discography-release">

                        <div className="discography-index">
                          {String(
                            index + 1
                          ).padStart(2, "0")}
                        </div>


                        <div className="discography-title-wrap">

                          <h2>
                            {release.title}
                          </h2>


                          <div className="discography-meta">

                            {/* YOUTUBE VIEWS */}

                            {release.youtubeVideoId && (
                              <span className="discography-views">
                                {Number(
                                  release.youtubeViews || 0
                                ).toLocaleString("en-US")}{" "}
                                VIEWS
                              </span>
                            )}

                            {/* FEATURED ARTIST */}

                            {featuredArtists && (
                              <span className="discography-artist">
                                {featuredArtists}
                              </span>
                            )}

                            {/* ALBUM NAME */}

                            {release.format === "ALBUM" &&
                              release.album && (
                                <span className="discography-type-mobile">
                                  {release.album}
                                </span>
                              )}

                          </div>

                        </div>

                      </div>


                      {/* =================================
                          FORMAT
                      ================================= */}

                      <div className="discography-format">
                        {formatLabel}
                      </div>


                      {/* =================================
                          ACTION
                      ================================= */}

                      <div className="discography-action">

                        <span className="discography-action-label">
                          {youtubeUrl
                            ? "YOUTUBE"
                            : spotifyUrl
                              ? "SPOTIFY"
                              : "NO LINK"}
                        </span>


                        <span
                          className="discography-arrow"
                          aria-hidden="true"
                        >
                          ↗
                        </span>

                      </div>

                    </a>
                  );
                }
              )}

            </div>
          )}

      </section>


      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="discography-footer">

        {/* ARTIST */}

        <div className="discography-footer-artist">
          LOWZACK
        </div>


        {/* CENTER */}

        <div className="discography-footer-center">
          DISCOGRAPHY / {yearRange}
        </div>


        {/* RELEASE COUNT */}

        <div className="discography-footer-right">
          {releaseCount} RELEASES
        </div>

      </footer>

    </main>
  );
}


/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default Discography;