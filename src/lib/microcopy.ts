/**
 * Centralized microcopy for ArtDirector Studio.
 * Every UI string reads from this file. No hardcoded strings in components.
 */

export const mc = {
  workspace: {
    empty: {
      notLoggedIn: {
        title: "Sign in to continue",
        body: "Analysis and generation use credits.",
      },
      noItems: {
        title: "No items yet",
        body: "Drop an image onto the board to get started.",
      },
      noSelection: {
        title: "Select a working image",
        body: "Choose an image on the board to see details and actions.",
      },
      referencesEmpty: {
        title: "Build your reference shelf",
        body: "Drag images here or use the upload button to add references.",
      },
      versionsEmpty: {
        title: "No versions yet",
        body: "Regenerate an image to see version history here.",
      },
      analyzeBeforeFirst: {
        title: "Analyze first",
        body: "Select a working image and click Analyze to get started.",
      },
      promptPlaceholder: "Describe what you want to change…",
      effectsEmpty: {
        title: "No effects applied",
        body: "Adjust sliders and commit to apply effects.",
      },
      funLabNoSelection: {
        title: "Select an image",
        body: "Choose a working image to use Fun Lab.",
      },
      funLabLoading: {
        title: "Generating…",
        body: "Your options will appear shortly.",
      },
      creditsNoTransactions: {
        title: "No transactions yet",
        body: "Your credit usage will appear here.",
      },
      creditsLow: {
        title: "Low credits",
        body: "Buy more credits to continue generating.",
      },
      searchNoMatches: {
        title: "No matches",
        body: "Try a different search term.",
      },
    },
    firstImage: {
      nudge: {
        title: "Want feedback and a prompt?",
        body: "Click Analyze to get AI feedback and an editable prompt.",
        button: "Analyze",
      },
    },
  },

  toasts: {
    success: {
      upload: "Image uploaded",
      reference: "Reference added",
      analyze: "Analysis complete",
      promptCopied: "Prompt copied to clipboard",
      regenerateStarted: "Regeneration started",
      regenerateComplete: "Regeneration complete",
      effectsCommitted: "Effects applied",
      presetSaved: "Preset saved",
      presetApplied: "Preset applied",
      funLabStarted: "Fun Lab started",
      funLabReady: "Fun Lab ready",
      funLabCommitted: "Fun Lab result applied",
      creditsAdded: "Credits added",
      freeCredits: "Free credits applied",
      signupCredits: "59 credits added",
      jobCancelled: "Job cancelled",
      sessionRecovered: "Session recovered",
    },
    warnings: {
      unsavedPrompt: "Unsaved changes to prompt",
      replaceReminder: "This will replace the current image",
    },
    errors: {
      authGoogle: "Google sign-in failed",
      authOtpSend: "Could not send verification code",
      authOtpInvalid: "Invalid verification code",
      creditsInsufficient: "Insufficient credits",
      creditsReservationFailed: "Could not reserve credits",
      creditsPaymentCancelled: "Payment cancelled",
      creditsPaymentFailed: "Payment failed",
      creditsRefundNotice: "Refund processed",
      networkUpload: "Upload failed. Check your connection.",
      networkAnalyze: "Analysis failed. Try again.",
      networkRegenerate: "Regeneration failed. Try again.",
      networkEffects: "Effects failed. Try again.",
      networkFunLab: "Fun Lab failed. Try again.",
      networkTimeout: "Request timed out",
      networkRateLimit: "Too many requests. Please wait.",
      networkStorage: "Storage error",
      boardReferenceToolMissing: "Reference tool not found",
      boardReferenceItemMissing: "Reference item not found",
      boardUnsupportedFile: "Unsupported file type",
      boardPasteFailed: "Paste failed",
    },
  },

  tooltips: {
    tabs: "Switch between canvases",
    creditsPill: "Your credit balance",
    creditsPerTab: "Credits spent on this tab",
    railImport: "Import image",
    railReferences: "References",
    railAnalyze: "Analyze",
    railRegenerate: "Regenerate",
    railEffects: "Effects",
    railFunLab: "Fun Lab",
    spotlightRing: "Selected item",
    panHint: "Alt+drag or middle-click to pan",
    zoomHint: "Scroll to zoom",
    lockedDescription: "This item is locked",
    editableDirection: "Edit direction",
    guardrails: "Guardrails",
    replaceVsAdd: "Replace vs add mode",
    versionClick: "Click to view version",
    compareDrag: "Drag to compare",
    effectsStack: "Effects stack",
    effectsToggle: "Toggle effect",
    effectsCommit: "Apply effects",
    effectsPresets: "Effect presets",
    funLabGenerate: "Generate",
    funLabTextPortrait: "Text portrait",
    funLabTiles: "Tiles",
    referencePin: "Pin reference",
    referenceLabel: "Label reference",
  },

  confirm: {
    closeTabWithJob: {
      title: "Close tab?",
      body: "A job is still running. Close anyway?",
      confirm: "Close",
      cancel: "Stay",
    },
    deleteItem: {
      title: "Delete item?",
      body: "This cannot be undone.",
      confirm: "Delete",
      cancel: "Cancel",
    },
    clearBoard: {
      title: "Clear board?",
      body: "Remove all items from this canvas?",
      confirm: "Clear",
      cancel: "Cancel",
    },
  },

  buttons: {
    primary: {
      analyze: "Analyze",
      regenerate: "Regenerate",
      generate3: "Generate 3 options",
      commitFree: "Commit (free)",
      commitCost: "Commit",
    },
    secondary: {
      copyPrompt: "Copy prompt",
      resetEdits: "Reset edits",
      savePreset: "Save preset",
      buyCredits: "Buy credits",
      retry: "Retry",
      cancel: "Cancel",
    },
  },

  loading: {
    loading: "Loading…",
    saving: "Saving…",
    generating: "Generating…",
    applying: "Applying…",
    syncing: "Syncing…",
  },

  progress: {
    analyzing: "Analyzing…",
    generating3Options: "Generating 3 options…",
    savingVersion: "Saving version…",
    uploading: "Uploading…",
  },

  inspector: {
    empty: {
      title: "Select a working image",
      body: "Choose an image on the board to continue.",
      importButton: "Import image",
    },
    itemContext: {
      workingImage: "Working Image",
      reference: "Reference",
      cannotApplyToolsToReference:
        "Cannot apply tools to reference. Select a working image to continue.",
      duplicate: "Duplicate",
      delete: "Delete",
      analyze: "Analyze",
    },
  },

  credits: {
    label: "Credits",
    format: (n: number) => `Credits: ${n}`,
  },

  onboarding: {
    step1: "Drop image",
    step2: "Click Analyze",
    step3: "Edit prompt and Regenerate",
  },

  tabs: {
    newTab: "New canvas",
    closeTab: "Close",
    newResult: (n: number) => `${n} new result${n > 1 ? 's' : ''}`,
  },

  undoRedo: {
    undo: "Undo (⌘Z)",
    redo: "Redo (⌘⇧Z)",
  },

  // Fun Lab specific
  funlab: {
    otherOptions: (n: number) => `Other options (${n})`,
    tapToCommit: "Tap an option to commit it. Others will collapse into a chip.",
    hintPreviewNote: "Live preview — final result will differ",
    packCostLabel: (cost: number) => `Generate 3 options (cost: ${cost})`,
    notEnoughCredits: "Not enough credits",
    generating3: "Generating 3 options…",
  },

  // Confirm dialogs (spec-mandated strings)
  confirmDialogs: {
    closeTabWithJob: {
      title: "Job still running",
      body: "Closing this tab won't stop the job.",
      confirm: "Close tab",
      cancel: "Keep open",
    },
    deleteItem: {
      title: "Delete item",
      body: "This removes it from the board.",
      confirm: "Delete",
      cancel: "Cancel",
    },
    clearBoard: {
      title: "Clear board",
      body: "This removes all items from this board.",
      confirm: "Clear",
      cancel: "Cancel",
    },
  },

  // Additional strings moved from hardcoded
  misc: {
    gettingStarted: "Getting started",
    noDescriptionAvailable: "No description available.",
    dropOrClick: "Drop image or click to upload",
    supportedFormats: "PNG, JPG, WebP",
    enterValidUrl: "Please enter a valid URL",
    importedImage: "Imported image",
    presetNamePlaceholder: "Preset name",
    presetSaveFailed: "Failed to save preset",
    costReference: "Cost Reference",
    reserved: "Reserved",
    replace: "Replace",
    add: "Add",
    collapse: "Collapse",
    multiSelectNote: "Operating on first selected image",
    referenceToolBlock: "Select a working image to continue",
  },

  // Tool rail
  toolRail: {
    expand: 'Expand tool rail',
    collapse: 'Collapse tool rail',
  },

  // Grid
  grid: {
    show: 'Show grid',
    hide: 'Hide grid',
  },

  // Accessibility
  a11y: {
    searchPacks: "Search Fun Lab packs",
    backToPackBrowser: "Back to pack browser",
    previewFullSize: "Preview full size",
    dismissOptions: "Dismiss remaining options",
    closePreview: "Close preview",
    workingImageSelected: "Working image selected",
    referenceSelected: "Reference selected",
    nothingSelected: "Nothing selected",
  },
} as const;
