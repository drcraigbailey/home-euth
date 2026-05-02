import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://qlmcbgxpxkrszuzlzlet.supabase.co";
const supabaseKey = "sb_publishable_0XrHgLz_Hlvdej7e_vxdkg_xAmEfJEi";

export const supabase = createClient(supabaseUrl, supabaseKey);