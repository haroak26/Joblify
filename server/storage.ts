import { type User, type InsertUser, type Skill, type JobPost } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getSkills(): Promise<Skill[]>;
  setSkills(skills: Skill[]): Promise<Skill[]>;
  getJobs(): Promise<JobPost[]>;
  setJobs(jobs: JobPost[]): Promise<void>;
  saveJob(jobId: string): Promise<JobPost | undefined>;
  markJobApplied(jobId: string): Promise<JobPost | undefined>;
}

const sampleJobs: JobPost[] = [
  {
    id: "1",
    title: "Looking for a UI/UX Designer for SaaS Dashboard",
    description: "We need an experienced UI/UX designer to help us redesign our SaaS dashboard. Must have experience with Figma and modern design systems. Budget is negotiable based on experience. Remote work is fine.",
    source: "reddit",
    sourceUrl: "https://reddit.com/r/forhire/example1",
    author: "techfounder_mike",
    authorHandle: "techfounder_mike",
    postedAt: "2 hours ago",
    matchedSkills: ["UI/UX Design", "Figma"],
    budget: "$2,000 - $5,000",
    isRemote: true,
    saved: false,
    applied: false,
  },
  {
    id: "2",
    title: "React Developer Needed for E-commerce Platform",
    description: "Hiring a React developer for our e-commerce startup. Need someone who can work with Next.js and has experience with payment integrations. Part-time or full-time available.",
    source: "x",
    sourceUrl: "https://x.com/user/status/example2",
    author: "Sarah Chen",
    authorHandle: "sarahbuilds",
    postedAt: "4 hours ago",
    matchedSkills: ["React", "Web Development", "Node.js"],
    budget: "$50 - $80/hr",
    isRemote: true,
    saved: false,
    applied: false,
  },
  {
    id: "3",
    title: "Need a Python Developer for Data Automation",
    description: "Looking for someone to build automation scripts for our data pipeline. Experience with pandas, APIs, and database connections required. This is a quick project, should take 1-2 weeks.",
    source: "reddit",
    sourceUrl: "https://reddit.com/r/slavelabour/example3",
    author: "data_enthusiast",
    authorHandle: "data_enthusiast",
    postedAt: "6 hours ago",
    matchedSkills: ["Python", "Data Analysis"],
    budget: "$500 - $1,000",
    isRemote: true,
    saved: false,
    applied: false,
  },
  {
    id: "4",
    title: "WordPress Expert for Business Website",
    description: "Small business looking for WordPress developer to create a professional website. Need custom theme development, WooCommerce setup, and SEO optimization. Timeline is 3 weeks.",
    source: "facebook",
    sourceUrl: "https://facebook.com/groups/freelancers/example4",
    author: "Local Business Owner",
    authorHandle: "jsmith_biz",
    postedAt: "8 hours ago",
    matchedSkills: ["WordPress", "Web Development", "SEO"],
    budget: "$1,500 - $3,000",
    isRemote: true,
    saved: false,
    applied: false,
  },
  {
    id: "5",
    title: "Video Editor for YouTube Channel",
    description: "Growing tech YouTube channel needs a video editor. Must be proficient in Premiere Pro or DaVinci Resolve. Looking for someone who can edit 4-6 videos per month. Long-term collaboration preferred.",
    source: "x",
    sourceUrl: "https://x.com/user/status/example5",
    author: "TechReviewerMax",
    authorHandle: "maxreviews",
    postedAt: "12 hours ago",
    matchedSkills: ["Video Editing"],
    budget: "$200 - $400/video",
    isRemote: true,
    saved: false,
    applied: false,
  },
  {
    id: "6",
    title: "Content Writer for Tech Blog",
    description: "Need a content writer who understands tech and can write engaging blog posts. Topics include AI, software development, and startup culture. 4-8 articles per month.",
    source: "reddit",
    sourceUrl: "https://reddit.com/r/hireawriter/example6",
    author: "content_agency",
    authorHandle: "content_agency",
    postedAt: "1 day ago",
    matchedSkills: ["Content Writing"],
    budget: "$100 - $200/article",
    isRemote: true,
    saved: false,
    applied: false,
  },
  {
    id: "7",
    title: "Mobile App Developer - iOS/Android",
    description: "Startup looking for a mobile developer to build our MVP app. React Native or Flutter preferred. The app is a fitness tracker with social features. 2-3 month project.",
    source: "facebook",
    sourceUrl: "https://facebook.com/groups/startups/example7",
    author: "FitStartup Founder",
    authorHandle: "fitfounder",
    postedAt: "1 day ago",
    matchedSkills: ["Mobile Development", "React"],
    budget: "$10,000 - $20,000",
    isRemote: true,
    saved: false,
    applied: false,
  },
  {
    id: "8",
    title: "Graphic Designer for Brand Identity",
    description: "New e-commerce brand needs complete visual identity - logo, color palette, typography, social media templates. Looking for someone with a modern, minimalist style.",
    source: "x",
    sourceUrl: "https://x.com/user/status/example8",
    author: "Emily Rivera",
    authorHandle: "emilybrands",
    postedAt: "2 days ago",
    matchedSkills: ["Graphic Design", "UI/UX Design"],
    budget: "$1,000 - $2,500",
    isRemote: true,
    saved: false,
    applied: false,
  },
];

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private skills: Skill[];
  private jobs: JobPost[];

  constructor() {
    this.users = new Map();
    this.skills = [];
    this.jobs = [];
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getSkills(): Promise<Skill[]> {
    return this.skills;
  }

  async setSkills(skills: Skill[]): Promise<Skill[]> {
    this.skills = skills;
    return this.skills;
  }

  async getJobs(): Promise<JobPost[]> {
    return this.jobs;
  }

  async setJobs(jobs: JobPost[]): Promise<void> {
    this.jobs = jobs;
  }

  async saveJob(jobId: string): Promise<JobPost | undefined> {
    const job = this.jobs.find((j) => j.id === jobId);
    if (job) {
      job.saved = !job.saved;
    }
    return job;
  }

  async markJobApplied(jobId: string): Promise<JobPost | undefined> {
    const job = this.jobs.find((j) => j.id === jobId);
    if (job) {
      job.applied = true;
    }
    return job;
  }

  generateJobsForSkills(skills: Skill[]): JobPost[] {
    const skillNames = skills.map((s) => s.name.toLowerCase());
    
    const relevantJobs = sampleJobs.filter((job) => {
      return job.matchedSkills.some((ms) =>
        skillNames.some(
          (sn) =>
            ms.toLowerCase().includes(sn) ||
            sn.includes(ms.toLowerCase())
        )
      );
    });

    return relevantJobs.map((job) => ({
      ...job,
      id: randomUUID(),
      matchedSkills: job.matchedSkills.filter((ms) =>
        skillNames.some(
          (sn) =>
            ms.toLowerCase().includes(sn) ||
            sn.includes(ms.toLowerCase())
        )
      ),
      saved: false,
      applied: false,
    }));
  }
}

export const storage = new MemStorage();
