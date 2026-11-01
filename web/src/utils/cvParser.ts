// Utility to extract text and match skills/roles/levels from CV files (PDF, TXT, Markdown)

export interface CvParseResult {
  roles: string[];
  stack: string[];
  levels: string[];
  wordCount: number;
  extractedSnippet: string;
}

const KNOWN_ROLES = [
  "Software Engineer",
  "Full Stack Engineer",
  "Full Stack Developer",
  "Frontend Engineer",
  "Frontend Developer",
  "Backend Engineer",
  "Backend Developer",
  "Web Developer",
  "DevOps Engineer",
  "Site Reliability Engineer",
  "SRE",
  "Cloud Engineer",
  "Mobile Engineer",
  "iOS Developer",
  "Android Developer",
  "Data Engineer",
  "Data Scientist",
  "Machine Learning Engineer",
  "AI Engineer",
  "QA Engineer",
  "Test Automation Engineer",
  "Security Engineer",
  "Solutions Architect",
  "System Architect",
  "Engineering Manager",
  "Tech Lead",
  "Product Designer",
  "UI/UX Designer",
];

const KNOWN_STACK = [
  // Languages
  "TypeScript",
  "JavaScript",
  "Python",
  "Go",
  "Golang",
  "Rust",
  "Java",
  "Kotlin",
  "Swift",
  "PHP",
  "Ruby",
  "C++",
  "C#",
  ".NET",
  "Elixir",
  "SQL",

  // Frontend & UI
  "React",
  "Next.js",
  "Vue",
  "Nuxt",
  "Svelte",
  "Angular",
  "Tailwind",
  "Tailwind CSS",
  "HTML5",
  "CSS3",
  "Redux",
  "Zustand",
  "GraphQL",
  "Vite",
  "Webpack",

  // Backend & APIs
  "Node.js",
  "Express",
  "NestJS",
  "FastAPI",
  "Django",
  "Flask",
  "Spring Boot",
  "Ruby on Rails",
  "Rails",
  "Laravel",
  "Gin",
  "gRPC",
  "REST API",

  // Databases & Caching
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "Supabase",
  "Firebase",
  "DynamoDB",
  "Elasticsearch",
  "Prisma",
  "Drizzle",

  // Cloud & DevOps
  "Docker",
  "Kubernetes",
  "AWS",
  "GCP",
  "Azure",
  "Terraform",
  "CI/CD",
  "GitHub Actions",
  "Linux",
  "Nginx",
  "Kafka",
  "RabbitMQ",
  "Cloudflare",

  // AI & Data
  "PyTorch",
  "TensorFlow",
  "OpenAI",
  "LangChain",
  "LLM",
  "Pandas",
  "NumPy",
];

const KNOWN_LEVELS = [
  "Senior",
  "Lead",
  "Principal",
  "Staff",
  "Mid-Level",
  "Mid",
  "Junior",
  "Associate",
  "Intern",
];

/**
 * Extracts plain text from an uploaded PDF file using pdfjs-dist.
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  try {
    const pdfjsLib = await import("pdfjs-dist");
    // Point worker to unpkg CDN for reliable static client execution
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    }

    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = "";

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        // @ts-expect-error item has str property in pdfjs TextItem
        .map((item) => item.str || "")
        .join(" ");
      fullText += pageText + "\n";
    }

    return fullText;
  } catch (err) {
    console.warn("pdfjs extraction failed, falling back to raw buffer scan:", err);
    // Fallback: decode ascii chunks from arrayBuffer
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const raw = decoder.decode(arrayBuffer);
    // Filter printable ascii characters
    return raw.replace(/[^\x20-\x7E\n]/g, " ");
  }
}

/**
 * Analyzes CV text against tech dictionaries to find candidate roles, stack, and levels.
 */
export function analyzeCvText(text: string): CvParseResult {
  const lower = text.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);

  const matchedRoles = new Set<string>();
  const matchedStack = new Set<string>();
  const matchedLevels = new Set<string>();

  // Check roles
  for (const role of KNOWN_ROLES) {
    const rLower = role.toLowerCase();
    // Match word boundaries where possible
    const regex = new RegExp(`\\b${escapeRegExp(rLower)}\\b`, "i");
    if (regex.test(lower)) {
      matchedRoles.add(role);
    }
  }

  // Check tech stack
  for (const tech of KNOWN_STACK) {
    const tLower = tech.toLowerCase();
    // Special handling for short terms like Go, C#, C++, SQL
    if (tLower === "go") {
      if (/\b(golang|go language|go developer)\b/i.test(lower)) {
        matchedStack.add("Go");
      }
    } else if (tLower === "c#") {
      if (/\bc#|\bcsharp\b/i.test(lower)) {
        matchedStack.add("C#");
      }
    } else if (tLower === "c++") {
      if (/\bc\+\+/i.test(lower)) {
        matchedStack.add("C++");
      }
    } else {
      const regex = new RegExp(`\\b${escapeRegExp(tLower)}\\b`, "i");
      if (regex.test(lower)) {
        matchedStack.add(tech);
      }
    }
  }

  // Check seniority levels
  for (const level of KNOWN_LEVELS) {
    const lLower = level.toLowerCase();
    const regex = new RegExp(`\\b${escapeRegExp(lLower)}\\b`, "i");
    if (regex.test(lower)) {
      // Normalize 'mid-level' to 'Mid'
      matchedLevels.add(level === "Mid-Level" ? "Mid" : level);
    }
  }

  // Extract a clean preview snippet
  const snippet = words.slice(0, 50).join(" ") + (words.length > 50 ? "..." : "");

  return {
    roles: Array.from(matchedRoles),
    stack: Array.from(matchedStack),
    levels: Array.from(matchedLevels),
    wordCount: words.length,
    extractedSnippet: snippet,
  };
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
