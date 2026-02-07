import { ResumeData } from "@shared/schema";
import { Mail, Phone, MapPin, Linkedin, Globe } from "lucide-react";

interface MinimalTemplateProps {
  data: ResumeData;
}

// Minimal Template - Clean minimal design with strategic use of whitespace
export default function MinimalTemplate({ data }: MinimalTemplateProps) {
  const { personalInfo, summary, experience, education, skills, certifications, projects } = data;

  return (
    <div className="p-8 print:p-8 h-full">
      {/* Header with Name and Contact */}
      <div className="flex justify-between items-start mb-8 pb-4 border-b-2 border-black">
        <div>
          <h1 className="text-5xl font-bold tracking-tight">{personalInfo.name || "Your Name"}</h1>
        </div>
        <div className="text-right text-sm space-y-1">
          {personalInfo.email && (
            <div className="flex items-center justify-end gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              <span>{personalInfo.email}</span>
            </div>
          )}
          {personalInfo.phone && (
            <div className="flex items-center justify-end gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              <span>{personalInfo.phone}</span>
            </div>
          )}
          {personalInfo.location && (
            <div className="flex items-center justify-end gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              <span>{personalInfo.location}</span>
            </div>
          )}
          {personalInfo.linkedin && (
            <div className="flex items-center justify-end gap-1.5">
              <Linkedin className="w-3.5 h-3.5" />
              <span className="break-all">{personalInfo.linkedin}</span>
            </div>
          )}
          {personalInfo.website && (
            <div className="flex items-center justify-end gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              <span className="break-all">{personalInfo.website}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-8">
        {/* Left Sidebar */}
        <div className="w-[30%]">
          {/* Education */}
          {education.length > 0 && (
            <div className="mb-6">
              <h2 className="text-base font-bold mb-3 uppercase tracking-widest">
                Education
              </h2>
              <div className="space-y-4">
                {education.map((edu, index) => (
                  <div key={index} className="text-sm">
                    <h3 className="font-bold">{edu.degree}</h3>
                    <p className="text-gray-700">{edu.school}</p>
                    <p className="text-gray-600 text-xs">{edu.field}</p>
                    <p className="text-gray-600 text-xs">{edu.graduationDate}</p>
                    {edu.gpa && <p className="text-gray-700 text-xs">GPA: {edu.gpa}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <div className="mb-6">
              <h2 className="text-base font-bold mb-3 uppercase tracking-widest">
                Skills
              </h2>
              <div className="space-y-1.5 text-sm">
                {skills.map((skill, index) => (
                  <div key={index} className="text-gray-800">{skill}</div>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {certifications && certifications.length > 0 && (
            <div className="mb-6">
              <h2 className="text-base font-bold mb-3 uppercase tracking-widest">
                Certifications
              </h2>
              <div className="space-y-4">
                {certifications.map((cert, index) => (
                  <div key={index} className="text-sm">
                    <h3 className="font-bold">{cert.name}</h3>
                    <p className="text-gray-700 text-xs">{cert.issuer}</p>
                    <p className="text-gray-600 text-xs">{cert.date}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Summary */}
          {summary && (
            <div className="mb-6">
              <h2 className="text-base font-bold mb-3 uppercase tracking-widest">
                Professional Summary
              </h2>
              <p className="text-sm leading-relaxed text-gray-800">{summary}</p>
            </div>
          )}

          {/* Experience */}
          {experience.length > 0 && (
            <div className="mb-6">
              <h2 className="text-base font-bold mb-4 uppercase tracking-widest">
                Experience
              </h2>
              <div className="space-y-5">
                {experience.map((exp, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-baseline mb-1">
                      <div>
                        <h3 className="font-bold text-base">{exp.title}</h3>
                        <p className="text-sm text-gray-700">{exp.company} • {exp.location}</p>
                      </div>
                      <p className="text-sm text-gray-600 font-medium">
                        {exp.startDate} - {exp.endDate || "Present"}
                      </p>
                    </div>
                    {exp.description.length > 0 && (
                      <ul className="list-disc list-outside ml-5 mt-2 space-y-1">
                        {exp.description.map((item, i) => (
                          <li key={i} className="text-sm text-gray-800 leading-relaxed">
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {projects && projects.length > 0 && (
            <div className="mb-6">
              <h2 className="text-base font-bold mb-4 uppercase tracking-widest">
                Projects
              </h2>
              <div className="space-y-4">
                {projects.map((project, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="font-bold text-base">{project.name}</h3>
                      {project.url && (
                        <span className="text-sm text-gray-600 break-all">{project.url}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-800 leading-relaxed mb-1">
                      {project.description}
                    </p>
                    {project.technologies.length > 0 && (
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">Technologies:</span> {project.technologies.join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
