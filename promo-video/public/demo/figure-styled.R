library(ggplot2)
df <- data.frame(
  time = rep(0:6, 2),
  response = c(7, 8.5, 9.2, 10, 10.8, 11.2, 11.5, 5, 5.8, 6.7, 7.2, 7.8, 8.1, 8.5),
  condition = rep(c("Control", "Treatment"), each = 7)
)
p <- ggplot(df, aes(time, response, colour = condition)) +
  geom_line(linewidth = 0.9) + geom_point(size = 2.5) +
  scale_y_continuous(limits = c(0, 12)) +
  scale_colour_manual(values = c("#3678ab", "#d39050")) +
  labs(title = "Response over time", x = "Time (h)", y = "Response", colour = "Condition") +
  theme_minimal(base_size = 12)


# Grid geometry and visual offsets. The same function is used by preview and export.
figweave_draw <- function(plot, moves = list(), width = 7, height = 5, measure = FALSE) {
  device <- grDevices::dev.size("in")
  width <- device[1]; height <- device[2]
  grid::grid.newpage()
  scene <- ggplot2::ggplotGrob(plot)
  legend_move <- moves[["legend:0"]]
  if (!is.null(legend_move)) for (k in grep("^guide-box", scene$layout$name)) {
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
    if (identical(name, "guide-box")) "legend" else if (grepl("guide-box", full)) "" else if (inherits(g, "text") && length(g$label) == 1) "text" else if (inherits(g, "points") && grepl("geom_", full)) "point" else if (inherits(g, "polyline") && grepl("GRID.polyline|geom_", full) && !grepl("grill|panel.grid", full)) "curve" else ""
  }
  rows <- character()
  counter <- 0L
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
  for (i in seq_along(listing$name)) {
    if (!listing$type[i] %in% c("grobListing", "gTreeListing")) next
    full <- paste(c(if (nzchar(listing$gPath[i])) listing$gPath[i], listing$name[i]), collapse = "::")
    path <- do.call(grid::gPath, as.list(strsplit(full, "::", fixed = TRUE)[[1]]))
    g <- grid::grid.get(path, strict = TRUE)
    kind <- classify(g, listing$name[i], full)
    if (!nzchar(kind)) next
    counter <- counter + 1L
    # Ordinal IDs belong to this exact plot structure. Layout edits clear moves.
    indexes <- if (kind == "point") seq_along(g$x) else 0L
    for (j in indexes) {
      id <- paste(counter, j, sep = ":")
      delta <- if (kind == "legend") NULL else moves[[id]]
      if (!is.null(delta)) {
          gx <- g$x; gy <- g$y
          k <- if (kind == "point") j else seq_along(gx)
          gx[k] <- gx[k] + grid::unit(delta[1] * width, "inches")
          gy[k] <- gy[k] - grid::unit(delta[2] * height, "inches")
          grid::grid.edit(path, x = gx, y = gy, redraw = FALSE, strict = TRUE)
          g$x <- gx; g$y <- gy
      }
    }
  }
  if (length(moves)) grid::grid.refresh()
  if (!measure) return(invisible(NULL))
  counter <- 0L
  for (i in seq_along(listing$name)) {
    if (!listing$type[i] %in% c("grobListing", "gTreeListing")) next
    full <- paste(c(if (nzchar(listing$gPath[i])) listing$gPath[i], listing$name[i]), collapse = "::")
    path <- do.call(grid::gPath, as.list(strsplit(full, "::", fixed = TRUE)[[1]]))
    g <- grid::grid.get(path, strict = TRUE)
    kind <- classify(g, listing$name[i], full)
    if (!nzchar(kind)) next
    counter <- counter + 1L
    enter(listing$vpPath[i])
    if (kind %in% c("point", "curve")) {
      pos <- locate(g$x, g$y)
      groups <- if (kind == "point") as.list(seq_along(pos$x)) else list(seq_along(pos$x))
      for (j in seq_along(groups)) {
        k <- groups[[j]]
        if (!all(is.finite(c(pos$x[k], pos$y[k])))) next
        id <- paste(counter, if (kind == "point") j else 0, sep = ":")
        coords <- paste(paste(signif(pos$x[k], 7), signif(pos$y[k], 7), sep = ","), collapse = ";")
        breaks <- integer()
        if (kind == "curve") {
          if (!is.null(g$id)) breaks <- which(c(TRUE, diff(g$id) != 0)) - 1L
          else if (!is.null(g$id.lengths)) breaks <- c(0L, head(cumsum(g$id.lengths), -1L))
        }
        rows <- c(rows, paste(id, kind, coords, paste(breaks, collapse = ","), sep = "\t"))
      }
    } else {
      if (kind == "legend") {
        a <- locate(grid::unit(0, "npc"), grid::unit(0, "npc"))
        b <- locate(grid::unit(1, "npc"), grid::unit(1, "npc"))
      } else {
        a <- locate(grid::grobX(g, 180), grid::grobY(g, 270))
        b <- locate(grid::grobX(g, 0), grid::grobY(g, 90))
      }
      coords <- paste(c(a$x, a$y, b$x, b$y), collapse = ",")
      if (all(is.finite(c(a$x, a$y, b$x, b$y)))) rows <- c(rows, paste(if (kind == "legend") "legend:0" else paste(counter, 0, sep = ":"), kind, coords, sep = "\t"))
    }
  }
  grid::upViewport(0)
  assign(".fw_geometry", paste(rows, collapse = "\n"), envir = globalenv())
  invisible(NULL)
}

# Record the edited display list on a disposable device. Only its final scene is
# drawn to the PDF destination, so grid.refresh cannot append intermediate pages.
figweave_scene <- function(plot, moves = list(), width = 7, height = 5) {
  grDevices::pdf(NULL, width = width, height = height)
  on.exit(grDevices::dev.off())
  figweave_draw(plot, moves, width, height)
  grid::grid.grab()
}

figweave_plot <- p + ggplot2::theme(text = ggplot2::element_text(size = 10), legend.position = "right")
figweave_result <- figweave_scene(figweave_plot, list("legend:0" = c(-0.649999929028888,0.2299999682047108)), 7, 5)
grid::grid.newpage()
grid::grid.draw(figweave_result)
