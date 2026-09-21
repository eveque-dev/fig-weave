import matplotlib.pyplot as plt
import pandas as pd

data = pd.DataFrame({"Control": [2, 3, 4], "Treatment": [3, 5, 6]}, index=["A", "B", "C"])
ax = data.plot.bar(figsize=(6, 4), rot=0, title="Pandas group comparison")
ax.set_ylabel("Response")
plt.tight_layout()
