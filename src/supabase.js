import { createClient } from "@supabase/supabase-js";
import { createOfflineSupabaseClient } from "./lib/offlineClient";

const supabaseUrl = "https://qlmcbgxpxkrszuzlzlet.supabase.co";
const supabaseKey = "sb_publishable_0XrHgLz_Hlvdej7e_vxdkg_xAmEfJEi";

export const rawSupabase = createClient(supabaseUrl, supabaseKey);

// Database calls use the same authenticated Supabase client and therefore keep
// all existing RLS behaviour. The wrapper only adds cache/queue fallback.
export const supabase = createOfflineSupabaseClient(rawSupabase);
