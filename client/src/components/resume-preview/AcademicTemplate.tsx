import { memo } from "react";
import { ResumeData } from "@shared/schema";
import { Mail, Phone, MapPin, Linkedin, Globe } from "lucide-react";

interface AcademicTemplateProps {
  data: ResumeData;
}

// Academic Template - Clean professional design with left sidebar
const AcademicTemplate = memo(function AcademicTemplate({ data }: AcademicTemplateProps) {
  const { personalInfo, summary, experience, education, skills, certifications, projects, awards, leadership, research, publications } = data;

  return (
    <div className="flex h-full min-h-[1122px] bg-white items-stretch" data-resume-preview-root="true">
      {/* Left Sidebar - Gray background */}
      <div className="w-[35%] bg-gray-100 p-8 print:p-8 flex flex-col shrink-0">
        <div className="mb-8" data-section="personal">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-600 mb-4 pb-2 border-b border-gray-400">
            Contact
          </h2>
          <div className="space-y-3 text-xs flex-1">
            {personalInfo.email && (
              <div className="flex items-center gap-2 leading-none py-0.5">
                <Mail className="w-3.5 h-3.5 flex-shrink-0 text-gray-600" />
                <span className="break-all inline-block align-middle">{personalInfo.email}</span>
              </div>
            )}
            {personalInfo.phone && (
              <div className="flex items-center gap-2 leading-none py-0.5">
                <Phone className="w-3.5 h-3.5 flex-shrink-0 text-gray-600" />
                <span className="inline-block align-middle">{personalInfo.phone}</span>
              </div>
            )}
            {personalInfo.location && (
              <div className="flex items-center gap-2 leading-none py-0.5">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-gray-600" />
                <span className="inline-block align-middle">{personalInfo.location}</span>
              </div>
            )}
            {personalInfo.linkedin && (
              <div className="flex items-center gap-2 leading-none py-0.5">
                <Linkedin className="w-3.5 h-3.5 flex-shrink-0 text-gray-600" />
                <span className="break-all inline-block align-middle">{personalInfo.linkedin}</span>
              </div>
            )}
            {personalInfo.website && (
              <div className="flex items-center gap-2 leading-none py-0.5">
                <Globe className="w-3.5 h-3.5 flex-shrink-0 text-gray-600" />
                <span className="break-all inline-block align-middle">{personalInfo.website}</span>
              </div>
            )}
          </div>
        </div>

        {/* Education */}
        {education.length > 0 && (
          <div className="mb-6" data-section="education">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-600 mb-3 pb-2 border-b border-gray-400">
              Education
            </h2>
            <div className="space-y-3">
              {education.map((edu, index) => (
                <div key={index} className="text-xs">
                  <h3 className="font-semibold text-sm">{edu.degree}</h3>
                  <p className="text-gray-700">{edu.school}</p>
                  <p className="text-gray-600">{edu.field}</p>
                  <p className="text-gray-600">{edu.graduationDate}</p>
                  {edu.gpa && <p className="text-gray-700">GPA: {edu.gpa}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <div className="mb-6" data-section="skills">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-600 mb-3 pb-2 border-b border-gray-400">
              Skills
            </h2>
            <div className="space-y-1 text-xs">
              {skills.map((skill, index) => (
                <div key={index} className="text-gray-800">• {skill}</div>
              ))}
            </div>
          </div>
        )}

        {/* Certifications */}
        {certifications && certifications.length > 0 && (
          <div className="mb-6" data-section="certifications">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-600 mb-3 pb-2 border-b border-gray-400">
              Certifications
            </h2>
            <div className="space-y-3">
              {certifications.map((cert, index) => (
                <div key={index} className="text-xs">
                  <h3 className="font-semibold">{cert.name}</h3>
                  <p className="text-gray-700">{cert.issuer}</p>
                  <p className="text-gray-600">{cert.date}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Awards */}
        {awards && awards.length > 0 && (
          <div className="mb-6" data-section="awards">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-600 mb-3 pb-2 border-b border-gray-400">
              Awards & Honors
            </h2>
            <div className="space-y-3">
              {awards.map((award, index) => (
                <div key={index} className="text-xs">
                  <h3 className="font-semibold">{award.title}</h3>
                  <p className="text-gray-700">{award.issuer}</p>
                  {award.description && (
                    <p className="text-gray-700 mt-1">{award.description}</p>
                  )}
                  <p className="text-gray-600">{award.date}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Main Content */}
      <div className="flex-1 p-8 print:p-8">
        {/* Name */}
        <div className="mb-6">
          <h1 className="text-3xl font-semibold mb-2">{personalInfo.name || "Your Name"}</h1>
        </div>

        {/* Summary */}
        {summary && (
          <div className="mb-6" data-section="summary">
            <h2 className="text-base font-semibold mb-2 uppercase tracking-wide text-gray-800">
              Professional Summary
            </h2>
            <p className="text-sm leading-relaxed text-gray-800">{summary}</p>
          </div>
        )}

        {/* Experience */}
        {experience.length > 0 && (
          <div className="mb-6" data-section="experience">
            <h2 className="text-base font-semibold mb-3 uppercase tracking-wide text-gray-800">
              Experience
            </h2>
            <div className="space-y-4">
              {experience.map((exp, index) => (
                <div key={index}>
                  <div className="flex justify-between items-baseline mb-1">
                    <div>
                      <h3 className="font-semibold text-base">{exp.title}</h3>
                      <p className="text-sm text-gray-700">{exp.company} • {exp.location}</p>
                    </div>
                    <p className="text-sm text-gray-600">
                      {exp.startDate} - {exp.endDate || "Present"}
                    </p>
                  </div>
                  {exp.description && exp.description.length > 0 && (
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
          <div className="mb-6" data-section="projects">
            <h2 className="text-base font-semibold mb-3 uppercase tracking-wide text-gray-800">
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
                      <span>Technologies:</span> {project.technologies.join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leadership */}
        {leadership && leadership.length > 0 && (
          <div className="mb-6" data-section="leadership">
            <h2 className="text-base font-semibold mb-3 uppercase tracking-wide text-gray-800">
              Leadership Experience
            </h2>
            <div className="space-y-3">
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
          <div className="mb-6" data-section="research">
            <h2 className="text-base font-semibold mb-3 uppercase tracking-wide text-gray-800">
              Research Experience
            </h2>
            <div className="space-y-3">
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
          <div className="mb-6" data-section="publications">
            <h2 className="text-base font-semibold mb-3 uppercase tracking-wide text-gray-800">
              Publications
            </h2>
            <div className="space-y-2">
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
    </div>
  );
});

export default AcademicTemplate;
