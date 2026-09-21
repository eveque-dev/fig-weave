import seaborn from './libraries/seaborn.py?raw'
import pandas from './libraries/pandas.py?raw'
import networkx from './libraries/networkx.py?raw'

export const LIBRARY_EXAMPLES = [
  { name: 'seaborn', source: seaborn },
  { name: 'pandas', source: pandas },
  { name: 'NetworkX', source: networkx },
] as const
