import matplotlib.pyplot as plt
import seaborn as sns

sns.set_theme(style="whitegrid")
fig, ax = plt.subplots(figsize=(6, 4))
sns.scatterplot(x=[1, 2, 3, 4, 5], y=[2, 3, 2.5, 5, 4.5], ax=ax)
ax.set(title="Seaborn scatter plot", xlabel="Time", ylabel="Response")
fig.tight_layout()
