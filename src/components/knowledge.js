import { createElement, escapeHtml } from '../utils/helpers.js';

const DATA_STRUCTURES = [
  {
    name: 'Array',
    desc: 'Contiguous block of memory storing elements of the same type. Supports random access by index in constant time.',
    ops: [
      ['Access', 'O(1)', '—'],
      ['Search', 'O(n)', 'O(log n) if sorted'],
      ['Insert (end)', 'O(1)*', 'Amortized'],
      ['Insert (middle)', 'O(n)', '—'],
      ['Delete (end)', 'O(1)', '—'],
      ['Delete (middle)', 'O(n)', '—'],
    ],
    when: 'Use when you need fast random access and the size is known or changes infrequently.',
  },
  {
    name: 'Linked List',
    desc: 'Linear collection of nodes where each node points to the next. Singly or doubly linked variants exist.',
    ops: [
      ['Access', 'O(n)', '—'],
      ['Search', 'O(n)', '—'],
      ['Insert (head)', 'O(1)', '—'],
      ['Insert (middle)', 'O(n)', 'O(1) if at pointer'],
      ['Delete (head)', 'O(1)', '—'],
      ['Delete (middle)', 'O(n)', 'O(1) if at pointer'],
    ],
    when: 'Use when you need frequent insertions/deletions at the head or at a known position.',
  },
  {
    name: 'Stack',
    desc: 'LIFO (Last-In-First-Out) data structure. Elements are added and removed from the same end (top).',
    ops: [
      ['Push', 'O(1)', '—'],
      ['Pop', 'O(1)', '—'],
      ['Peek', 'O(1)', '—'],
      ['Search', 'O(n)', '—'],
    ],
    when: 'Use for matching brackets, undo operations, DFS, and monotonic stack patterns.',
  },
  {
    name: 'Queue',
    desc: 'FIFO (First-In-First-Out) data structure. Elements are added at the back and removed from the front.',
    ops: [
      ['Enqueue', 'O(1)', '—'],
      ['Dequeue', 'O(1)', '—'],
      ['Peek', 'O(1)', '—'],
      ['Search', 'O(n)', '—'],
    ],
    when: 'Use for BFS, level-order traversal, scheduling, and sliding window maximums (deque).',
  },
  {
    name: 'Hash Map / Set',
    desc: 'Key-value store using a hash function for near-constant-time lookups. A Set stores only keys.',
    ops: [
      ['Insert', 'O(1)*', 'Average case'],
      ['Delete', 'O(1)*', 'Average case'],
      ['Search', 'O(1)*', 'Average case'],
      ['Worst case', 'O(n)', 'Hash collisions'],
    ],
    when: 'Use when you need fast lookups, frequency counting, or duplicate detection.',
  },
  {
    name: 'Binary Tree',
    desc: 'Hierarchical structure where each node has at most two children (left and right).',
    ops: [
      ['Search', 'O(n)', '—'],
      ['Insert', 'O(n)', '—'],
      ['Delete', 'O(n)', '—'],
      ['Traversal', 'O(n)', 'In/pre/post/level order'],
    ],
    when: 'Use for hierarchical data, expression parsing, and as the basis for BSTs and heaps.',
  },
  {
    name: 'Binary Search Tree (BST)',
    desc: 'Binary tree where left child < parent < right child. Enables efficient search when balanced.',
    ops: [
      ['Search', 'O(log n)*', 'O(n) worst if unbalanced'],
      ['Insert', 'O(log n)*', 'O(n) worst if unbalanced'],
      ['Delete', 'O(log n)*', 'O(n) worst if unbalanced'],
      ['Min / Max', 'O(log n)*', 'O(n) worst if unbalanced'],
    ],
    when: 'Use when you need sorted data with fast search, insert, and delete (prefer balanced BSTs).',
  },
  {
    name: 'Heap / Priority Queue',
    desc: 'Complete binary tree satisfying the heap property: parent is always ≤ (min-heap) or ≥ (max-heap) its children.',
    ops: [
      ['Insert', 'O(log n)', '—'],
      ['Extract Min/Max', 'O(log n)', '—'],
      ['Peek Min/Max', 'O(1)', '—'],
      ['Heapify', 'O(n)', 'Build from array'],
    ],
    when: 'Use for top-K problems, merge-K-sorted, scheduling, and Dijkstra\'s algorithm.',
  },
  {
    name: 'Trie (Prefix Tree)',
    desc: 'Tree-like structure where each node represents a character. Efficient for prefix-based operations on strings.',
    ops: [
      ['Insert word', 'O(L)', 'L = word length'],
      ['Search word', 'O(L)', '—'],
      ['Prefix search', 'O(L)', '—'],
      ['Delete word', 'O(L)', '—'],
    ],
    when: 'Use for autocomplete, spell checking, prefix matching, and word search problems.',
  },
  {
    name: 'Graph',
    desc: 'Collection of vertices (nodes) connected by edges. Can be directed/undirected, weighted/unweighted.',
    ops: [
      ['Add vertex', 'O(1)', '—'],
      ['Add edge', 'O(1)', '—'],
      ['BFS / DFS', 'O(V + E)', '—'],
      ['Check adjacency', 'O(1)', 'Adj. matrix; O(V) for adj. list'],
    ],
    when: 'Use for network/relationship problems, shortest paths, connectivity, and cycle detection.',
  },
  {
    name: 'Union-Find (Disjoint Set)',
    desc: 'Tracks a set of elements partitioned into disjoint subsets. Supports near-constant-time union and find with path compression and union by rank.',
    ops: [
      ['Find', 'O(α(n))', '≈ O(1) amortized'],
      ['Union', 'O(α(n))', '≈ O(1) amortized'],
      ['Connected', 'O(α(n))', '≈ O(1) amortized'],
    ],
    when: 'Use for connected components, cycle detection in undirected graphs, and Kruskal\'s MST.',
  },
];

const ALGORITHM_PATTERNS = [
  {
    name: 'Two Pointers',
    desc: 'Use two pointers moving toward each other or in the same direction to process a sorted array or linked list in linear time.',
    time: 'O(n)',
    signals: 'Sorted input, pair/triplet search, palindrome check, removing duplicates in-place.',
  },
  {
    name: 'Sliding Window',
    desc: 'Maintain a window over a contiguous subarray or substring, expanding and shrinking to find an optimal result.',
    time: 'O(n)',
    signals: 'Contiguous subarray/substring, max/min length, fixed or variable window, string anagram problems.',
  },
  {
    name: 'Binary Search',
    desc: 'Divide the search space in half each step. Works on sorted arrays or any monotonic condition.',
    time: 'O(log n)',
    signals: 'Sorted array, finding boundaries, minimize/maximize an answer, "search on answer" phrasing.',
  },
  {
    name: 'BFS (Breadth-First Search)',
    desc: 'Explore level by level using a queue. Guarantees shortest path in unweighted graphs.',
    time: 'O(V + E)',
    signals: 'Shortest path (unweighted), level-order traversal, minimum steps, spreading/infection problems.',
  },
  {
    name: 'DFS (Depth-First Search)',
    desc: 'Explore as deep as possible before backtracking. Uses recursion or an explicit stack.',
    time: 'O(V + E)',
    signals: 'Connected components, path existence, cycle detection, island counting, tree traversals.',
  },
  {
    name: 'Dynamic Programming',
    desc: 'Break a problem into overlapping subproblems and store results to avoid recomputation. Bottom-up tabulation or top-down memoization.',
    time: 'O(n) to O(n²) typical',
    signals: '"Count the number of ways", "minimum/maximum cost", optimal substructure + overlapping subproblems.',
  },
  {
    name: 'Greedy',
    desc: 'Make the locally optimal choice at each step, hoping it leads to a global optimum. Requires greedy-choice property.',
    time: 'O(n log n) (sort-dominated)',
    signals: 'Interval scheduling/merging, activity selection, Huffman coding, problems where local optimal = global optimal.',
  },
  {
    name: 'Backtracking',
    desc: 'Build solutions incrementally, abandoning candidates that violate constraints. Systematically explores all possibilities.',
    time: 'O(2ⁿ) or O(n!)',
    signals: 'Generate all subsets/permutations/combinations, constraint satisfaction (Sudoku, N-Queens), word search.',
  },
  {
    name: 'Divide and Conquer',
    desc: 'Split the problem into smaller independent subproblems, solve each recursively, then combine results.',
    time: 'O(n log n) typical',
    signals: 'Merge sort, quick sort, closest pair of points, "solve left half, right half, combine" structure.',
  },
  {
    name: 'Topological Sort',
    desc: 'Linear ordering of vertices in a DAG such that for every edge u → v, u comes before v. Uses BFS (Kahn\'s) or DFS.',
    time: 'O(V + E)',
    signals: 'Prerequisites/dependencies, build order, course schedule, detecting cycles in directed graphs.',
  },
];

const BIG_O_REFERENCE = [
  { notation: 'O(1)', name: 'Constant', example: 'Array access by index, hash map lookup' },
  { notation: 'O(log n)', name: 'Logarithmic', example: 'Binary search on a sorted array' },
  { notation: 'O(n)', name: 'Linear', example: 'Single loop through an array, linear search' },
  { notation: 'O(n log n)', name: 'Linearithmic', example: 'Merge sort, heap sort, efficient sorting' },
  { notation: 'O(n²)', name: 'Quadratic', example: 'Nested loops, bubble sort, brute-force pairs' },
  { notation: 'O(2ⁿ)', name: 'Exponential', example: 'Recursive Fibonacci without memoization, subsets' },
  { notation: 'O(n!)', name: 'Factorial', example: 'Generating all permutations, traveling salesman brute-force' },
];

function renderOpsTable(ops) {
  const header = ops[0].length === 3
    ? '<tr><th>Operation</th><th>Time</th><th>Note</th></tr>'
    : '<tr><th>Operation</th><th>Time</th></tr>';
  const rows = ops.map(row =>
    `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`
  ).join('');
  return `<table class="knowledge-table"><thead>${header}</thead><tbody>${rows}</tbody></table>`;
}

function renderCollapsibleSection(title, contentHtml) {
  const section = createElement('div', 'problem-section');
  const heading = createElement('div', 'section-title knowledge-section', `▸ ${escapeHtml(title)}`);
  const content = createElement('div', 'knowledge-section-content');
  content.innerHTML = contentHtml;
  content.style.display = 'none';

  heading.addEventListener('click', () => {
    const showing = content.style.display !== 'none';
    content.style.display = showing ? 'none' : 'block';
    heading.textContent = (showing ? '▸ ' : '▾ ') + escapeHtml(title);
  });

  section.appendChild(heading);
  section.appendChild(content);
  return section;
}

export function renderKnowledge(container) {
  container.innerHTML = '';
  const page = createElement('div', 'page-knowledge');
  page.innerHTML = `<h2 class="page-title">📚 Knowledge Base</h2>`;

  // Data Structures
  const dsHeader = createElement('h3', 'section-title', '🏗️ Data Structures');
  dsHeader.style.marginBottom = 'var(--space-sm)';
  page.appendChild(dsHeader);

  DATA_STRUCTURES.forEach(ds => {
    const html = `
      <p class="knowledge-desc">${escapeHtml(ds.desc)}</p>
      ${renderOpsTable(ds.ops)}
      <p class="knowledge-when">💡 ${escapeHtml(ds.when)}</p>
    `;
    page.appendChild(renderCollapsibleSection(ds.name, html));
  });

  // Algorithm Patterns
  const apHeader = createElement('h3', 'section-title', '⚡ Algorithm Patterns');
  apHeader.style.marginTop = 'var(--space-lg)';
  apHeader.style.marginBottom = 'var(--space-sm)';
  page.appendChild(apHeader);

  ALGORITHM_PATTERNS.forEach(pattern => {
    const html = `
      <p class="knowledge-desc">${escapeHtml(pattern.desc)}</p>
      <p class="knowledge-desc"><span class="pattern-tag">${escapeHtml(pattern.time)}</span></p>
      <p class="knowledge-when">🔍 ${escapeHtml(pattern.signals)}</p>
    `;
    page.appendChild(renderCollapsibleSection(pattern.name, html));
  });

  // Big-O Reference
  const boHeader = createElement('h3', 'section-title', '📈 Big-O Complexity Reference');
  boHeader.style.marginTop = 'var(--space-lg)';
  boHeader.style.marginBottom = 'var(--space-sm)';
  page.appendChild(boHeader);

  const boSection = createElement('div', 'problem-section');
  const boContent = BIG_O_REFERENCE.map(item => `
    <div class="bigo-card">
      <span class="bigo-notation">${escapeHtml(item.notation)}</span>
      <span class="bigo-example"><strong>${escapeHtml(item.name)}</strong> — ${escapeHtml(item.example)}</span>
    </div>
  `).join('');
  boSection.innerHTML = boContent;
  page.appendChild(boSection);

  container.appendChild(page);
}
