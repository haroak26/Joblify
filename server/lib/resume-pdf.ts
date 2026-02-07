import PDFDocument from "pdfkit";
import type { ResumeData, ResumeTemplateId } from "@shared/schema";

const TEMPLATE_STYLES: Record<ResumeTemplateId, { accent: string; heading: string }> = {
  modern: { accent: "#2563eb", heading: "#111827" },
  professional: { accent: "#0f172a", heading: "#111827" },
  creative: { accent: "#7c3aed", heading: "#111827" },
  executive: { accent: "#0f766e", heading: "#0f172a" },
  technical: { accent: "#334155", heading: "#0f172a" },
};

const DEFAULT_STYLE = TEMPLATE_STYLES.modern;

const formatDateRange = (start?: string, end?: string | null) => {
  if (!start && !end) return "";
  if (start && !end) return `${start} - Present`;
  if (start && end) return `${start} - ${end}`;
  return end || "";
};

const safeArray = (value?: string[] | null) => (Array.isArray(value) ? value.filter(Boolean) : []);

const sectionHeading = (doc: PDFDocument, label: string, style: { accent: string; heading: string }) => {
  doc.moveDown(0.6);
  doc.fillColor(style.accent).font("Helvetica-Bold").fontSize(11).text(label.toUpperCase());
  const y = doc.y + 2;
  doc
    .moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.width - doc.page.margins.right, y)
    .lineWidth(0.5)
    .strokeColor(style.accent)
    .stroke();
  doc.moveDown(0.4);
  doc.fillColor(style.heading).font("Helvetica");
};

export const generateResumePdfBuffer = async (resume: {
  title: string;
  template: ResumeTemplateId;
  resumeData: ResumeData;
}): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 54, size: "LETTER" });
      const chunks: Buffer[] = [];
      const style = TEMPLATE_STYLES[resume.template] ?? DEFAULT_STYLE;

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));

      const { resumeData } = resume;

      const name = resumeData.personalInfo?.name || resume.title || "Resume";
      doc.fillColor(style.heading).font("Helvetica-Bold").fontSize(22).text(name, { align: "center" });

      const contact: string[] = [];
      if (resumeData.personalInfo?.email) contact.push(resumeData.personalInfo.email);
      if (resumeData.personalInfo?.phone) contact.push(resumeData.personalInfo.phone);
      if (resumeData.personalInfo?.location) contact.push(resumeData.personalInfo.location);

      if (contact.length > 0) {
        doc
          .moveDown(0.3)
          .font("Helvetica")
          .fontSize(9)
          .fillColor("#4b5563")
          .text(contact.join(" • "), { align: "center" });
      }

      const links: string[] = [];
      if (resumeData.personalInfo?.linkedin) links.push(resumeData.personalInfo.linkedin);
      if (resumeData.personalInfo?.website) links.push(resumeData.personalInfo.website);
      if (links.length > 0) {
        doc
          .moveDown(0.1)
          .font("Helvetica")
          .fontSize(9)
          .fillColor("#6b7280")
          .text(links.join(" • "), { align: "center" });
      }

      if (resumeData.summary) {
        sectionHeading(doc, "Summary", style);
        doc.fontSize(10).fillColor("#374151").text(resumeData.summary, { lineGap: 2 });
      }

      if (resumeData.experience?.length) {
        sectionHeading(doc, "Experience", style);
        resumeData.experience.forEach((exp) => {
          const titleLine = [exp.title, exp.company].filter(Boolean).join(" — ");
          doc.font("Helvetica-Bold").fontSize(10.5).fillColor(style.heading).text(titleLine || "Role");
          const meta = [exp.location, formatDateRange(exp.startDate, exp.endDate)].filter(Boolean).join(" | ");
          if (meta) {
            doc.font("Helvetica").fontSize(9.5).fillColor("#6b7280").text(meta);
          }
          const bullets = safeArray(exp.description);
          if (bullets.length) {
            doc.moveDown(0.2);
            bullets.forEach((bullet) => {
              doc.font("Helvetica").fontSize(9.5).fillColor("#374151").text(`• ${bullet}`, {
                indent: 10,
                lineGap: 2,
              });
            });
          }
          doc.moveDown(0.4);
        });
      }

      if (resumeData.education?.length) {
        sectionHeading(doc, "Education", style);
        resumeData.education.forEach((edu) => {
          const degreeLine = [edu.degree, edu.field ? `in ${edu.field}` : ""]
            .filter(Boolean)
            .join(" ");
          doc.font("Helvetica-Bold").fontSize(10.5).fillColor(style.heading).text(degreeLine || "Education");
          const meta = [edu.school, edu.graduationDate].filter(Boolean).join(" | ");
          if (meta) {
            doc.font("Helvetica").fontSize(9.5).fillColor("#6b7280").text(meta);
          }
          if (edu.gpa) {
            doc.font("Helvetica").fontSize(9.5).fillColor("#6b7280").text(`GPA: ${edu.gpa}`);
          }
          doc.moveDown(0.4);
        });
      }

      if (resumeData.skills?.length) {
        sectionHeading(doc, "Skills", style);
        doc
          .font("Helvetica")
          .fontSize(9.5)
          .fillColor("#374151")
          .text(resumeData.skills.join(" • "), { lineGap: 2 });
      }

      if (resumeData.certifications?.length) {
        sectionHeading(doc, "Certifications", style);
        resumeData.certifications.forEach((cert) => {
          const line = [cert.name, cert.issuer, cert.date ? `(${cert.date})` : ""]
            .filter(Boolean)
            .join(" · ");
          doc.font("Helvetica").fontSize(9.5).fillColor("#374151").text(line);
        });
      }

      if (resumeData.projects?.length) {
        sectionHeading(doc, "Projects", style);
        resumeData.projects.forEach((proj) => {
          doc.font("Helvetica-Bold").fontSize(10.5).fillColor(style.heading).text(proj.name || "Project");
          if (proj.description) {
            doc.font("Helvetica").fontSize(9.5).fillColor("#374151").text(proj.description, { lineGap: 2 });
          }
          const tech = safeArray(proj.technologies).join(", ");
          if (tech) {
            doc.font("Helvetica").fontSize(9).fillColor("#6b7280").text(`Technologies: ${tech}`);
          }
          if (proj.url) {
            doc.font("Helvetica").fontSize(9).fillColor(style.accent).text(proj.url);
          }
          doc.moveDown(0.4);
        });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
