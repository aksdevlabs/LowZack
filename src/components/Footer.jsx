import React from "react";
import "./Footer.css";

/* =========================================================
   LOWZACK
   FOOTER
   Extracted from Home.jsx
========================================================= */

const socialLinks = [
  {
    label: "YOUTUBE",
    url: "https://www.youtube.com/@LowZack14",
  },
  {
    label: "SPOTIFY",
    url: "https://open.spotify.com/intl-id/artist/0UBJuKa2JLp9dhyvKDuAFx?si=SrUQAm1PQhKBgFH5uamTYA",
  },
  {
    label: "SOUNDCLOUD",
    url: "https://soundcloud.com/lowzack-music",
  },
  {
    label: "TIKTOK",
    url: "https://www.tiktok.com/@lowzack14",
  },
  {
    label: "INSTAGRAM",
    url: "https://www.instagram.com/lowzack14",
  },
];

function Footer() {
  return (
    <footer className="lowzack-footer">

      <div className="footer-inner">

        <div className="footer-brand">

          <span>
            LOWZACK
          </span>

          <p>
            ©{" "}
            {new Date().getFullYear()}{" "}
            Lowzack.
            All rights reserved.
          </p>

        </div>


        <div className="footer-powered">
          POWERED BY <span>AKSDEVLABS</span>
        </div>


        <div className="footer-socials">

          {socialLinks.map(
            (social, index) => (

              <a
                key={index}
                href={social.url}
                target="_blank"
                rel="noreferrer"
              >
                {social.label}
              </a>

            )
          )}

        </div>


      </div>

    </footer>
  );
}

export default Footer;