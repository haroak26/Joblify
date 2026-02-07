import type { ResumeData } from "@shared/schema";
import { Mail, Phone, MapPin, Linkedin, Globe } from "lucide-react";

interface ProfessionalTemplateProps {
  resumeData: ResumeData;
}

export function ProfessionalTemplate({ resumeData }: ProfessionalTemplateProps) {
  const { personalInfo, summary, experience, education, skills, certifications, projects } = resumeData;

  return (
    <div className="bg-white text-gray-900 p-8 max-w-[8.5in] mx-auto shadow-lg">
      {/* Header Section - Centered */}
      <div className="text-center mb-6 pb-4 border-b border-gray-300">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          {personalInfo.name || "Your Name"}
        </h1>
        <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
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

      {/* Single Column Layout */}
      <div className="space-y-5">
        {/* Summary */}
        {summary && (
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2 uppercase border-b border-gray-300 pb-1">
              Professional Summary
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
          </section>
        )}

        {/* Experience */}
        {experience && experience.length > 0 && (
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 uppercase border-b border-gray-300 pb-1">
              Professional Experience
            </h2>
            <div className="space-y-4">
              {experience.map((exp, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-bold text-gray-900">{exp.title}</h3>
                    <span className="text-sm text-gray-500">
                      {exp.startDate} - {exp.endDate || "Present"}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline mb-2">
                    <p className="text-sm font-semibold text-gray-700">{exp.company}</p>
                    <p className="text-sm text-gray-600">{exp.location}</p>
                  </div>
                  {exp.description && exp.description.length > 0 && (
                    <ul className="list-disc list-outside ml-5 space-y-1 text-sm text-gray-700">
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

        {/* Education */}
        {education && education.length > 0 && (
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 uppercase border-b border-gray-300 pb-1">
              Education
            </h2>
            <div className="space-y-3">
              {education.map((edu, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-bold text-gray-900">
                      {edu.degree} in {edu.field}
                    </h3>
                    <span className="text-sm text-gray-500">{edu.graduationDate}</span>
                  </div>
                  <p className="text-sm text-gray-700">{edu.school}</p>
                  {edu.gpa && <p className="text-sm text-gray-600">GPA: {edu.gpa}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Skills */}
        {skills && skills.length > 0 && (
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-2 uppercase border-b border-gray-300 pb-1">
              Skills
            </h2>
            <p className="text-sm text-gray-700">{skills.join(" • ")}</p>
          </section>
        )}

        {/* Certifications */}
        {certifications && certifications.length > 0 && (
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 uppercase border-b border-gray-300 pb-1">
              Certifications
            </h2>
            <div className="space-y-2">
              {certifications.map((cert, idx) => (
                <div key={idx}>
                  <div className="flex justify-between items-baseline">
                    <h3 className="font-bold text-sm text-gray-900">{cert.name}</h3>
                    <span className="text-xs text-gray-500">{cert.date}</span>
                  </div>
                  <p className="text-sm text-gray-600">{cert.issuer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Projects */}
        {projects && projects.length > 0 && (
          <section>
            <h2 className="text-base font-bold text-gray-900 mb-3 uppercase border-b border-gray-300 pb-1">
              Projects
            </h2>
            <div className="space-y-3">
              {projects.map((project, idx) => (
                <div key={idx}>
                  <h3 className="font-bold text-gray-900">{project.name}</h3>
                  <p className="text-sm text-gray-700 mb-1">{project.description}</p>
                  {project.technologies && project.technologies.length > 0 && (
                    <p className="text-xs text-gray-600">
                      <span className="font-semibold">Technologies:</span>{" "}
                      {project.technologies.join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
