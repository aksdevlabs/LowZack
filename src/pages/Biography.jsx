import React from "react";
import "../styles/Biography.css";

import lowzackBiography from "../assets/lowzack-biography.jpeg";


/* =========================================================
   LOWZACK
   BIOGRAPHY PAGE
========================================================= */

function Biography() {

  return (
    <main className="biography-page">

      {/* =====================================================
          BACKGROUND ATMOSPHERE
      ===================================================== */}

      <div
        className="biography-background"
        aria-hidden="true"
      />

      <div
        className="biography-grain"
        aria-hidden="true"
      />


      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="biography-hero">

        <div className="biography-hero-inner">


          {/* =================================================
              HEADER
          ================================================= */}

          <div className="biography-header">

            <div className="biography-kicker">

              <span className="biography-kicker-line" />

              LOWZACK / BIOGRAPHY

            </div>


            <h1>
              BIOGRAPHY
            </h1>

          </div>


          {/* =================================================
              PHOTO
          ================================================= */}

          <div className="biography-photo-wrapper">

            <div className="biography-photo-frame">

              <img
                src={lowzackBiography}
                alt="LOWZACK"
                className="biography-photo"
              />

              <div
                className="biography-photo-overlay"
                aria-hidden="true"
              />

            </div>


            {/* =================================================
                PHOTO CAPTION
            ================================================= */}

            <div className="biography-photo-caption">

              <span>
                LOWZACK
              </span>

              <span>
                BOGOR, INDONESIA
              </span>

            </div>

          </div>


          {/* =================================================
              BIO CONTENT
          ================================================= */}

          <div className="biography-content">

            <div className="biography-content-label">
              BIO
            </div>


            <div className="biography-text">

              <p>
                LOWZACK lahir dan tumbuh dari pergerakan arus bawah
                di Bogor Barat, Indonesia, LOWZACK adalah unit
                Hip-Hop independen yang konsisten menembus
                batas lewat rima dan ketukan beat yang tajam.
                Memulai perjalanan musiknya sejak tahun 2018,
                LOWZACK membawa identitas lokal yang autentik
                dengan menyuarakan realitas jalanan, keresahan
                sosial, hingga refleksi personal yang jujur.
              </p>


              <p>
                Selama bertahun-tahun bergerak di skena
                independen, LOWZACK dikenal lewat karakter
                vokal yang tegas dan penyampaian lirik yang
                lugas tanpa basa-basi. Menolak untuk berhenti
                berkarya, LOWZACK terus membuktikan
                eksistensinya sebagai salah satu talenta
                Hip-Hop produktif yang patut diperhitungkan
                dari Kota Hujan.
              </p>

            </div>

          </div>


          {/* =================================================
              BOTTOM INFORMATION
          ================================================= */}

          <div className="biography-bottom">

            <div className="biography-bottom-item">

              <span className="biography-bottom-label">
                BASED IN
              </span>

              <span className="biography-bottom-value">
                BOGOR, INDONESIA
              </span>

            </div>


            <div className="biography-bottom-item">

              <span className="biography-bottom-label">
                ACTIVE SINCE
              </span>

              <span className="biography-bottom-value">
                2018
              </span>

            </div>


            <div className="biography-bottom-item">

              <span className="biography-bottom-label">
                GENRE
              </span>

              <span className="biography-bottom-value">
                HIP-HOP
              </span>

            </div>


            <div className="biography-bottom-item">

              <span className="biography-bottom-label">
                STATUS
              </span>

              <span className="biography-bottom-value">
                INDEPENDENT
              </span>

            </div>

          </div>


        </div>

      </section>


      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="biography-footer">

        <span>
          LOWZACK
        </span>

        <span>
          BIOGRAPHY / 2018—PRESENT
        </span>

        <span>
          BOGOR, INDONESIA
        </span>

      </footer>

    </main>
  );

}


export default Biography;