import type { ResumeData } from "@shared/schema";
import { Mail, Phone, MapPin, Linkedin, Globe } from "lucide-react";

interface TechnicalTemplateProps {
  resumeData: ResumeData;
}

export function TechnicalTemplate({ resumeData }: TechnicalTemplateProps) {
  const { personalInfo, summary, experience, education, skills, certifications, projects } = resumeData;

  return (
    <div className="bg-white text-slate-900 p-10 max-w-[8.5in] mx-auto shadow-xl border border-slate-200 font-sans">
      {/* Header */}
      <div className="mb-6 pb-4 border-b border-slate-200">
        <h1 className="text-3xl font-semibold text-slate-900 mb-2 tracking-tight">
          {personalInfo.name || "Your Name"}
        </h1>
        <div className="flex flex-wrap gap-4 text-xs text-slate-600">
          {personalInfo.email && <span>{personalInfo.email}</span>}
          {personalInfo.phone && <span>{personalInfo.phone}</span>}
          {personalInfo.location && <span>{personalInfo.location}</span>}
          {personalInfo.linkedin && <span className="truncate">{personalInfo.linkedin}</span>}
          {personalInfo.website && <span className="truncate">{personalInfo.website}</span>}
        </div>
      </div>

      {/* Skills First - Technical Focus */}
      {skills && skills.length > 0 && (
        <section className="mb-5">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-[0.25em] mb-3">
            Technical Skills
          </h2>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {skills.map((skill, idx) => (
              <div
                key={idx}
                className="border border-slate-200 bg-slate-50 px-2 py-1 text-center rounded-full text-slate-700"
              >
                {skill}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Summary */}
      {summary && (
        <section className="mb-5">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-[0.25em] mb-3">
            Summary
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed">{summary}</p>
        </section>
      )}

      {/* Projects - High Priority for Technical */}
      {projects && projects.length > 0 && (
        <section className="mb-5">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-[0.25em] mb-3">
            Projects
          </h2>
          <div className="space-y-4">
            {projects.map((project, idx) => (
              <div key={idx} className="border-l-2 border-slate-300 pl-3">
                <h3 className="font-semibold text-sm text-slate-900">{project.name}</h3>
                <p className="text-sm text-slate-700 mb-1">{project.description}</p>
                {project.technologies && project.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {project.technologies.map((tech, i) => (
                      <span
                        key={i}
                        className="text-xs bg-slate-100 px-2 py-0.5 border border-slate-200 rounded-full text-slate-700"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Experience */}
      {experience && experience.length > 0 && (
        <section className="mb-5">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-[0.25em] mb-3">
            Experience
          </h2>
          <div className="space-y-4">
            {experience.map((exp, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-semibold text-sm text-slate-900">{exp.title} @ {exp.company}</h3>
                  <span className="text-xs text-slate-500">
                    {exp.startDate} - {exp.endDate || "Present"}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mb-1">{exp.location}</p>
                {exp.description && exp.description.length > 0 && (
                  <ul className="list-disc list-outside ml-5 space-y-0.5 text-xs text-slate-700">
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

      {/* Education and Certifications Side by Side */}
      <div className="grid grid-cols-2 gap-5">
        {education && education.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-[0.25em] mb-3">
              Education
            </h2>
            <div className="space-y-2">
              {education.map((edu, idx) => (
                <div key={idx}>
                  <h3 className="font-semibold text-xs text-slate-900">{edu.degree}</h3>
                  <p className="text-xs text-slate-700">{edu.field}</p>
                  <p className="text-xs text-slate-600">{edu.school}</p>
                  <p className="text-xs text-slate-500">{edu.graduationDate}</p>
                  {edu.gpa && <p className="text-xs text-slate-600">GPA: {edu.gpa}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {certifications && certifications.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-[0.25em] mb-3">
              Certifications
            </h2>
            <div className="space-y-2">
              {certifications.map((cert, idx) => (
                <div key={idx}>
                  <h3 className="font-semibold text-xs text-slate-900">{cert.name}</h3>
                  <p className="text-xs text-slate-600">{cert.issuer}</p>
                  <p className="text-xs text-slate-500">{cert.date}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
