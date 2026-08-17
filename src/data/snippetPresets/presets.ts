import type { SnippetPreset } from '@/core/types';

export const snippetPresets: SnippetPreset[] = [
  {
    id: 'py-loop',
    name: 'Python For Loop',
    category: 'Python Basics',
    language: 'python',
    description: 'Basic for loop with range',
    tags: ['python', 'loop', 'beginner'],
    code: `# For loop basics
for i in range(5):
    print(f"Iteration {i}")

# Loop with step
for i in range(0, 10, 2):
    print(f"Even: {i}")

# Enumerate
fruits = ["apple", "banana", "cherry"]
for index, fruit in enumerate(fruits):
    print(f"{index}: {fruit}")`,
  },
  {
    id: 'py-function',
    name: 'Python Functions',
    category: 'Python Basics',
    language: 'python',
    description: 'Function definitions with args',
    tags: ['python', 'function', 'beginner'],
    code: `# Simple function
def greet(name):
    return f"Hello, {name}!"

# Default parameters
def calculate(total, tax_rate=0.1):
    return total * (1 + tax_rate)

# *args and **kwargs
def flexible(*args, **kwargs):
    for arg in args:
        print(arg)
    for key, value in kwargs.items():
        print(f"{key}: {value}")

print(greet("World"))`,
  },
  {
    id: 'py-list-dict',
    name: 'Python Lists & Dicts',
    category: 'Python Basics',
    language: 'python',
    description: 'List and dictionary operations',
    tags: ['python', 'list', 'dict', 'beginner'],
    code: `# List comprehension
squares = [x**2 for x in range(10)]
even_squares = [x**2 for x in range(10) if x % 2 == 0]

# Dictionary comprehension
word_lengths = {word: len(word) for word in ["hello", "world"]}

# List methods
stack = []
stack.append("first")
stack.append("second")
last = stack.pop()

# Dictionary operations
config = {"debug": True, "version": "1.0"}
config.setdefault("port", 8080)`,
  },
  {
    id: 'js-async',
    name: 'JavaScript Async/Await',
    category: 'JavaScript',
    language: 'javascript',
    description: 'Async patterns and error handling',
    tags: ['javascript', 'async', 'await', 'promise'],
    code: `// Basic async function
async function fetchUser(id) {
    try {
        const response = await fetch(\`/api/users/\${id}\`);
        if (!response.ok) throw new Error("Not found");
        return await response.json();
    } catch (error) {
        console.error("Failed:", error.message);
        return null;
    }
}

// Parallel requests
async function loadDashboard() {
    const [users, posts, comments] = await Promise.all([
        fetchUser(1),
        fetchPosts(),
        fetchComments(),
    ]);
    return { users, posts, comments };
}`,
  },
  {
    id: 'react-hooks',
    name: 'React Hooks',
    category: 'React',
    language: 'tsx',
    description: 'Common React hooks patterns',
    tags: ['react', 'hooks', 'state', 'effect'],
    code: `import { useState, useEffect, useCallback, useMemo } from "react";

function UserProfile({ userId }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUser(userId).then(data => {
            setUser(data);
            setLoading(false);
        });
    }, [userId]);

    const fullName = useMemo(() => {
        if (!user) return "";
        return \`\${user.first} \${user.last}\`;
    }, [user]);

    const handleSave = useCallback(async (updates) => {
        await updateUser(userId, updates);
    }, [userId]);

    if (loading) return <Spinner />;
    return <h1>{fullName}</h1>;
}`,
  },
  {
    id: 'sql-join',
    name: 'SQL JOIN Queries',
    category: 'SQL',
    language: 'sql',
    description: 'Common SQL join patterns',
    tags: ['sql', 'join', 'database'],
    code: `-- INNER JOIN: matching records
SELECT users.name, orders.total
FROM users
INNER JOIN orders ON users.id = orders.user_id;

-- LEFT JOIN: all left + matching right
SELECT users.name, COUNT(orders.id) as order_count
FROM users
LEFT JOIN orders ON users.id = orders.user_id
GROUP BY users.name;

-- Multiple JOINs
SELECT
    u.name,
    o.total,
    p.product_name
FROM users u
JOIN orders o ON u.id = o.user_id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
WHERE o.total > 100;`,
  },
  {
    id: 'bash-basics',
    name: 'Bash Scripting Basics',
    category: 'DevOps',
    language: 'bash',
    description: 'Essential bash patterns',
    tags: ['bash', 'shell', 'devops'],
    code: `#!/bin/bash
set -euo pipefail

# Variables
NAME="World"
echo "Hello, $NAME!"

# Conditionals
if [ -f "config.json" ]; then
    echo "Config found"
else
    echo "No config, using defaults"
fi

# Loops
for file in *.ts; do
    echo "Processing: $file"
done

# Functions
backup() {
    local src=$1
    local dest=$2
    cp -r "$src" "$dest"
    echo "Backed up $src -> $dest"
}`,
  },
  {
    id: 'git-workflow',
    name: 'Git Workflow',
    category: 'DevOps',
    language: 'bash',
    description: 'Common git commands',
    tags: ['git', 'workflow', 'version-control'],
    code: `# Create feature branch
git checkout -b feature/new-login main

# Stage and commit
git add -A
git commit -m "feat: add login form"

# Interactive rebase
git rebase -i HEAD~3

# Push and create PR
git push -u origin feature/new-login

# Sync with main
git fetch origin
git rebase origin/main

# Resolve conflicts
git add .
git rebase --continue

# Squash merge
git checkout main
git merge --squash feature/new-login
git commit -m "feat: implement user login"`,
  },
  {
    id: 'rest-api',
    name: 'REST API Calls',
    category: 'JavaScript',
    language: 'javascript',
    description: 'Fetch API patterns',
    tags: ['javascript', 'api', 'fetch', 'rest'],
    code: `// GET request
const getUsers = async () => {
    const res = await fetch("/api/users");
    return res.json();
};

// POST with body
const createUser = async (data) => {
    const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed");
    return res.json();
};

// Error handling wrapper
async function api(url, options = {}) {
    const res = await fetch(url, options);
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || res.statusText);
    }
    return res.json();
}`,
  },
  {
    id: 'sorting-algo',
    name: 'Sorting Algorithms',
    category: 'Algorithms',
    language: 'python',
    description: 'Common sorting implementations',
    tags: ['python', 'algorithm', 'sorting', 'interview'],
    code: `# Bubble Sort - O(n²)
def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr

# Quick Sort - O(n log n) average
def quick_sort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quick_sort(left) + middle + quick_sort(right)

# Binary Search - O(log n)
def binary_search(arr, target):
    lo, hi = 0, len(arr) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1`,
  },
  {
    id: 'pseudo-binary-search',
    name: 'Binary Search (Pseudocode)',
    category: 'Pseudocode',
    language: 'pseudo',
    description: 'Classic algorithm in pseudocode',
    tags: ['pseudocode', 'algorithm', 'search', 'teaching'],
    code: `FUNCTION binary_search(array, target)
    SET low <- 0
    SET high <- LENGTH(array) - 1

    WHILE low <= high DO
        SET mid <- (low + high) / 2

        IF array[mid] = target THEN
            RETURN mid
        ELSE IF array[mid] < target THEN
            SET low <- mid + 1
        ELSE
            SET high <- mid - 1
        END IF
    END WHILE

    RETURN -1  // not found
END FUNCTION`,
  },
  {
    id: 'pseudo-factorial',
    name: 'Recursion (Pseudocode)',
    category: 'Pseudocode',
    language: 'pseudo',
    description: 'Recursive factorial for teaching',
    tags: ['pseudocode', 'recursion', 'teaching', 'factorial'],
    code: `// Factorial using recursion
FUNCTION factorial(n)
    // Base case
    IF n <= 1 THEN
        RETURN 1
    END IF

    // Recursive case
    SET result <- n * factorial(n - 1)
    RETURN result
END FUNCTION

// Test it
PRINT factorial(5)   // 120
PRINT factorial(10)  // 3628800`,
  },
  {
    id: 'powershell-basics',
    name: 'PowerShell Basics',
    category: 'DevOps',
    language: 'powershell',
    description: 'PowerShell common patterns',
    tags: ['powershell', 'windows', 'devops'],
    code: `# Variables and output
$name = "World"
Write-Host "Hello, $name!"

# Get service status
Get-Service | Where-Object { $_.Status -eq "Running" }

# Loop with filtering
Get-Process | ForEach-Object {
    if ($_.CPU -gt 100) {
        Write-Host "$($_.Name): $($_.CPU) seconds"
    }
}

# Function with parameters
function Get-FolderSize {
    param([string]$Path)
    $size = (Get-ChildItem -Path $Path -Recurse | Measure-Object -Property Length -Sum).Sum
    return "{0:N2} MB" -f ($size / 1MB)
}`,
  },
];
