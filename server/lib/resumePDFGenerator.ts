/**
 * Professional Resume PDF Generator
 * 
 * Generates ATS-optimized, professional-looking resume PDFs with:
 * - Clean, readable layout
 * - Proper spacing and typography
 * - ATS-friendly formatting (no tables, columns, or graphics that confuse parsers)
 * - Multiple professional templates
 */

import PDFDocument from "pdfkit";
import type { ResumeData } from "@shared/schema";

// Color schemes for different templates
const COLOR_SCHEMES = {
  modern: {
    primary: '#2563eb', // Blue
    secondary: '#1e40af',
    text: '#1f2937',
    lightGray: '#6b7280',
  },
  professional: {
    primary: '#1f2937', // Dark gray
    secondary: '#374151',
    text: '#111827',
    lightGray: '#6b7280',
  },
  academic: {
    primary: '#0f172a', // Navy
    secondary: '#1e293b',
    text: '#0f172a',
    lightGray: '#64748b',
  },
  minimal: {
    primary: '#000000', // Black
    secondary: '#374151',
    text: '#111827',
    lightGray: '#6b7280',
  },
};

interface PDFGeneratorOptions {
  template?: 'modern' | 'professional' | 'academic' | 'minimal';
  pageSize?: 'A4' | 'Letter';
}

export class ResumePDFGenerator {
  private doc: PDFKit.PDFDocument;
  private colors: typeof COLOR_SCHEMES.modern;
  private pageMargin: number = 50;
  private contentWidth: number;
  private currentY: number;

  constructor(options: PDFGeneratorOptions = {}) {
    const template = options.template || 'modern';
    const pageSize = options.pageSize || 'A4';
    
    this.colors = COLOR_SCHEMES[template];
    
    this.doc = new PDFDocument({
      margin: this.pageMargin,
      size: pageSize,
      bufferPages: true,
    });

    // Calculate content width based on page size and margins
    const pageWidth = pageSize === 'A4' ? 595.28 : 612; // Points
    this.contentWidth = pageWidth - (this.pageMargin * 2);
    this.currentY = this.pageMargin;
  }

  /**
   * Get the PDF document stream
   */
  getDocument(): PDFKit.PDFDocument {
    return this.doc;
  }

  /**
   * Generate complete resume PDF
   */
  generate(resumeData: ResumeData, title: string = 'Resume'): void {
    // Header with name and contact
    this.generateHeader(resumeData);
    
    // Professional Summary
    if (resumeData.summary) {
      this.generateSummary(resumeData.summary);
    }

    // Work Experience
    if (resumeData.experience && resumeData.experience.length > 0) {
      this.generateExperience(resumeData.experience);
    }

    // Education
    if (resumeData.education && resumeData.education.length > 0) {
      this.generateEducation(resumeData.education);
    }

    // Skills
    if (resumeData.skills && resumeData.skills.length > 0) {
      this.generateSkills(resumeData.skills);
    }

    // Certifications
    if (resumeData.certifications && resumeData.certifications.length > 0) {
      this.generateCertifications(resumeData.certifications);
    }

    // Projects
    if (resumeData.projects && resumeData.projects.length > 0) {
      this.generateProjects(resumeData.projects);
    }

    // Awards
    if (resumeData.awards && resumeData.awards.length > 0) {
      this.generateAwards(resumeData.awards);
    }

    // Leadership
    if (resumeData.leadership && resumeData.leadership.length > 0) {
      this.generateLeadership(resumeData.leadership);
    }

    // Research
    if (resumeData.research && resumeData.research.length > 0) {
      this.generateResearch(resumeData.research);
    }

    // Publications
    if (resumeData.publications && resumeData.publications.length > 0) {
      this.generatePublications(resumeData.publications);
    }

    // Finalize the document
    this.doc.end();
  }

  /**
   * Generate header section with name and contact info
   */
  private generateHeader(resumeData: ResumeData): void {
    if (!resumeData.personalInfo) return;

    const { name, email, phone, location, linkedin, website } = resumeData.personalInfo;

    // Name - Large, bold, centered
    if (name) {
      this.doc
        .font('Helvetica-Bold')
        .fontSize(28)
        .fillColor(this.colors.primary)
        .text(name.toUpperCase(), this.pageMargin, this.currentY, {
          align: 'center',
          width: this.contentWidth,
        });
      this.currentY = this.doc.y + 10;
    }

    // Contact info - Small, centered, one line
    const contactParts = [email, phone, location, linkedin, website].filter(Boolean);
    if (contactParts.length > 0) {
      this.doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor(this.colors.lightGray)
        .text(contactParts.join('  •  '), this.pageMargin, this.currentY, {
          align: 'center',
          width: this.contentWidth,
        });
      this.currentY = this.doc.y + 15;
    }

    // Horizontal line separator
    this.addSeparator();
  }

  /**
   * Generate professional summary section
   */
  private generateSummary(summary: string): void {
    this.addSectionHeader('PROFESSIONAL SUMMARY');
    
    this.doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(this.colors.text)
      .text(summary, this.pageMargin, this.currentY, {
        width: this.contentWidth,
        align: 'justify',
        lineGap: 2,
      });
    
    this.currentY = this.doc.y + 20;
  }

  /**
   * Generate work experience section
   */
  private generateExperience(experiences: any[]): void {
    this.addSectionHeader('PROFESSIONAL EXPERIENCE');

    experiences.forEach((exp, index) => {
      // Check if we need a new page
      if (this.currentY > 700) {
        this.doc.addPage();
        this.currentY = this.pageMargin;
      }

      // Job title and dates on same line
      this.doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor(this.colors.primary)
        .text(exp.title, this.pageMargin, this.currentY, {
          continued: true,
          width: this.contentWidth * 0.7,
        })
        .font('Helvetica')
        .fontSize(10)
        .fillColor(this.colors.lightGray)
        .text(
          `${exp.startDate} – ${exp.endDate || 'Present'}`,
          { align: 'right' }
        );

      this.currentY = this.doc.y + 2;

      // Company and location
      this.doc
        .font('Helvetica-Oblique')
        .fontSize(11)
        .fillColor(this.colors.text)
        .text(`${exp.company}${exp.location ? ` • ${exp.location}` : ''}`, 
          this.pageMargin, 
          this.currentY
        );

      this.currentY = this.doc.y + 8;

      // Bullet points for responsibilities/achievements
      if (exp.description && exp.description.length > 0) {
        exp.description.forEach((bullet: string) => {
          const bulletX = this.pageMargin + 15;
          const textX = this.pageMargin + 25;
          
          // Draw bullet point
          this.doc
            .font('Helvetica')
            .fontSize(10)
            .fillColor(this.colors.primary)
            .text('•', bulletX, this.currentY);

          // Draw bullet text
          this.doc
            .fillColor(this.colors.text)
            .text(bullet, textX, this.currentY, {
              width: this.contentWidth - 25,
              lineGap: 1,
            });

          this.currentY = this.doc.y + 5;
        });
      }

      // Add spacing between jobs
      if (index < experiences.length - 1) {
        this.currentY += 10;
      }
    });

    this.currentY += 10;
  }

  /**
   * Generate education section
   */
  private generateEducation(education: any[]): void {
    this.addSectionHeader('EDUCATION');

    education.forEach((edu, index) => {
      // Check if we need a new page
      if (this.currentY > 720) {
        this.doc.addPage();
        this.currentY = this.pageMargin;
      }

      // Degree and graduation date on same line
      this.doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .fillColor(this.colors.primary)
        .text(edu.degree, this.pageMargin, this.currentY, {
          continued: true,
          width: this.contentWidth * 0.7,
        })
        .font('Helvetica')
        .fontSize(10)
        .fillColor(this.colors.lightGray)
        .text(edu.graduationDate || '', { align: 'right' });

      this.currentY = this.doc.y + 2;

      // School and field
      this.doc
        .font('Helvetica-Oblique')
        .fontSize(11)
        .fillColor(this.colors.text)
        .text(`${edu.school} • ${edu.field}`, this.pageMargin, this.currentY);

      this.currentY = this.doc.y;

      // GPA if provided
      if (edu.gpa) {
        this.currentY += 2;
        this.doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor(this.colors.lightGray)
          .text(`GPA: ${edu.gpa}`, this.pageMargin, this.currentY);
        this.currentY = this.doc.y;
      }

      // Add spacing between entries
      if (index < education.length - 1) {
        this.currentY += 12;
      }
    });

    this.currentY += 15;
  }

  /**
   * Generate skills section with organized layout
   */
  private generateSkills(skills: string[]): void {
    this.addSectionHeader('SKILLS');

    const skillPadding = 8;
    const skillMargin = 6;
    const fontSize = 10;
    let startX = this.pageMargin;
    
    this.doc.font('Helvetica').fontSize(fontSize);

    skills.forEach((skill) => {
      const textWidth = this.doc.widthOfString(skill);
      const boxWidth = textWidth + (skillPadding * 2);
      const boxHeight = fontSize + (skillPadding);

      // Wrap to next line if needed
      if (startX + boxWidth > this.pageMargin + this.contentWidth) {
        startX = this.pageMargin;
        this.currentY += boxHeight + skillMargin;
      }

      // Check for page break
      if (this.currentY > 750) {
        this.doc.addPage();
        this.currentY = this.pageMargin;
        startX = this.pageMargin;
      }

      // Draw background box (light gray)
      this.doc
        .roundedRect(startX, this.currentY, boxWidth, boxHeight, 4)
        .fillAndStroke('#f3f4f6', '#e5e7eb');

      // Draw text
      this.doc
        .fillColor(this.colors.text)
        .text(skill, startX + skillPadding, this.currentY + (skillPadding / 2), {
          width: textWidth,
          align: 'center'
        });

      startX += boxWidth + skillMargin;
    });

    this.currentY = this.doc.y + 25;
  }

  /**
   * Generate certifications section
   */
  private generateCertifications(certifications: any[]): void {
    this.addSectionHeader('CERTIFICATIONS');

    certifications.forEach((cert, index) => {
      if (this.currentY > 730) {
        this.doc.addPage();
        this.currentY = this.pageMargin;
      }

      this.doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(this.colors.text)
        .text(cert.name, this.pageMargin, this.currentY);

      this.currentY = this.doc.y + 2;

      this.doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor(this.colors.lightGray)
        .text(`${cert.issuer} • ${cert.date}`, this.pageMargin, this.currentY);

      this.currentY = this.doc.y;

      if (index < certifications.length - 1) {
        this.currentY += 10;
      }
    });

    this.currentY += 15;
  }

  /**
   * Generate projects section
   */
  private generateProjects(projects: any[]): void {
    this.addSectionHeader('PROJECTS');

    projects.forEach((project, index) => {
      if (this.currentY > 700) {
        this.doc.addPage();
        this.currentY = this.pageMargin;
      }

      // Project name
      this.doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(this.colors.primary)
        .text(project.name, this.pageMargin, this.currentY);

      this.currentY = this.doc.y + 3;

      // Description
      this.doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor(this.colors.text)
        .text(project.description, this.pageMargin, this.currentY, {
          width: this.contentWidth,
          lineGap: 1,
        });

      this.currentY = this.doc.y + 3;

      // Technologies
      if (project.technologies && project.technologies.length > 0) {
        this.doc
          .font('Helvetica-Oblique')
          .fontSize(9)
          .fillColor(this.colors.lightGray)
          .text(`Technologies: ${project.technologies.join(', ')}`, 
            this.pageMargin, 
            this.currentY
          );
        this.currentY = this.doc.y;
      }

      // URL
      if (project.url) {
        this.currentY += 2;
        this.doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(this.colors.primary)
          .text(project.url, this.pageMargin, this.currentY, {
            link: project.url,
            underline: true,
          });
        this.currentY = this.doc.y;
      }

      if (index < projects.length - 1) {
        this.currentY += 12;
      }
    });

    this.currentY += 15;
  }

  /**
   * Generate awards section
   */
  private generateAwards(awards: any[]): void {
    this.addSectionHeader('AWARDS & HONORS');

    awards.forEach((award, index) => {
      if (this.currentY > 730) {
        this.doc.addPage();
        this.currentY = this.pageMargin;
      }

      this.doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(this.colors.text)
        .text(award.title, this.pageMargin, this.currentY);

      this.currentY = this.doc.y + 2;

      this.doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor(this.colors.lightGray)
        .text(`${award.issuer} • ${award.date}`, this.pageMargin, this.currentY);

      this.currentY = this.doc.y;

      if (award.description) {
        this.currentY += 2;
        this.doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor(this.colors.text)
          .text(award.description, this.pageMargin, this.currentY, {
            width: this.contentWidth,
          });
        this.currentY = this.doc.y;
      }

      if (index < awards.length - 1) {
        this.currentY += 10;
      }
    });

    this.currentY += 15;
  }

  /**
   * Generate leadership section
   */
  private generateLeadership(leadership: any[]): void {
    this.addSectionHeader('LEADERSHIP');

    leadership.forEach((role, index) => {
      if (this.currentY > 700) {
        this.doc.addPage();
        this.currentY = this.pageMargin;
      }

      // Title and dates
      this.doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(this.colors.primary)
        .text(role.title, this.pageMargin, this.currentY, {
          continued: true,
          width: this.contentWidth * 0.7,
        })
        .font('Helvetica')
        .fontSize(10)
        .fillColor(this.colors.lightGray)
        .text(`${role.startDate} – ${role.endDate || 'Present'}`, { align: 'right' });

      this.currentY = this.doc.y + 2;

      // Organization
      this.doc
        .font('Helvetica-Oblique')
        .fontSize(10)
        .fillColor(this.colors.text)
        .text(role.organization, this.pageMargin, this.currentY);

      this.currentY = this.doc.y + 3;

      // Description
      this.doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor(this.colors.text)
        .text(role.description, this.pageMargin, this.currentY, {
          width: this.contentWidth,
          lineGap: 1,
        });

      this.currentY = this.doc.y;

      if (index < leadership.length - 1) {
        this.currentY += 12;
      }
    });

    this.currentY += 15;
  }

  /**
   * Generate research section
   */
  private generateResearch(research: any[]): void {
    this.addSectionHeader('RESEARCH');

    research.forEach((item, index) => {
      if (this.currentY > 700) {
        this.doc.addPage();
        this.currentY = this.pageMargin;
      }

      // Title and dates
      this.doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(this.colors.primary)
        .text(item.title, this.pageMargin, this.currentY, {
          continued: true,
          width: this.contentWidth * 0.7,
        })
        .font('Helvetica')
        .fontSize(10)
        .fillColor(this.colors.lightGray)
        .text(`${item.startDate} – ${item.endDate || 'Present'}`, { align: 'right' });

      this.currentY = this.doc.y + 2;

      // Institution
      this.doc
        .font('Helvetica-Oblique')
        .fontSize(10)
        .fillColor(this.colors.text)
        .text(item.institution, this.pageMargin, this.currentY);

      this.currentY = this.doc.y + 3;

      // Description
      this.doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor(this.colors.text)
        .text(item.description, this.pageMargin, this.currentY, {
          width: this.contentWidth,
          lineGap: 1,
        });

      this.currentY = this.doc.y;

      // URL
      if (item.url) {
        this.currentY += 2;
        this.doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(this.colors.primary)
          .text(item.url, this.pageMargin, this.currentY, {
            link: item.url,
            underline: true,
          });
        this.currentY = this.doc.y;
      }

      if (index < research.length - 1) {
        this.currentY += 12;
      }
    });

    this.currentY += 15;
  }

  /**
   * Generate publications section
   */
  private generatePublications(publications: any[]): void {
    this.addSectionHeader('PUBLICATIONS');

    publications.forEach((pub, index) => {
      if (this.currentY > 720) {
        this.doc.addPage();
        this.currentY = this.pageMargin;
      }

      // Title
      this.doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(this.colors.text)
        .text(pub.title, this.pageMargin, this.currentY, {
          width: this.contentWidth,
        });

      this.currentY = this.doc.y + 2;

      // Authors, journal, and date
      const publicationInfo = [
        pub.authors,
        pub.journal,
        pub.date,
      ].filter(Boolean).join(' • ');

      this.doc
        .font('Helvetica-Oblique')
        .fontSize(9)
        .fillColor(this.colors.lightGray)
        .text(publicationInfo, this.pageMargin, this.currentY, {
          width: this.contentWidth,
        });

      this.currentY = this.doc.y;

      // URL
      if (pub.url) {
        this.currentY += 2;
        this.doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(this.colors.primary)
          .text(pub.url, this.pageMargin, this.currentY, {
            link: pub.url,
            underline: true,
          });
        this.currentY = this.doc.y;
      }

      if (index < publications.length - 1) {
        this.currentY += 10;
      }
    });

    this.currentY += 15;
  }

  /**
   * Add a section header with consistent styling
   */
  private addSectionHeader(title: string): void {
    // Check if we need a new page
    if (this.currentY > 720) {
      this.doc.addPage();
      this.currentY = this.pageMargin;
    }

    this.doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .fillColor(this.colors.primary)
      .text(title, this.pageMargin, this.currentY);

    this.currentY = this.doc.y + 8;

    // Add subtle underline
    this.doc
      .moveTo(this.pageMargin, this.currentY)
      .lineTo(this.pageMargin + this.contentWidth, this.currentY)
      .lineWidth(0.5)
      .strokeColor(this.colors.lightGray)
      .strokeOpacity(0.3)
      .stroke();

    this.currentY += 12;
  }

  /**
   * Add a horizontal separator line
   */
  private addSeparator(): void {
    this.doc
      .moveTo(this.pageMargin, this.currentY)
      .lineTo(this.pageMargin + this.contentWidth, this.currentY)
      .lineWidth(1)
      .strokeColor(this.colors.primary)
      .strokeOpacity(0.5)
      .stroke();

    this.currentY += 20;
  }
}
