import { ResumeData } from "@shared/schema";

interface ModernTemplateProps {
  data: ResumeData;
}

export default function ModernTemplate({ data }: ModernTemplateProps) {
  const { personalInfo, summary, experience, education, skills, certifications, projects } = data;

  return (
    <div className="p-12 print:p-12 font-sans text-black">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 tracking-tight">{personalInfo.name || "Your Name"}</h1>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700">
          {personalInfo.email && <span>{personalInfo.email}</span>}
          {personalInfo.phone && <span>{personalInfo.phone}</span>}
          {personalInfo.location && <span>{personalInfo.location}</span>}
          {personalInfo.linkedin && (
            <span className="break-all">{personalInfo.linkedin}</span>
          )}
          {personalInfo.website && (
            <span className="break-all">{personalInfo.website}</span>
          )}
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2 pb-1 border-b border-gray-300">
            Professional Summary
          </h2>
          <p className="text-sm leading-relaxed text-gray-800">{summary}</p>
        </div>
      )}

      {/* Experience */}
      {experience.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2 pb-1 border-b border-gray-300">
            Experience
          </h2>
          <div className="space-y-4">
            {experience.map((exp, index) => (
              <div key={index}>
                <div className="flex justify-between items-baseline mb-1">
                  <div>
                    <h3 className="font-semibold text-base">{exp.title}</h3>
                    <p className="text-sm text-gray-700">{exp.company}</p>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <p>{exp.location}</p>
                    <p>
                      {exp.startDate} - {exp.endDate || "Present"}
                    </p>
                  </div>
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

      {/* Education */}
      {education.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2 pb-1 border-b border-gray-300">
            Education
          </h2>
          <div className="space-y-3">
            {education.map((edu, index) => (
              <div key={index}>
                <div className="flex justify-between items-baseline">
                  <div>
                    <h3 className="font-semibold text-base">{edu.school}</h3>
                    <p className="text-sm text-gray-700">
                      {edu.degree} in {edu.field}
                      {edu.gpa && ` - GPA: ${edu.gpa}`}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600">{edu.graduationDate}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2 pb-1 border-b border-gray-300">
            Skills
          </h2>
          <p className="text-sm text-gray-800 leading-relaxed">
            {skills.join(" • ")}
          </p>
        </div>
      )}

      {/* Projects */}
      {projects && projects.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2 pb-1 border-b border-gray-300">
            Projects
          </h2>
          <div className="space-y-3">
            {projects.map((project, index) => (
              <div key={index}>
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-semibold text-base">{project.name}</h3>
                  {project.url && (
                    <span className="text-sm text-gray-600 break-all">{project.url}</span>
                  )}
                </div>
                <p className="text-sm text-gray-800 leading-relaxed mb-1">
                  {project.description}
                </p>
                {project.technologies.length > 0 && (
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Technologies:</span> {project.technologies.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {certifications && certifications.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2 pb-1 border-b border-gray-300">
            Certifications
          </h2>
          <div className="space-y-2">
            {certifications.map((cert, index) => (
              <div key={index} className="flex justify-between items-baseline">
                <div>
                  <h3 className="font-semibold text-sm">{cert.name}</h3>
                  <p className="text-sm text-gray-700">{cert.issuer}</p>
                </div>
                <p className="text-sm text-gray-600">{cert.date}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
