import type { ResumeData } from "@shared/schema";
import { Mail, Phone, MapPin, Linkedin, Globe } from "lucide-react";

interface ModernTemplateProps {
  resumeData: ResumeData;
}

export function ModernTemplate({ resumeData }: ModernTemplateProps) {
  const { personalInfo, summary, experience, education, skills, certifications, projects } = resumeData;

  return (
    <div className="bg-white text-gray-900 p-8 max-w-[8.5in] mx-auto shadow-lg">
      {/* Header Section - Two Column */}
      <div className="grid grid-cols-3 gap-6 mb-6 pb-6 border-b-2 border-blue-600">
        <div className="col-span-2">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {personalInfo.name || "Your Name"}
          </h1>
          <div className="flex flex-wrap gap-3 text-sm text-gray-600">
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
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-gray-600 mt-1">
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
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="col-span-2 space-y-6">
          {/* Summary */}
          {summary && (
            <section>
              <h2 className="text-lg font-bold text-blue-600 mb-2 uppercase tracking-wide">
                Professional Summary
              </h2>
              <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
            </section>
          )}

          {/* Experience */}
          {experience && experience.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-blue-600 mb-3 uppercase tracking-wide">
                Experience
              </h2>
              <div className="space-y-4">
                {experience.map((exp, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <h3 className="font-bold text-gray-900">{exp.title}</h3>
                        <p className="text-sm text-gray-600">{exp.company}</p>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <p>{exp.location}</p>
                        <p>
                          {exp.startDate} - {exp.endDate || "Present"}
                        </p>
                      </div>
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

          {/* Projects */}
          {projects && projects.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-blue-600 mb-3 uppercase tracking-wide">
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

        {/* Right Column */}
        <div className="space-y-6">
          {/* Education */}
          {education && education.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-blue-600 mb-3 uppercase tracking-wide">
                Education
              </h2>
              <div className="space-y-3">
                {education.map((edu, idx) => (
                  <div key={idx}>
                    <h3 className="font-bold text-sm text-gray-900">{edu.degree}</h3>
                    <p className="text-sm text-gray-700">{edu.field}</p>
                    <p className="text-sm text-gray-600">{edu.school}</p>
                    <p className="text-xs text-gray-500">{edu.graduationDate}</p>
                    {edu.gpa && <p className="text-xs text-gray-600">GPA: {edu.gpa}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Skills */}
          {skills && skills.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-blue-600 mb-3 uppercase tracking-wide">
                Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Certifications */}
          {certifications && certifications.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-blue-600 mb-3 uppercase tracking-wide">
                Certifications
              </h2>
              <div className="space-y-2">
                {certifications.map((cert, idx) => (
                  <div key={idx}>
                    <h3 className="font-bold text-sm text-gray-900">{cert.name}</h3>
                    <p className="text-xs text-gray-600">{cert.issuer}</p>
                    <p className="text-xs text-gray-500">{cert.date}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
