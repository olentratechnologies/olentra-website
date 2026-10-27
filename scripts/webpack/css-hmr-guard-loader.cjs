/**
 * Next 16.2's bundled mini-css-extract-plugin can finish two stylesheet
 * reloads after the original link has already been detached. Element.remove()
 * is equivalent here, but safely does nothing for an already detached link.
 * Applied only to the development CSS HMR runtime, never application code.
 */
module.exports = function cssHmrGuardLoader(source) {
  return source.replaceAll('e.parentNode.removeChild(e)', 'e.remove()');
};
