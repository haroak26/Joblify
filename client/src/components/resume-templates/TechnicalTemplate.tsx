import type { ResumeData } from "@shared/schema";
import { Mail, Phone, MapPin, Linkedin, Globe } from "lucide-react";

interface TechnicalTemplateProps {
  resumeData: ResumeData;
}

export function TechnicalTemplate({ resumeData }: TechnicalTemplateProps) {
  const { personalInfo, summary, experience, education, skills, certifications, projects } = resumeData;

  return (
    <div className="bg-white text-gray-900 p-8 max-w-[8.5in] mx-auto shadow-lg font-mono">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {personalInfo.name || "Your Name"}
        </h1>
        <div className="flex flex-wrap gap-3 text-xs text-gray-600">
          {personalInfo.email && <span>{personalInfo.email}</span>}
          {personalInfo.phone && <span>|</span>}
          {personalInfo.phone && <span>{personalInfo.phone}</span>}
          {personalInfo.location && <span>|</span>}
          {personalInfo.location && <span>{personalInfo.location}</span>}
          {personalInfo.linkedin && <span>|</span>}
          {personalInfo.linkedin && <span className="truncate">{personalInfo.linkedin}</span>}
          {personalInfo.website && <span>|</span>}
          {personalInfo.website && <span className="truncate">{personalInfo.website}</span>}
        </div>
      </div>

      {/* Skills First - Technical Focus */}
      {skills && skills.length > 0 && (
        <section className="mb-5">
          <h2 className="text-sm font-bold text-gray-900 mb-2 bg-gray-200 px-2 py-1">
            TECHNICAL SKILLS
          </h2>
          <div className="grid grid-cols-4 gap-2 text-xs">
            {skills.map((skill, idx) => (
              <div key={idx} className="border border-gray-300 px-2 py-1 text-center">
                {skill}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Summary */}
      {summary && (
        <section className="mb-5">
          <h2 className="text-sm font-bold text-gray-900 mb-2 bg-gray-200 px-2 py-1">
            SUMMARY
          </h2>
          <p className="text-xs text-gray-700 leading-relaxed">{summary}</p>
        </section>
      )}

      {/* Projects - High Priority for Technical */}
      {projects && projects.length > 0 && (
        <section className="mb-5">
          <h2 className="text-sm font-bold text-gray-900 mb-2 bg-gray-200 px-2 py-1">
            PROJECTS
          </h2>
          <div className="space-y-3">
            {projects.map((project, idx) => (
              <div key={idx} className="border-l-2 border-gray-400 pl-3">
                <h3 className="font-bold text-sm text-gray-900">{project.name}</h3>
                <p className="text-xs text-gray-700 mb-1">{project.description}</p>
                {project.technologies && project.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {project.technologies.map((tech, i) => (
                      <span key={i} className="text-xs bg-gray-100 px-1 border border-gray-300">
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Experience */}
      {experience && experience.length > 0 && (
        <section className="mb-5">
          <h2 className="text-sm font-bold text-gray-900 mb-2 bg-gray-200 px-2 py-1">
            EXPERIENCE
          </h2>
          <div className="space-y-3">
            {experience.map((exp, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-bold text-sm text-gray-900">{exp.title} @ {exp.company}</h3>
                  <span className="text-xs text-gray-600">
                    {exp.startDate} - {exp.endDate || "Present"}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-1">{exp.location}</p>
                {exp.description && exp.description.length > 0 && (
                  <ul className="list-disc list-outside ml-5 space-y-0.5 text-xs text-gray-700">
                    {exp.description.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education and Certifications Side by Side */}
      <div className="grid grid-cols-2 gap-5">
        {education && education.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-gray-900 mb-2 bg-gray-200 px-2 py-1">
              EDUCATION
            </h2>
            <div className="space-y-2">
              {education.map((edu, idx) => (
                <div key={idx}>
                  <h3 className="font-bold text-xs text-gray-900">{edu.degree}</h3>
                  <p className="text-xs text-gray-700">{edu.field}</p>
                  <p className="text-xs text-gray-600">{edu.school}</p>
                  <p className="text-xs text-gray-500">{edu.graduationDate}</p>
                  {edu.gpa && <p className="text-xs text-gray-600">GPA: {edu.gpa}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {certifications && certifications.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-gray-900 mb-2 bg-gray-200 px-2 py-1">
              CERTIFICATIONS
            </h2>
            <div className="space-y-2">
              {certifications.map((cert, idx) => (
                <div key={idx}>
                  <h3 className="font-bold text-xs text-gray-900">{cert.name}</h3>
                  <p className="text-xs text-gray-600">{cert.issuer}</p>
                  <p className="text-xs text-gray-500">{cert.date}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
