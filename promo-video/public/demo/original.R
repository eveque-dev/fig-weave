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
