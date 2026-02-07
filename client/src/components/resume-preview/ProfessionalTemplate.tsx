import { ResumeData } from "@shared/schema";

interface ProfessionalTemplateProps {
  data: ResumeData;
}

export default function ProfessionalTemplate({ data }: ProfessionalTemplateProps) {
  const { personalInfo, summary, experience, education, skills, certifications, projects } = data;

  return (
    <div className="p-12 print:p-12 text-black">
      {/* Header */}
      <div className="mb-6 text-center border-b-2 border-black pb-4">
        <h1 className="text-3xl font-serif font-bold mb-2">{personalInfo.name || "Your Name"}</h1>
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-sm font-sans">
          {personalInfo.email && <span>{personalInfo.email}</span>}
          {personalInfo.phone && <span>•</span>}
          {personalInfo.phone && <span>{personalInfo.phone}</span>}
          {personalInfo.location && <span>•</span>}
          {personalInfo.location && <span>{personalInfo.location}</span>}
        </div>
        {(personalInfo.linkedin || personalInfo.website) && (
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-sm font-sans mt-1">
            {personalInfo.linkedin && (
              <span className="break-all">{personalInfo.linkedin}</span>
            )}
            {personalInfo.website && personalInfo.linkedin && <span>•</span>}
            {personalInfo.website && (
              <span className="break-all">{personalInfo.website}</span>
            )}
          </div>
        )}
      </div>

      {/* Summary */}
      {summary && (
        <div className="mb-5">
          <h2 className="text-base font-serif font-bold mb-2 uppercase tracking-wide">
            Professional Summary
          </h2>
          <p className="text-sm font-sans leading-relaxed text-gray-800">{summary}</p>
        </div>
      )}

      {/* Experience */}
      {experience.length > 0 && (
        <div className="mb-5">
          <h2 className="text-base font-serif font-bold mb-3 uppercase tracking-wide">
            Professional Experience
          </h2>
          <div className="space-y-4">
            {experience.map((exp, index) => (
              <div key={index} className="font-sans">
                <div className="flex justify-between items-baseline mb-1">
                  <div>
                    <h3 className="font-bold text-base">{exp.title}</h3>
                    <p className="text-sm italic">{exp.company}, {exp.location}</p>
                  </div>
                  <p className="text-sm">
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

      {/* Education */}
      {education.length > 0 && (
        <div className="mb-5">
          <h2 className="text-base font-serif font-bold mb-3 uppercase tracking-wide">
            Education
          </h2>
          <div className="space-y-3 font-sans">
            {education.map((edu, index) => (
              <div key={index}>
                <div className="flex justify-between items-baseline">
                  <div>
                    <h3 className="font-bold text-base">{edu.school}</h3>
                    <p className="text-sm">
                      {edu.degree} in {edu.field}
                      {edu.gpa && ` • GPA: ${edu.gpa}`}
                    </p>
                  </div>
                  <p className="text-sm">{edu.graduationDate}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <div className="mb-5">
          <h2 className="text-base font-serif font-bold mb-2 uppercase tracking-wide">
            Skills
          </h2>
          <p className="text-sm font-sans text-gray-800 leading-relaxed">
            {skills.join(", ")}
          </p>
        </div>
      )}

      {/* Certifications */}
      {certifications && certifications.length > 0 && (
        <div className="mb-5">
          <h2 className="text-base font-serif font-bold mb-3 uppercase tracking-wide">
            Certifications
          </h2>
          <div className="space-y-2 font-sans">
            {certifications.map((cert, index) => (
              <div key={index} className="flex justify-between items-baseline">
                <div>
                  <h3 className="font-bold text-sm">{cert.name}</h3>
                  <p className="text-sm">{cert.issuer}</p>
                </div>
                <p className="text-sm">{cert.date}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects */}
      {projects && projects.length > 0 && (
        <div className="mb-5">
          <h2 className="text-base font-serif font-bold mb-3 uppercase tracking-wide">
            Projects
          </h2>
          <div className="space-y-3 font-sans">
            {projects.map((project, index) => (
              <div key={index}>
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-bold text-base">{project.name}</h3>
                  {project.url && (
                    <span className="text-sm break-all">{project.url}</span>
                  )}
                </div>
                <p className="text-sm text-gray-800 leading-relaxed mb-1">
                  {project.description}
                </p>
                {project.technologies.length > 0 && (
                  <p className="text-sm">
                    <span className="font-medium">Technologies:</span> {project.technologies.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
