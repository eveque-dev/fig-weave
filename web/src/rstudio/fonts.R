# Font files, metrics and outlines are shared by preview and exported PDF.
figweave_font_files <- function(imported = list()) {
  if (!requireNamespace("showtext", quietly = TRUE) || !requireNamespace("jsonlite", quietly = TRUE))
    stop('Install dependencies first: install.packages(c("ggplot2", "showtext", "jsonlite"))')
  folder <- system.file("fonts", package = "sysfonts")
  files <- list()
  for (family in c("sans", "serif", "mono")) {
    stem <- c(sans = "LiberationSans", serif = "LiberationSerif", mono = "LiberationMono")[[family]]
    paths <- file.path(folder, paste0(stem, c("-Regular.ttf", "-Bold.ttf", "-Italic.ttf", "-BoldItalic.ttf")))
    files[[family]] <- as.list(paths)
  }
  destination <- file.path(tempdir(), "figweave-fonts")
  dir.create(destination, showWarnings = FALSE)
  utils::unzip(system.file("fonts/wqy-microhei.ttc.zip", package = "showtextdb"), exdir = destination)
  chinese <- list.files(destination, pattern = "[.]ttc$", full.names = TRUE, recursive = TRUE)[1]
  sysfonts::font_add("wqy-microhei", regular = chinese)
  files[["wqy-microhei"]] <- rep(list(chinese), 4)
  for (font in imported) {
    sysfonts::font_add(font$family, regular = font$name)
    files[[font$family]] <- rep(list(normalizePath(font$name)), 4)
  }
  files
}

figweave_font_for <- function(label, family, face = 1) {
  requested <- if (is.null(family) || !nzchar(family)) "sans" else family
  actual <- requested
  coverage <- get0(".fw_font_coverage", envir = globalenv(), ifnotfound = list())
  if (is.null(coverage[[actual]])) actual <- "sans"
  # Plotmath has a separate symbol layout; do not pretend to validate its glyphs.
  if (is.expression(label)) return(list(requested = requested, actual = actual, missing = "", checked = FALSE))
  codes <- unique(utf8ToInt(as.character(label)))
  codes <- codes[!codes %in% c(9L, 10L, 13L)]
  absent <- function(family) {
    ranges <- coverage[[family]][[min(max(as.integer(face), 1L), 4L)]]
    if (!length(ranges)) return(codes)
    starts <- vapply(ranges, function(pair) as.numeric(pair[[1]]), 0)
    ends <- vapply(ranges, function(pair) as.numeric(pair[[2]]), 0)
    indexes <- findInterval(codes, starts)
    codes[indexes == 0L | codes > ends[pmax(1L, indexes)]]
  }
  missing <- absent(actual)
  if (length(missing) && !length(absent("wqy-microhei"))) { actual <- "wqy-microhei"; missing <- integer() }
  list(requested = requested, actual = actual, missing = intToUtf8(head(missing, 12)), checked = TRUE)
}
