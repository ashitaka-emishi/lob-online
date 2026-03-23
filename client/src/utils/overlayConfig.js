/**
 * overlayConfig — canonical shape reference for HexMapOverlay's declarative rendering API.
 *
 * Pass an `overlayConfig` object to `HexMapOverlay` to control which overlay layers render
 * and how. All keys are optional; omitting a key disables that layer.
 *
 * Tool panels own their slice and emit it upward to `MapEditorView`, which merges it with
 * global editor state (selectedHex, LOS, VP highlights, calibration mode) before passing
 * the unified object to `HexMapOverlay`.
 *
 * @typedef {Object} HexFillConfig
 * @property {boolean} alwaysOn
 * @property {function(cell): string|null} fillFn - returns a CSS color or null for no fill
 *
 * @typedef {Object} HexLabelConfig
 * @property {boolean} alwaysOn
 * @property {function(cell): string|null} labelFn - returns the label text or null
 * @property {'large'|undefined} [size]
 *
 * @typedef {Object} ElevationLabelConfig
 * @property {boolean} alwaysOn
 *
 * @typedef {Object} HexIconConfig
 * @property {boolean} alwaysOn
 * @property {function(cell): string|null} iconFn - returns a unicode icon or null
 *
 * @typedef {Object} EdgeFeatureGroup
 * @property {string[]} types        - edge feature type strings that belong to this group
 * @property {string} color          - SVG stroke color
 * @property {number} strokeWidth
 * @property {string} [dash]         - SVG stroke-dasharray value
 *
 * @typedef {Object} EdgeLineConfig
 * @property {boolean} alwaysOn
 * @property {EdgeFeatureGroup[]} featureGroups
 *
 * @typedef {Object} GridConfig
 * @property {boolean} alwaysOn
 * @property {'faint'|'diagnostic'} [weight]
 *
 * @typedef {Object} WedgeConfig
 * @property {boolean} alwaysOn
 *
 * @typedef {Object} SlopeArrowConfig
 * @property {boolean} alwaysOn
 *
 * @typedef {Object} SelectedHexConfig
 * @property {string|null} hexId - game hex ID of the currently selected hex (e.g. "03.04")
 *
 * @typedef {Object} LosConfig
 * @property {string|null} hexA       - LOS endpoint A hex ID
 * @property {string|null} hexB       - LOS endpoint B hex ID
 * @property {string[]} pathHexes     - hex IDs along the LOS path (orange highlight)
 * @property {string|null} blockedHex - hex ID where LOS is blocked (red fill)
 *
 * @typedef {Object} VpHighlightConfig
 * @property {string[]} hexIds - hex IDs that are victory point hexes (red stroke)
 *
 * @typedef {Object} SeedHighlightConfig
 * @property {string[]} hexIds - hex IDs to highlight as seed hexes (purple stroke)
 *
 * @typedef {Object} CalibrationConfig
 * @property {boolean} active - true when calibration mode is active (diagnostic stroke colors)
 *
 * @typedef {Object} OverlayConfig
 * @property {GridConfig}           [grid]
 * @property {HexFillConfig}        [hexFill]
 * @property {HexLabelConfig}       [hexLabel]
 * @property {ElevationLabelConfig} [elevationLabel]
 * @property {HexIconConfig}        [hexIcon]
 * @property {EdgeLineConfig}       [edgeLine]
 * @property {WedgeConfig}          [wedges]
 * @property {SlopeArrowConfig}     [slopeArrows]
 * @property {SelectedHexConfig}    [selectedHex]
 * @property {LosConfig}            [los]
 * @property {VpHighlightConfig}    [vpHighlight]
 * @property {SeedHighlightConfig}  [seedHighlight]
 * @property {CalibrationConfig}    [calibration]
 */

/**
 * Empty overlayConfig — no layers rendered, all interaction state cleared.
 * Use as a base when constructing a panel's config slice.
 * @type {OverlayConfig}
 */
export const EMPTY_OVERLAY_CONFIG = Object.freeze({});
