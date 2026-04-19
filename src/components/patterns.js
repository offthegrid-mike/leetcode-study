import { createElement, escapeHtml } from '../utils/helpers.js';

let patternsData = null;

async function loadPatterns() {
  if (patternsData) return patternsData;
  try {
    const res = await fetch('../src/data/patterns.json');
    patternsData = await res.json();
  } catch {
    patternsData = getDefaultPatterns();
  }
  return patternsData;
}

export async function renderPatterns(container) {
  container.innerHTML = '';
  const page = createElement('div', 'page-patterns');
  page.innerHTML = `<h2 class="page-title">🗂️ Pattern Reference</h2>`;

  const patterns = await loadPatterns();

  patterns.forEach(pattern => {
    const card = createElement('div', 'problem-section pattern-card');
    card.innerHTML = `
      <h3 class="section-title">${escapeHtml(pattern.name)}</h3>
      <p class="pattern-desc">${escapeHtml(pattern.description)}</p>
      <div class="pattern-when">
        <h4>When to Use</h4>
        <ul>${pattern.when_to_use.map(w => `<li>${escapeHtml(w)}</li>`).join('')}</ul>
      </div>
      <div class="pattern-template">
        <h4>Template (Python)</h4>
        <pre class="code-block"><code class="language-python">${escapeHtml(pattern.template_python)}</code></pre>
      </div>
      <div class="pattern-template">
        <h4>Template (JavaScript)</h4>
        <pre class="code-block"><code class="language-javascript">${escapeHtml(pattern.template_js)}</code></pre>
      </div>
      <div class="pattern-complexity">
        <span>Time: ${pattern.time_complexity}</span> · <span>Space: ${pattern.space_complexity}</span>
      </div>
    `;
    page.appendChild(card);
  });

  container.appendChild(page);
  if (window.Prism) Prism.highlightAllUnder(container);
}

function getDefaultPatterns() {
  return [
    {
      name: "Two Pointers",
      description: "Use two pointers moving toward each other or in the same direction to solve array/string problems in O(n) time.",
      when_to_use: ["Sorted array pair problems", "Palindrome checking", "Removing duplicates in-place", "Container/area problems"],
      template_python: "left, right = 0, len(arr) - 1\nwhile left < right:\n    if condition:\n        left += 1\n    else:\n        right -= 1",
      template_js: "let left = 0, right = arr.length - 1;\nwhile (left < right) {\n    if (condition) left++;\n    else right--;\n}",
      time_complexity: "O(n)",
      space_complexity: "O(1)"
    },
    {
      name: "Sliding Window",
      description: "Maintain a window over a contiguous subarray/substring, expanding and shrinking to find optimal results.",
      when_to_use: ["Contiguous subarray/substring problems", "Maximum/minimum length subarray", "String anagram/permutation", "Fixed or variable window size"],
      template_python: "left = 0\nfor right in range(len(arr)):\n    # add arr[right] to window\n    while window_invalid:\n        # remove arr[left] from window\n        left += 1\n    # update result",
      template_js: "let left = 0;\nfor (let right = 0; right < arr.length; right++) {\n    // add arr[right] to window\n    while (windowInvalid) {\n        // remove arr[left] from window\n        left++;\n    }\n    // update result\n}",
      time_complexity: "O(n)",
      space_complexity: "O(1) to O(n)"
    },
    {
      name: "Binary Search",
      description: "Divide the search space in half each step. Works on sorted arrays or monotonic functions.",
      when_to_use: ["Searching sorted arrays", "Finding boundaries (first/last occurrence)", "Optimization problems (minimize/maximize)", "Search on answer space"],
      template_python: "left, right = 0, len(arr) - 1\nwhile left <= right:\n    mid = (left + right) // 2\n    if arr[mid] == target:\n        return mid\n    elif arr[mid] < target:\n        left = mid + 1\n    else:\n        right = mid - 1",
      template_js: "let left = 0, right = arr.length - 1;\nwhile (left <= right) {\n    const mid = Math.floor((left + right) / 2);\n    if (arr[mid] === target) return mid;\n    else if (arr[mid] < target) left = mid + 1;\n    else right = mid - 1;\n}",
      time_complexity: "O(log n)",
      space_complexity: "O(1)"
    },
    {
      name: "Hash Map",
      description: "Use a hash map for O(1) lookups to track frequencies, indices, or seen values.",
      when_to_use: ["Two Sum type problems", "Frequency counting", "Checking for duplicates", "Group anagrams", "Subarray sum problems"],
      template_python: "seen = {}\nfor i, val in enumerate(arr):\n    complement = target - val\n    if complement in seen:\n        return [seen[complement], i]\n    seen[val] = i",
      template_js: "const seen = new Map();\nfor (let i = 0; i < arr.length; i++) {\n    const comp = target - arr[i];\n    if (seen.has(comp)) return [seen.get(comp), i];\n    seen.set(arr[i], i);\n}",
      time_complexity: "O(n)",
      space_complexity: "O(n)"
    },
    {
      name: "Stack (Monotonic)",
      description: "Use a stack to maintain elements in monotonically increasing or decreasing order for next greater/smaller element problems.",
      when_to_use: ["Next greater/smaller element", "Daily temperatures", "Histogram problems", "Valid parentheses", "Expression evaluation"],
      template_python: "stack = []\nfor i, val in enumerate(arr):\n    while stack and arr[stack[-1]] < val:\n        idx = stack.pop()\n        result[idx] = val  # or i - idx\n    stack.append(i)",
      template_js: "const stack = [];\nfor (let i = 0; i < arr.length; i++) {\n    while (stack.length && arr[stack[stack.length-1]] < arr[i]) {\n        const idx = stack.pop();\n        result[idx] = arr[i];\n    }\n    stack.push(i);\n}",
      time_complexity: "O(n)",
      space_complexity: "O(n)"
    },
    {
      name: "BFS (Breadth-First Search)",
      description: "Explore level by level using a queue. Best for shortest path in unweighted graphs.",
      when_to_use: ["Shortest path (unweighted)", "Level-order traversal", "Rotting oranges / spreading", "Word ladder", "Minimum steps problems"],
      template_python: "from collections import deque\nqueue = deque([start])\nvisited = {start}\nwhile queue:\n    node = queue.popleft()\n    for neighbor in graph[node]:\n        if neighbor not in visited:\n            visited.add(neighbor)\n            queue.append(neighbor)",
      template_js: "const queue = [start];\nconst visited = new Set([start]);\nwhile (queue.length) {\n    const node = queue.shift();\n    for (const neighbor of graph[node]) {\n        if (!visited.has(neighbor)) {\n            visited.add(neighbor);\n            queue.push(neighbor);\n        }\n    }\n}",
      time_complexity: "O(V + E)",
      space_complexity: "O(V)"
    },
    {
      name: "DFS (Depth-First Search)",
      description: "Explore as deep as possible before backtracking. Used for graph traversal, connected components, and path finding.",
      when_to_use: ["Connected components", "Island counting", "Path existence", "Cycle detection", "Topological ordering prerequisites"],
      template_python: "def dfs(node, visited):\n    visited.add(node)\n    for neighbor in graph[node]:\n        if neighbor not in visited:\n            dfs(neighbor, visited)",
      template_js: "function dfs(node, visited) {\n    visited.add(node);\n    for (const neighbor of graph[node]) {\n        if (!visited.has(neighbor)) {\n            dfs(neighbor, visited);\n        }\n    }\n}",
      time_complexity: "O(V + E)",
      space_complexity: "O(V)"
    },
    {
      name: "Backtracking",
      description: "Build solutions incrementally, abandoning paths that can't lead to valid solutions. Try all possibilities systematically.",
      when_to_use: ["Generating subsets/permutations/combinations", "N-Queens", "Sudoku solving", "Word search", "Palindrome partitioning"],
      template_python: "def backtrack(path, choices):\n    if is_solution(path):\n        result.append(path[:])\n        return\n    for choice in choices:\n        if is_valid(choice):\n            path.append(choice)\n            backtrack(path, remaining)\n            path.pop()  # undo",
      template_js: "function backtrack(path, choices) {\n    if (isSolution(path)) {\n        result.push([...path]);\n        return;\n    }\n    for (const choice of choices) {\n        if (isValid(choice)) {\n            path.push(choice);\n            backtrack(path, remaining);\n            path.pop(); // undo\n        }\n    }\n}",
      time_complexity: "O(2^n) or O(n!)",
      space_complexity: "O(n)"
    },
    {
      name: "Dynamic Programming (1D)",
      description: "Break problem into overlapping subproblems. Store results to avoid recomputation. Bottom-up tabulation or top-down memoization.",
      when_to_use: ["Optimization (min/max) problems", "Counting paths/ways", "Fibonacci-like recurrences", "House robber pattern", "Coin change pattern"],
      template_python: "# Bottom-up\ndp = [0] * (n + 1)\ndp[0] = base_case\nfor i in range(1, n + 1):\n    dp[i] = transition(dp[i-1], dp[i-2], ...)\nreturn dp[n]",
      template_js: "// Bottom-up\nconst dp = new Array(n + 1).fill(0);\ndp[0] = baseCase;\nfor (let i = 1; i <= n; i++) {\n    dp[i] = transition(dp[i-1], dp[i-2]);\n}\nreturn dp[n];",
      time_complexity: "O(n) to O(n²)",
      space_complexity: "O(n), often O(1) optimizable"
    },
    {
      name: "Dynamic Programming (2D)",
      description: "Use a 2D table when the state depends on two dimensions (e.g., two strings, grid positions, subsequences).",
      when_to_use: ["Longest common subsequence", "Edit distance", "Unique paths in grid", "String matching", "Knapsack variants"],
      template_python: "dp = [[0] * (m + 1) for _ in range(n + 1)]\nfor i in range(1, n + 1):\n    for j in range(1, m + 1):\n        if condition:\n            dp[i][j] = dp[i-1][j-1] + 1\n        else:\n            dp[i][j] = max(dp[i-1][j], dp[i][j-1])\nreturn dp[n][m]",
      template_js: "const dp = Array.from({length: n+1}, () => Array(m+1).fill(0));\nfor (let i = 1; i <= n; i++) {\n    for (let j = 1; j <= m; j++) {\n        if (condition)\n            dp[i][j] = dp[i-1][j-1] + 1;\n        else\n            dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);\n    }\n}\nreturn dp[n][m];",
      time_complexity: "O(n × m)",
      space_complexity: "O(n × m), often O(m) optimizable"
    },
    {
      name: "Greedy",
      description: "Make the locally optimal choice at each step. Works when local optimum leads to global optimum.",
      when_to_use: ["Interval scheduling/merging", "Jump game problems", "Activity selection", "Huffman coding", "Gas station"],
      template_python: "# Sort by some criteria\nitems.sort(key=lambda x: x.end)\nresult = 0\nfor item in items:\n    if is_compatible(item):\n        result += 1\n        update_state(item)",
      template_js: "// Sort by some criteria\nitems.sort((a, b) => a.end - b.end);\nlet result = 0;\nfor (const item of items) {\n    if (isCompatible(item)) {\n        result++;\n        updateState(item);\n    }\n}",
      time_complexity: "O(n log n) due to sorting",
      space_complexity: "O(1) to O(n)"
    },
    {
      name: "Heap / Priority Queue",
      description: "Efficiently get min/max element. Use for streaming top-K, merge-K-sorted, or scheduling problems.",
      when_to_use: ["K-th largest/smallest", "Merge K sorted lists", "Top K frequent elements", "Task scheduling", "Median from data stream"],
      template_python: "import heapq\nheap = []\nfor val in stream:\n    heapq.heappush(heap, val)\n    if len(heap) > k:\n        heapq.heappop(heap)\nreturn heap[0]  # k-th largest",
      template_js: "// Use a MinPriorityQueue (or implement)\nconst pq = new MinPriorityQueue();\nfor (const val of stream) {\n    pq.enqueue(val);\n    if (pq.size() > k) pq.dequeue();\n}\nreturn pq.front().element;",
      time_complexity: "O(n log k)",
      space_complexity: "O(k)"
    },
    {
      name: "Trie (Prefix Tree)",
      description: "Tree structure for efficient string prefix operations. Each node represents a character.",
      when_to_use: ["Autocomplete/prefix search", "Word dictionary with wildcards", "Word search in grid", "Longest common prefix"],
      template_python: "class TrieNode:\n    def __init__(self):\n        self.children = {}\n        self.is_end = False\n\nclass Trie:\n    def __init__(self):\n        self.root = TrieNode()\n    \n    def insert(self, word):\n        node = self.root\n        for c in word:\n            if c not in node.children:\n                node.children[c] = TrieNode()\n            node = node.children[c]\n        node.is_end = True",
      template_js: "class TrieNode {\n    constructor() {\n        this.children = {};\n        this.isEnd = false;\n    }\n}\nclass Trie {\n    constructor() { this.root = new TrieNode(); }\n    insert(word) {\n        let node = this.root;\n        for (const c of word) {\n            if (!node.children[c]) node.children[c] = new TrieNode();\n            node = node.children[c];\n        }\n        node.isEnd = true;\n    }\n}",
      time_complexity: "O(L) per operation, L = word length",
      space_complexity: "O(N × L) total"
    },
    {
      name: "Union Find (Disjoint Set)",
      description: "Track connected components efficiently with union and find operations. Uses path compression and union by rank.",
      when_to_use: ["Connected components in graph", "Redundant connections", "Accounts merge", "Number of islands (alternative)", "MST (Kruskal's)"],
      template_python: "parent = list(range(n))\nrank = [0] * n\n\ndef find(x):\n    if parent[x] != x:\n        parent[x] = find(parent[x])  # path compression\n    return parent[x]\n\ndef union(x, y):\n    px, py = find(x), find(y)\n    if px == py: return False\n    if rank[px] < rank[py]: px, py = py, px\n    parent[py] = px\n    if rank[px] == rank[py]: rank[px] += 1\n    return True",
      template_js: "const parent = Array.from({length: n}, (_, i) => i);\nconst rank = new Array(n).fill(0);\nfunction find(x) {\n    if (parent[x] !== x) parent[x] = find(parent[x]);\n    return parent[x];\n}\nfunction union(x, y) {\n    let px = find(x), py = find(y);\n    if (px === py) return false;\n    if (rank[px] < rank[py]) [px, py] = [py, px];\n    parent[py] = px;\n    if (rank[px] === rank[py]) rank[px]++;\n    return true;\n}",
      time_complexity: "O(α(n)) ≈ O(1) amortized",
      space_complexity: "O(n)"
    },
    {
      name: "Topological Sort",
      description: "Linear ordering of vertices in a DAG such that for every edge u→v, u comes before v. Uses BFS (Kahn's) or DFS.",
      when_to_use: ["Course schedule / prerequisites", "Build order / task dependencies", "Alien dictionary", "Detecting cycles in directed graph"],
      template_python: "from collections import deque\nin_degree = [0] * n\nfor u, v in edges:\n    in_degree[v] += 1\nqueue = deque(i for i in range(n) if in_degree[i] == 0)\norder = []\nwhile queue:\n    node = queue.popleft()\n    order.append(node)\n    for neighbor in graph[node]:\n        in_degree[neighbor] -= 1\n        if in_degree[neighbor] == 0:\n            queue.append(neighbor)",
      template_js: "const inDegree = new Array(n).fill(0);\nfor (const [u, v] of edges) inDegree[v]++;\nconst queue = [];\nfor (let i = 0; i < n; i++) if (inDegree[i] === 0) queue.push(i);\nconst order = [];\nwhile (queue.length) {\n    const node = queue.shift();\n    order.push(node);\n    for (const nb of graph[node]) {\n        if (--inDegree[nb] === 0) queue.push(nb);\n    }\n}",
      time_complexity: "O(V + E)",
      space_complexity: "O(V)"
    },
    {
      name: "Interval Merging",
      description: "Sort intervals by start time, then merge overlapping ones by comparing end times.",
      when_to_use: ["Merge overlapping intervals", "Insert interval", "Meeting rooms", "Non-overlapping intervals", "Minimum platforms"],
      template_python: "intervals.sort(key=lambda x: x[0])\nmerged = [intervals[0]]\nfor start, end in intervals[1:]:\n    if start <= merged[-1][1]:\n        merged[-1][1] = max(merged[-1][1], end)\n    else:\n        merged.append([start, end])",
      template_js: "intervals.sort((a, b) => a[0] - b[0]);\nconst merged = [intervals[0]];\nfor (let i = 1; i < intervals.length; i++) {\n    const last = merged[merged.length - 1];\n    if (intervals[i][0] <= last[1]) {\n        last[1] = Math.max(last[1], intervals[i][1]);\n    } else {\n        merged.push(intervals[i]);\n    }\n}",
      time_complexity: "O(n log n)",
      space_complexity: "O(n)"
    },
    {
      name: "Bit Manipulation",
      description: "Use bitwise operators for efficient operations on binary representations of numbers.",
      when_to_use: ["Single number (XOR)", "Counting bits", "Power of two", "Subsets via bitmask", "Bitwise AND/OR/XOR patterns"],
      template_python: "# XOR to find single number\nresult = 0\nfor num in nums:\n    result ^= num\n\n# Count set bits\ndef count_bits(n):\n    count = 0\n    while n:\n        count += n & 1\n        n >>= 1\n    return count",
      template_js: "// XOR to find single number\nlet result = 0;\nfor (const num of nums) result ^= num;\n\n// Count set bits\nfunction countBits(n) {\n    let count = 0;\n    while (n) {\n        count += n & 1;\n        n >>= 1;\n    }\n    return count;\n}",
      time_complexity: "O(n) or O(log n)",
      space_complexity: "O(1)"
    }
  ];
}
