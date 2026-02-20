import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

export interface StoredArtifact {
  key: string;
  url: string;
}

export interface ResumeArtifactStorage {
  save(file: { userId: string; resumeId: string; originalFilename: string; bytes: Buffer }): Promise<StoredArtifact>;
  read(key: string): Promise<Buffer>;
}

const sanitizeName = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, "_");

class LocalResumeArtifactStorage implements ResumeArtifactStorage {
  private readonly baseDirectory: string;

  constructor(baseDirectory: string) {
    this.baseDirectory = baseDirectory;
  }

  async save(file: { userId: string; resumeId: string; originalFilename: string; bytes: Buffer }): Promise<StoredArtifact> {
    const now = new Date();
    const extension = path.extname(file.originalFilename) || ".bin";
    const key = path
      .join(
        sanitizeName(file.userId),
        `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`,
        `${sanitizeName(file.resumeId)}-${crypto.randomUUID()}${extension.toLowerCase()}`,
      )
      .replace(/\\/g, "/");

    const fullPath = path.join(this.baseDirectory, key);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, file.bytes);

    return {
      key,
      url: `/api/resume-artifacts/${encodeURIComponent(key)}`,
    };
  }

  async read(key: string): Promise<Buffer> {
    const normalizedKey = key.replace(/\\/g, "/").replace(/^\/+/, "");
    const fullPath = path.join(this.baseDirectory, normalizedKey);
    return readFile(fullPath);
  }
}

const artifactsDirectory = process.env.RESUME_ARTIFACTS_DIR
  ? path.resolve(process.env.RESUME_ARTIFACTS_DIR)
  : path.resolve(process.cwd(), "uploads", "resume-artifacts");

export const resumeArtifactStorage: ResumeArtifactStorage = new LocalResumeArtifactStorage(artifactsDirectory);
