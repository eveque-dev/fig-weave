# Stable identities belong to this source plot. Rerunning source starts a new session.
figweave_draw <- function(plot, moves = list(), width = 7, height = 5, measure = FALSE, text_edits = list()) {
  device <- grDevices::dev.size("in")
  width <- device[1]; height <- device[2]
  showtext::showtext_begin()
  on.exit(showtext::showtext_end())
  grid::grid.newpage()
  # Resolve fonts before gtable computes text-dependent layout and dimensions.
  fonts <- function(g) {
    if (inherits(g, "text")) {
      n <- length(g$label)
      families <- rep(if (length(g$gp$fontfamily)) g$gp$fontfamily else "sans", length.out = n)
      faces <- rep(if (length(g$gp$font)) g$gp$font else 1, length.out = n)
      g$fw_requested <- families
      for (j in seq_len(n)) families[j] <- figweave_font_for(g$label[j], families[j], faces[j])$actual
      g$gp$fontfamily <- families
    }
    if (length(g$grobs)) g$grobs <- lapply(g$grobs, fonts)
    if (length(g$children)) for (j in seq_along(g$children)) g$children[[j]] <- fonts(g$children[[j]])
    g
  }
  scene <- fonts(ggplot2::ggplotGrob(plot))
  active_legends <- which(grepl("^guide-box", scene$layout$name) & vapply(scene$grobs, function(g) inherits(g$vp, "viewport"), FALSE))
  multiple_legends <- length(active_legends) > 1L
  for (k in active_legends) {
    legend_id <- if (multiple_legends) paste0("legend:", scene$layout$name[k]) else "legend:0"
    legend_move <- moves[[legend_id]]
    if (is.null(legend_move)) next
    vp <- scene$grobs[[k]]$vp
    if (inherits(vp, "viewport")) {
      vp$x <- vp$x + grid::unit(legend_move[1] * width, "inches")
      vp$y <- vp$y - grid::unit(legend_move[2] * height, "inches")
      scene$grobs[[k]]$vp <- vp
    }
  }
  grid::grid.draw(scene)
  grid::grid.force()
  listing <- grid::grid.ls(print = FALSE, viewports = TRUE)
  classify <- function(g, name, full) {
    if (identical(name, "guide-box")) "legend" else if (inherits(g, "text")) "text" else if (grepl("guide-box", full)) "" else if (inherits(g, "points") && grepl("geom_", full)) "point" else if (inherits(g, "polyline") && grepl("GRID.polyline|geom_", full) && !grepl("grill|panel.grid", full)) "curve" else ""
  }
  canonical <- function(full) {
    parts <- strsplit(full, "::", fixed = TRUE)[[1]]
    parts <- sub("[.][0-9]+([.-][0-9]+)*$", "", parts)
    if (!multiple_legends) parts <- sub("^guide-box-(right|left|top|bottom|inside)$", "guide-box", parts)
    paste(vapply(parts, utils::URLencode, "", reserved = TRUE), collapse = "::")
  }
  entries <- list(); counts <- list()
  for (i in seq_along(listing$name)) {
    if (!listing$type[i] %in% c("grobListing", "gTreeListing")) next
    full <- paste(c(if (nzchar(listing$gPath[i])) listing$gPath[i], listing$name[i]), collapse = "::")
    path <- do.call(grid::gPath, as.list(strsplit(full, "::", fixed = TRUE)[[1]]))
    g <- grid::grid.get(path, strict = TRUE)
    kind <- classify(g, listing$name[i], full)
    if (!nzchar(kind)) next
    key <- paste(kind, canonical(full), sep = ":")
    counts[[key]] <- if (is.null(counts[[key]])) 1L else counts[[key]] + 1L
    indexes <- if (kind == "point") seq_along(g$x) else if (kind == "text") seq_along(g$label) else 0L
    legend_role <- regmatches(full, regexpr("guide-box-(right|left|top|bottom|inside)", full))
    ids <- if (kind == "legend") { if (multiple_legends) paste0("legend:", legend_role) else "legend:0" } else paste(key, counts[[key]], indexes, sep = ":")
    ancestor <- strsplit(canonical(full), "::", fixed = TRUE)[[1]][2]
    role <- if (identical(ancestor, "title")) "title" else if (grepl("^xlab-", ancestor)) "x" else if (grepl("^ylab-", ancestor)) "y" else ""
    entries[[length(entries) + 1L]] <- list(path = path, kind = kind, role = role, indexes = indexes, ids = ids, viewport = listing$vpPath[i])
  }
  at <- function(value, j, fallback) if (length(value)) rep(value, length.out = j)[j] else fallback
  for (entry in entries) {
    g <- grid::grid.get(entry$path, strict = TRUE)
    n <- if (entry$kind == "text") length(g$label) else length(g$x)
    for (k in seq_along(entry$indexes)) {
      j <- entry$indexes[k]; id <- entry$ids[k]
      if (entry$kind == "text") {
        patch <- text_edits[[id]]
        if (!is.null(patch$text) && !is.expression(g$label)) g$label[j] <- patch$text
        for (pair in list(c("sizePt", "fontsize"), c("fontFamily", "fontfamily"), c("color", "col"))) {
          value <- patch[[pair[1]]]
          if (!is.null(value)) {
            values <- rep(if (length(g$gp[[pair[2]]])) g$gp[[pair[2]]] else switch(pair[2], fontsize = 12, fontfamily = "sans", col = "black"), length.out = n)
            values[j] <- value; g$gp[[pair[2]]] <- values
          }
        }
        requested <- if (!is.null(patch$fontFamily)) patch$fontFamily else at(g$fw_requested, j, at(g$gp$fontfamily, j, "sans"))
        info <- figweave_font_for(g$label[j], requested, at(g$gp$font, j, 1))
        g$gp$fontfamily <- rep(g$gp$fontfamily, length.out = n)
        g$gp$fontfamily[j] <- info$actual
        g$fw_requested <- rep(if (length(g$fw_requested)) g$fw_requested else "sans", length.out = n)
        g$fw_requested[j] <- requested
      }
      delta <- if (entry$kind == "legend") NULL else moves[[id]]
      if (!is.null(delta)) {
        gx <- rep(g$x, length.out = n); gy <- rep(g$y, length.out = n)
        target <- if (entry$kind %in% c("point", "text")) j else seq_along(gx)
        gx[target] <- gx[target] + grid::unit(delta[1] * width, "inches")
        gy[target] <- gy[target] - grid::unit(delta[2] * height, "inches")
        g$x <- gx; g$y <- gy
      }
    }
    if (entry$kind != "legend") grid::grid.set(entry$path, g, strict = TRUE, redraw = FALSE)
  }
  # Final display list only; intermediate pages are confined to the disposable device.
  grid::grid.refresh()
  if (!measure) return(invisible(NULL))
  rows <- list()
  enter <- function(path) {
    grid::upViewport(0)
    parts <- strsplit(path, "::", fixed = TRUE)[[1]]
    parts <- parts[parts != "ROOT" & nzchar(parts)]
    if (length(parts)) grid::downViewport(do.call(grid::vpPath, as.list(parts)))
  }
  locate <- function(x, y) {
    pos <- grid::deviceLoc(x, y, valueOnly = TRUE)
    list(x = pos$x / width, y = 1 - pos$y / height)
  }
  for (entry in entries) {
    g <- grid::grid.get(entry$path, strict = TRUE)
    enter(entry$viewport)
    for (k in seq_along(entry$indexes)) {
      j <- entry$indexes[k]
      row <- list(id = entry$ids[k], kind = entry$kind, role = entry$role, breaks = I(integer()))
      if (entry$kind %in% c("point", "curve")) {
        pos <- locate(g$x, g$y)
        indexes <- if (entry$kind == "point") j else seq_along(pos$x)
        row$coords <- I(as.vector(rbind(pos$x[indexes], pos$y[indexes])))
        if (entry$kind == "curve") {
          if (!is.null(g$id)) row$breaks <- I(which(c(TRUE, diff(g$id) != 0)) - 1L)
          else if (!is.null(g$id.lengths)) row$breaks <- I(c(0L, head(cumsum(g$id.lengths), -1L)))
        }
      } else {
        if (entry$kind == "legend") {
          a <- locate(grid::unit(0, "npc"), grid::unit(0, "npc"))
          b <- locate(grid::unit(1, "npc"), grid::unit(1, "npc"))
        } else {
          text <- g; text$label <- g$label[j]
          text$x <- at(g$x, j, grid::unit(.5, "npc")); text$y <- at(g$y, j, grid::unit(.5, "npc"))
          for (prop in names(text$gp)) text$gp[[prop]] <- at(g$gp[[prop]], j, NULL)
          for (prop in c("hjust", "vjust", "rot")) text[[prop]] <- at(g[[prop]], j, NULL)
          a <- locate(grid::grobX(text, 180), grid::grobY(text, 270))
          b <- locate(grid::grobX(text, 0), grid::grobY(text, 90))
          row$text <- as.character(text$label); row$editable <- !is.expression(text$label)
          row$typography <- list(sizePt = at(g$gp$fontsize, j, 12), fontFamily = at(g$fw_requested, j, "sans"), color = paste0("#", paste(sprintf("%02X", grDevices::col2rgb(at(g$gp$col, j, "black"), alpha = TRUE)[, 1]), collapse = "")))
          row$typography$color <- sub("FF$", "", row$typography$color)
          row$font <- figweave_font_for(text$label, row$typography$fontFamily, at(g$gp$font, j, 1))
        }
        row$coords <- I(c(a$x, a$y, b$x, b$y))
      }
      if (all(is.finite(row$coords))) rows[[length(rows) + 1L]] <- row
    }
  }
  grid::upViewport(0)
  assign(".fw_geometry", as.character(jsonlite::toJSON(rows, auto_unbox = TRUE, digits = 12)), envir = globalenv())
  invisible(NULL)
}

figweave_scene <- function(plot, moves = list(), width = 7, height = 5, measure = FALSE, text_edits = list()) {
  grDevices::pdf(NULL, width = width, height = height)
  on.exit(grDevices::dev.off())
  figweave_draw(plot, moves, width, height, measure, text_edits)
  grid::grid.grab()
}

figweave_write_pdf <- function(scene, filename, width = 7, height = 5) {
  grDevices::pdf(filename, width = width, height = height, useDingbats = FALSE)
  on.exit(grDevices::dev.off())
  showtext::showtext_begin()
  tryCatch(grid::grid.draw(scene), finally = showtext::showtext_end())
  invisible(filename)
}
