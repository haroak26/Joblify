import type { ResumeData } from "@shared/schema";
import { Mail, Phone, MapPin, Linkedin, Globe } from "lucide-react";

interface CreativeTemplateProps {
  resumeData: ResumeData;
}

export function CreativeTemplate({ resumeData }: CreativeTemplateProps) {
  const { personalInfo, summary, experience, education, skills, certifications, projects } = resumeData;

  return (
    <div className="bg-white text-gray-900 p-8 max-w-[8.5in] mx-auto shadow-lg">
      {/* Header with Purple Accent */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-500 text-white p-6 -m-8 mb-6">
        <h1 className="text-4xl font-bold mb-3">
          {personalInfo.name || "Your Name"}
        </h1>
        <div className="flex flex-wrap gap-3 text-sm">
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

      <div className="space-y-6">
        {summary && (
          <section>
            <h2 className="text-xl font-bold text-purple-600 mb-2">About Me</h2>
            <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
          </section>
        )}

        {experience && experience.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-purple-600 mb-3">Experience</h2>
            <div className="space-y-4">
              {experience.map((exp, idx) => (
                <div key={idx} className="border-l-4 border-purple-400 pl-4">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <h3 className="font-bold text-lg text-gray-900">{exp.title}</h3>
                      <p className="text-purple-600 font-semibold">{exp.company}</p>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <p>{exp.location}</p>
                      <p>{exp.startDate} - {exp.endDate || "Present"}</p>
                    </div>
                  </div>
                  {exp.description && exp.description.length > 0 && (
                    <ul className="list-disc list-outside ml-5 space-y-1 text-sm text-gray-700 mt-2">
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

        {education && education.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-purple-600 mb-3">Education</h2>
            <div className="space-y-3">
              {education.map((edu, idx) => (
                <div key={idx} className="border-l-4 border-pink-400 pl-4">
                  <h3 className="font-bold text-gray-900">{edu.degree} in {edu.field}</h3>
                  <p className="text-sm text-gray-700">{edu.school}</p>
                  <p className="text-sm text-gray-500">{edu.graduationDate}</p>
                  {edu.gpa && <p className="text-sm text-gray-600">GPA: {edu.gpa}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-2 gap-6">
          {skills && skills.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-purple-600 mb-3">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 text-sm rounded-full font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

          {certifications && certifications.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-purple-600 mb-3">Certifications</h2>
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

        {projects && projects.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-purple-600 mb-3">Projects</h2>
            <div className="grid grid-cols-2 gap-4">
              {projects.map((project, idx) => (
                <div key={idx} className="border border-purple-200 rounded-lg p-3 bg-purple-50">
                  <h3 className="font-bold text-purple-900">{project.name}</h3>
                  <p className="text-sm text-gray-700 mb-1">{project.description}</p>
                  {project.technologies && project.technologies.length > 0 && (
                    <p className="text-xs text-gray-600">
                      {project.technologies.join(" • ")}
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
