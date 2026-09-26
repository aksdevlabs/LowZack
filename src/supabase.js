/* =========================================================
   LOWZACK
   SUPABASE CLIENT
========================================================= */

import { createClient } from "@supabase/supabase-js";


/* =========================================================
   ENVIRONMENT VARIABLES
========================================================= */

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL;

const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;


/* =========================================================
   VALIDATION
========================================================= */

if (!supabaseUrl) {
  throw new Error(
    "Missing VITE_SUPABASE_URL in .env"
  );
}

if (!supabasePublishableKey) {
  throw new Error(
    "Missing VITE_SUPABASE_PUBLISHABLE_KEY in .env"
  );
}


/* =========================================================
   SUPABASE CLIENT
========================================================= */

export const supabase =
  createClient(
    supabaseUrl,
    supabasePublishableKey
  );


/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default supabase;