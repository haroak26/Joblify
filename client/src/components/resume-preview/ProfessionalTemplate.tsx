import { memo } from "react";
import { ResumeData } from "@shared/schema";
import { Mail, Phone, MapPin, Linkedin, Globe } from "lucide-react";

interface ProfessionalTemplateProps {
  data: ResumeData;
}

// Professional Template - Centered header design inspired by Sophia Williams
const ProfessionalTemplate = memo(function ProfessionalTemplate({ data }: ProfessionalTemplateProps) {
  const { personalInfo, summary, experience, education, skills, certifications, projects, awards, leadership, research, publications } = data;

  return (
    <div className="p-8 print:p-8 text-black h-full min-h-[1122px] bg-white flex flex-col" data-resume-preview-root="true">
      {/* Centered Header */}
      <div className="mb-8 text-center border-b-2 border-black pb-6 shrink-0" data-section="personal">
        <h1 className="text-3xl font-serif font-semibold mb-4">{personalInfo.name || "Your Name"}</h1>
        <div className="inline-flex flex-col items-start gap-1.5 text-sm font-sans text-left">
          {personalInfo.email && (
            <div className="flex items-center gap-1.5 leading-none">
              <Mail className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="break-all inline-block align-middle pb-[1px]">{personalInfo.email}</span>
            </div>
          )}
          {personalInfo.phone && (
            <div className="flex items-center gap-1.5 leading-none">
              <Phone className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="inline-block align-middle pb-[1px]">{personalInfo.phone}</span>
            </div>
          )}
          {personalInfo.location && (
            <div className="flex items-center gap-1.5 leading-none">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="inline-block align-middle pb-[1px]">{personalInfo.location}</span>
            </div>
          )}
          {personalInfo.linkedin && (
            <div className="flex items-center gap-1.5 leading-none">
              <Linkedin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="break-all inline-block align-middle pb-[1px]">{personalInfo.linkedin}</span>
            </div>
          )}
          {personalInfo.website && (
            <div className="flex items-center gap-1.5 leading-none">
              <Globe className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="break-all inline-block align-middle pb-[1px]">{personalInfo.website}</span>
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="mb-5" data-section="summary">
          <h2 className="text-base font-serif font-semibold mb-2 uppercase tracking-wider border-b border-gray-400 pb-1">
            Professional Summary
          </h2>
          <p className="text-sm font-sans leading-relaxed text-gray-800">{summary}</p>
        </div>
      )}

      {/* Experience */}
      {experience.length > 0 && (
        <div className="mb-5" data-section="experience">
          <h2 className="text-base font-serif font-semibold mb-3 uppercase tracking-wider border-b border-gray-400 pb-1">
            Professional Experience
          </h2>
          <div className="space-y-4">
            {experience.map((exp, index) => (
              <div key={index} className="font-sans">
                <div className="flex justify-between items-baseline mb-1">
                  <div>
                    <h3 className="font-semibold text-base">{exp.title}</h3>
                    <p className="text-sm italic text-gray-700">{exp.company}, {exp.location}</p>
                  </div>
                  <p className="text-sm text-gray-700">
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

      {/* Education */}
      {education.length > 0 && (
        <div className="mb-5" data-section="education">
          <h2 className="text-base font-serif font-semibold mb-3 uppercase tracking-wider border-b border-gray-400 pb-1">
            Education
          </h2>
          <div className="space-y-3 font-sans">
            {education.map((edu, index) => (
              <div key={index}>
                <div className="flex justify-between items-baseline">
                  <div>
                    <h3 className="font-semibold text-base">{edu.school}</h3>
                    <p className="text-sm text-gray-700">
                      {edu.degree} in {edu.field}
                      {edu.gpa && ` • GPA: ${edu.gpa}`}
                    </p>
                  </div>
                  <p className="text-sm text-gray-700">{edu.graduationDate}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <div className="mb-5" data-section="skills">
          <h2 className="text-base font-serif font-semibold mb-2 uppercase tracking-wider border-b border-gray-400 pb-1">
            Skills
          </h2>
          <p className="text-sm font-sans text-gray-800 leading-relaxed">
            {skills.join(", ")}
          </p>
        </div>
      )}

      {/* Certifications */}
      {certifications && certifications.length > 0 && (
        <div className="mb-5" data-section="certifications">
          <h2 className="text-base font-serif font-semibold mb-3 uppercase tracking-wider border-b border-gray-400 pb-1">
            Certifications
          </h2>
          <div className="space-y-2 font-sans">
            {certifications.map((cert, index) => (
              <div key={index} className="flex justify-between items-baseline">
                <div>
                  <h3 className="font-semibold text-sm">{cert.name}</h3>
                  <p className="text-sm text-gray-700">{cert.issuer}</p>
                </div>
                <p className="text-sm text-gray-700">{cert.date}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects */}
      {projects && projects.length > 0 && (
        <div className="mb-5" data-section="projects">
          <h2 className="text-base font-serif font-semibold mb-3 uppercase tracking-wider border-b border-gray-400 pb-1">
            Projects
          </h2>
          <div className="space-y-3 font-sans">
            {projects.map((project, index) => (
              <div key={index}>
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-semibold text-base">{project.name}</h3>
                  {project.url && (
                    <span className="text-sm text-gray-700 break-all">{project.url}</span>
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

      {/* Awards */}
      {awards && awards.length > 0 && (
        <div className="mb-5" data-section="awards">
          <h2 className="text-base font-serif font-semibold mb-3 uppercase tracking-wider border-b border-gray-400 pb-1">
            Awards & Honors
          </h2>
          <div className="space-y-2 font-sans">
            {awards.map((award, index) => (
              <div key={index} className="flex justify-between items-baseline">
                <div>
                  <h3 className="font-semibold text-sm">{award.title}</h3>
                  <p className="text-sm text-gray-700">{award.issuer}</p>
                  {award.description && (
                    <p className="text-sm text-gray-700 mt-1">{award.description}</p>
                  )}
                </div>
                <p className="text-sm text-gray-700">{award.date}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leadership */}
      {leadership && leadership.length > 0 && (
        <div className="mb-5" data-section="leadership">
          <h2 className="text-base font-serif font-semibold mb-3 uppercase tracking-wider border-b border-gray-400 pb-1">
            Leadership Experience
          </h2>
          <div className="space-y-3 font-sans">
            {leadership.map((lead, index) => (
              <div key={index}>
                <div className="flex justify-between items-baseline mb-1">
                  <div>
                    <h3 className="font-semibold text-base">{lead.title}</h3>
                    <p className="text-sm text-gray-700">{lead.organization}</p>
                  </div>
                  <p className="text-sm text-gray-700">
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
        <div className="mb-5" data-section="research">
          <h2 className="text-base font-serif font-semibold mb-3 uppercase tracking-wider border-b border-gray-400 pb-1">
            Research Experience
          </h2>
          <div className="space-y-3 font-sans">
            {research.map((res, index) => (
              <div key={index}>
                <div className="flex justify-between items-baseline mb-1">
                  <div>
                    <h3 className="font-semibold text-base">{res.title}</h3>
                    <p className="text-sm text-gray-700">{res.institution}</p>
                  </div>
                  <p className="text-sm text-gray-700">
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
        <div className="mb-5" data-section="publications">
          <h2 className="text-base font-serif font-semibold mb-3 uppercase tracking-wider border-b border-gray-400 pb-1">
            Publications
          </h2>
          <div className="space-y-2 font-sans">
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

export default ProfessionalTemplate;
