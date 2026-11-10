import { ADMIN_THEME_BOOTSTRAP } from "./admin/theme.mjs";
import { INTERN_THEME_BOOTSTRAP } from "./intern/theme.mjs";

// Run once before hydration. Theme providers handle later client navigations.
// Public pages must not receive the workspace palettes.
export const WORKSPACE_THEME_BOOTSTRAP = `(function(){
  var path=location.pathname;
  if(/^\\/dashboard(?:\\/|$)/.test(path)){
    ${ADMIN_THEME_BOOTSTRAP}
  }else if(/^\\/intern\\/(?:dashboard|portal)(?:\\/|$)/.test(path)||/^\\/intern\\/(?:register|reset-password|verify)\\/?$/.test(path)){
    ${INTERN_THEME_BOOTSTRAP}
  }
})()`;
