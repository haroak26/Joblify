import type { ResumeData } from "@shared/schema";
import { Mail, Phone, MapPin, Linkedin, Globe } from "lucide-react";

interface ExecutiveTemplateProps {
  resumeData: ResumeData;
}

export function ExecutiveTemplate({ resumeData }: ExecutiveTemplateProps) {
  const { personalInfo, summary, experience, education, skills, certifications, projects } = resumeData;

  return (
    <div className="bg-white text-gray-900 p-8 max-w-[8.5in] mx-auto shadow-lg">
      {/* Executive Header */}
      <div className="mb-6 pb-6 border-b-4 border-gray-800">
        <h1 className="text-5xl font-bold text-gray-900 mb-4 tracking-tight">
          {personalInfo.name || "Your Name"}
        </h1>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          {personalInfo.email && (
            <div className="flex items-center gap-1">
              <Mail className="w-4 h-4" />
              <span>{personalInfo.email}</span>
            </div>
          )}
          {personalInfo.phone && (
            <div className="flex items-center gap-1">
              <Phone className="w-4 h-4" />
              <span>{personalInfo.phone}</span>
            </div>
          )}
          {personalInfo.location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{personalInfo.location}</span>
            </div>
          )}
          {personalInfo.linkedin && (
            <div className="flex items-center gap-1">
              <Linkedin className="w-4 h-4" />
              <span className="truncate">{personalInfo.linkedin}</span>
            </div>
          )}
          {personalInfo.website && (
            <div className="flex items-center gap-1">
              <Globe className="w-4 h-4" />
              <span className="truncate">{personalInfo.website}</span>
            </div>
          )}
        </div>
      </div>

      {/* Executive Summary */}
      {summary && (
        <section className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">
            EXECUTIVE SUMMARY
          </h2>
          <p className="text-base text-gray-700 leading-relaxed">{summary}</p>
        </section>
      )}

      {/* Professional Experience */}
      {experience && experience.length > 0 && (
        <section className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 tracking-tight">
            PROFESSIONAL EXPERIENCE
          </h2>
          <div className="space-y-5">
            {experience.map((exp, idx) => (
              <div key={idx}>
                <div className="mb-2">
                  <div className="flex justify-between items-baseline">
                    <h3 className="text-xl font-bold text-gray-900">{exp.title}</h3>
                    <span className="text-sm font-semibold text-gray-600">
                      {exp.startDate} - {exp.endDate || "Present"}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <p className="text-base font-semibold text-gray-700">{exp.company}</p>
                    <p className="text-sm text-gray-600">{exp.location}</p>
                  </div>
                </div>
                {exp.description && exp.description.length > 0 && (
                  <ul className="list-disc list-outside ml-6 space-y-1.5 text-sm text-gray-700">
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

      {/* Two Column Section */}
      <div className="grid grid-cols-2 gap-8">
        {/* Education */}
        {education && education.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 tracking-tight">
              EDUCATION
            </h2>
            <div className="space-y-3">
              {education.map((edu, idx) => (
                <div key={idx}>
                  <h3 className="font-bold text-base text-gray-900">{edu.degree}</h3>
                  <p className="text-sm text-gray-700">{edu.field}</p>
                  <p className="text-sm font-semibold text-gray-800">{edu.school}</p>
                  <p className="text-sm text-gray-600">{edu.graduationDate}</p>
                  {edu.gpa && <p className="text-sm text-gray-600">GPA: {edu.gpa}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Skills */}
        {skills && skills.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 tracking-tight">
              CORE COMPETENCIES
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {skills.map((skill, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-gray-800 rounded-full"></div>
                  <span className="text-sm text-gray-700">{skill}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Certifications */}
      {certifications && certifications.length > 0 && (
        <section className="mt-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">
            CERTIFICATIONS
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {certifications.map((cert, idx) => (
              <div key={idx}>
                <h3 className="font-bold text-sm text-gray-900">{cert.name}</h3>
                <p className="text-xs text-gray-600">{cert.issuer} • {cert.date}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {projects && projects.length > 0 && (
        <section className="mt-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">
            KEY PROJECTS
          </h2>
          <div className="space-y-3">
            {projects.map((project, idx) => (
              <div key={idx}>
                <h3 className="font-bold text-base text-gray-900">{project.name}</h3>
                <p className="text-sm text-gray-700">{project.description}</p>
                {project.technologies && project.technologies.length > 0 && (
                  <p className="text-xs text-gray-600 mt-1">
                    {project.technologies.join(" | ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
