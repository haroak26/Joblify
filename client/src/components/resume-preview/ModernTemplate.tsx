import { memo } from "react";
import { ResumeData } from "@shared/schema";
import { Mail, Phone, MapPin, Linkedin, Globe } from "lucide-react";

interface ModernTemplateProps {
  data: ResumeData;
}

// Modern Template - Two-column layout inspired by Olivia Mills design
const ModernTemplate = memo(function ModernTemplate({ data }: ModernTemplateProps) {
  const { personalInfo, summary, experience, education, skills, certifications, projects, awards, leadership, research, publications } = data;

  return (
    <div className="p-8 print:p-8 font-sans text-black h-full min-h-[1122px] bg-white flex flex-col" data-resume-preview-root="true">
      {/* Header */}
      <div className="mb-6 shrink-0" data-section="personal">
        <h1 className="text-3xl font-semibold mb-3 tracking-tight">
          {personalInfo.name || "Your Name"}
        </h1>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-700">
          {personalInfo.email && (
            <div className="flex items-center gap-1.5 leading-tight">
              <Mail className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="leading-tight">{personalInfo.email}</span>
            </div>
          )}
          {personalInfo.phone && (
            <div className="flex items-center gap-1.5 leading-tight">
              <Phone className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="leading-tight">{personalInfo.phone}</span>
            </div>
          )}
          {personalInfo.location && (
            <div className="flex items-center gap-1.5 leading-tight">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="leading-tight">{personalInfo.location}</span>
            </div>
          )}
          {personalInfo.linkedin && (
            <div className="flex items-center gap-1.5 leading-tight">
              <Linkedin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="break-all leading-tight">{personalInfo.linkedin}</span>
            </div>
          )}
          {personalInfo.website && (
            <div className="flex items-center gap-1.5 leading-tight">
              <Globe className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="break-all leading-tight">{personalInfo.website}</span>
            </div>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-6">
        {/* Main Content - Left Column (65%) */}
        <div className="flex-[65]">
          {/* Summary */}
          {summary && (
            <div className="mb-4" data-section="summary">
              <h2 className="text-base font-semibold mb-1.5 pb-1 border-b-2 border-gray-800 uppercase tracking-wide">
                Professional Summary
              </h2>
              <p className="text-sm leading-relaxed text-gray-800">{summary}</p>
            </div>
          )}

          {/* Experience */}
          {experience.length > 0 && (
            <div className="mb-4" data-section="experience">
              <h2 className="text-base font-semibold mb-2 pb-1 border-b-2 border-gray-800 uppercase tracking-wide">
                Experience
              </h2>
              <div className="space-y-3">
                {experience.map((exp, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-baseline mb-1">
                      <div className="flex-1">
                        <h3 className="font-semibold text-base">{exp.title}</h3>
                        <p className="text-sm text-gray-700">{exp.company}</p>
                      </div>
                      <div className="text-right text-sm text-gray-600 ml-2">
                        <p>{exp.location}</p>
                        <p>
                          {exp.startDate} - {exp.endDate || "Present"}
                        </p>
                      </div>
                    </div>
                    {exp.description && exp.description.length > 0 && (
                      <ul className="list-disc list-outside ml-5 mt-1.5 space-y-0.5">
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
            <div className="mb-4" data-section="projects">
              <h2 className="text-base font-semibold mb-2 pb-1 border-b-2 border-gray-800 uppercase tracking-wide">
                Projects
              </h2>
              <div className="space-y-2.5">
                {projects.map((project, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="font-semibold text-base">{project.name}</h3>
                      {project.url && (
                        <span className="text-sm text-gray-600 break-all ml-2">{project.url}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-800 leading-relaxed mb-1">
                      {project.description}
                    </p>
                    {project.technologies.length > 0 && (
                      <p className="text-sm text-gray-700">
                        <span>Technologies:</span> {project.technologies.join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Right Column (35%) */}
        <div className="flex-[35]">
          {/* Education */}
          {education.length > 0 && (
            <div className="mb-4" data-section="education">
              <h2 className="text-base font-semibold mb-2 pb-1 border-b-2 border-gray-800 uppercase tracking-wide">
                Education
              </h2>
              <div className="space-y-2.5">
                {education.map((edu, index) => (
                  <div key={index}>
                    <h3 className="font-semibold text-sm">{edu.school}</h3>
                    <p className="text-sm text-gray-700">
                      {edu.degree}
                    </p>
                    <p className="text-sm text-gray-700">
                      {edu.field}
                    </p>
                    <p className="text-sm text-gray-600">{edu.graduationDate}</p>
                    {edu.gpa && <p className="text-sm text-gray-700">GPA: {edu.gpa}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <div className="mb-4" data-section="skills">
              <h2 className="text-base font-semibold mb-2 pb-1 border-b-2 border-gray-800 uppercase tracking-wide">
                Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, index) => (
                  <span
                    key={index}
                    className="text-sm bg-gray-100 px-2 py-1 rounded"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {certifications && certifications.length > 0 && (
            <div className="mb-4" data-section="certifications">
              <h2 className="text-base font-semibold mb-2 pb-1 border-b-2 border-gray-800 uppercase tracking-wide">
                Certifications
              </h2>
              <div className="space-y-2.5">
                {certifications.map((cert, index) => (
                  <div key={index}>
                    <h3 className="font-semibold text-sm">{cert.name}</h3>
                    <p className="text-sm text-gray-700">{cert.issuer}</p>
                    <p className="text-sm text-gray-600">{cert.date}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Awards */}
          {awards && awards.length > 0 && (
            <div className="mb-4" data-section="awards">
              <h2 className="text-base font-semibold mb-2 pb-1 border-b-2 border-gray-800 uppercase tracking-wide">
                Awards & Honors
              </h2>
              <div className="space-y-2.5">
                {awards.map((award, index) => (
                  <div key={index}>
                    <h3 className="font-semibold text-sm">{award.title}</h3>
                    <p className="text-sm text-gray-700">{award.issuer}</p>
                    {award.description && (
                      <p className="text-sm text-gray-700 mt-1">{award.description}</p>
                    )}
                    <p className="text-sm text-gray-600">{award.date}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Leadership */}
      {leadership && leadership.length > 0 && (
        <div className="mb-4" data-section="leadership">
          <h2 className="text-base font-semibold mb-2 pb-1 border-b-2 border-gray-800 uppercase tracking-wide">
            Leadership Experience
          </h2>
          <div className="space-y-2.5">
            {leadership.map((lead, index) => (
              <div key={index}>
                <div className="flex justify-between items-baseline mb-1">
                  <div>
                    <h3 className="font-semibold text-base">{lead.title}</h3>
                    <p className="text-sm text-gray-700">{lead.organization}</p>
                  </div>
                  <p className="text-sm text-gray-600">
                    {lead.startDate} - {lead.endDate || "Present"}
                  </p>
                </div>
                <p className="text-sm text-gray-800 leading-relaxed">{lead.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Research */}
      {research && research.length > 0 && (
        <div className="mb-4" data-section="research">
          <h2 className="text-base font-semibold mb-2 pb-1 border-b-2 border-gray-800 uppercase tracking-wide">
            Research Experience
          </h2>
          <div className="space-y-2.5">
            {research.map((res, index) => (
              <div key={index}>
                <div className="flex justify-between items-baseline mb-1">
                  <div>
                    <h3 className="font-semibold text-base">{res.title}</h3>
                    <p className="text-sm text-gray-700">{res.institution}</p>
                  </div>
                  <p className="text-sm text-gray-600">
                    {res.startDate} - {res.endDate || "Present"}
                  </p>
                </div>
                <p className="text-sm text-gray-800 leading-relaxed mb-1">{res.description}</p>
                {res.url && (
                  <p className="text-sm text-gray-700 break-all">{res.url}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Publications */}
      {publications && publications.length > 0 && (
        <div className="mb-4" data-section="publications">
          <h2 className="text-base font-semibold mb-2 pb-1 border-b-2 border-gray-800 uppercase tracking-wide">
            Publications
          </h2>
          <div className="space-y-1.5">
            {publications.map((pub, index) => (
              <div key={index}>
                <h3 className="font-semibold text-sm">{pub.title}</h3>
                <p className="text-sm text-gray-700">{pub.authors}</p>
                <p className="text-sm text-gray-700">
                  {pub.journal} • {pub.date}
                </p>
                {pub.url && (
                  <p className="text-sm text-gray-700 break-all">{pub.url}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default ModernTemplate;
