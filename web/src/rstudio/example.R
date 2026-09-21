library(ggplot2)

# Keep the plot in p. FigWeave applies styling to a copy of this object.
p <- ggplot(iris, aes(Sepal.Length, Petal.Length, colour = Species)) +
  geom_point(size = 2.5, alpha = 0.8) +
  labs(title = "Iris morphology", x = "Sepal length (cm)",
       y = "Petal length (cm)", colour = "Species") +
  theme_minimal(base_size = 12)
