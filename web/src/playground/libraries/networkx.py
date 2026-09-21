import matplotlib.pyplot as plt
import networkx as nx

fig, ax = plt.subplots(figsize=(6, 4))
graph = nx.cycle_graph(6)
nx.draw_networkx(graph, pos=nx.circular_layout(graph), ax=ax, node_color="#88bde6")
ax.set_title("NetworkX cycle graph")
ax.set_axis_off()
fig.tight_layout()
