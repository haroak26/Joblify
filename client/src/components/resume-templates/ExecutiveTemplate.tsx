import type { ResumeData } from "@shared/schema";
import { Mail, Phone, MapPin, Linkedin, Globe } from "lucide-react";

interface ExecutiveTemplateProps {
  resumeData: ResumeData;
}

export function ExecutiveTemplate({ resumeData }: ExecutiveTemplateProps) {
  const { personalInfo, summary, experience, education, skills, certifications, projects } = resumeData;

  return (
    <div className="bg-white text-slate-900 p-10 max-w-[8.5in] mx-auto shadow-xl border border-slate-200 font-sans">
      {/* Executive Header */}
      <div className="mb-6 pb-5 border-b border-slate-200">
        <h1 className="text-4xl font-semibold text-slate-900 mb-3 tracking-tight">
          {personalInfo.name || "Your Name"}
        </h1>
        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
          {personalInfo.email && (
            <div className="flex items-center gap-1">
              <Mail className="w-4 h-4 text-slate-500" />
              <span>{personalInfo.email}</span>
            </div>
          )}
          {personalInfo.phone && (
            <div className="flex items-center gap-1">
              <Phone className="w-4 h-4 text-slate-500" />
              <span>{personalInfo.phone}</span>
            </div>
          )}
          {personalInfo.location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4 text-slate-500" />
              <span>{personalInfo.location}</span>
            </div>
          )}
          {personalInfo.linkedin && (
            <div className="flex items-center gap-1">
              <Linkedin className="w-4 h-4 text-slate-500" />
              <span className="truncate">{personalInfo.linkedin}</span>
            </div>
          )}
          {personalInfo.website && (
            <div className="flex items-center gap-1">
              <Globe className="w-4 h-4 text-slate-500" />
              <span className="truncate">{personalInfo.website}</span>
            </div>
          )}
        </div>
      </div>

      {/* Executive Summary */}
      {summary && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-[0.25em] mb-3">
            Executive Summary
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed">{summary}</p>
        </section>
      )}

      {/* Professional Experience */}
      {experience && experience.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-[0.25em] mb-4">
            Professional Experience
          </h2>
          <div className="space-y-6">
            {experience.map((exp, idx) => (
              <div key={idx}>
                <div className="mb-2">
                  <div className="flex justify-between items-baseline">
                    <h3 className="text-lg font-semibold text-slate-900">{exp.title}</h3>
                    <span className="text-sm font-semibold text-slate-500">
                      {exp.startDate} - {exp.endDate || "Present"}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <p className="text-sm font-semibold text-slate-700">{exp.company}</p>
                    <p className="text-sm text-slate-500">{exp.location}</p>
                  </div>
                </div>
                {exp.description && exp.description.length > 0 && (
                  <ul className="list-disc list-outside ml-6 space-y-1.5 text-sm text-slate-700">
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

      {/* Two Column Section */}
      <div className="grid grid-cols-2 gap-8">
        {/* Education */}
        {education && education.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-[0.25em] mb-4">
              Education
            </h2>
            <div className="space-y-3">
              {education.map((edu, idx) => (
                <div key={idx}>
                  <h3 className="font-semibold text-sm text-slate-900">{edu.degree}</h3>
                  <p className="text-sm text-slate-700">{edu.field}</p>
                  <p className="text-sm font-semibold text-slate-800">{edu.school}</p>
                  <p className="text-sm text-slate-500">{edu.graduationDate}</p>
                  {edu.gpa && <p className="text-sm text-slate-600">GPA: {edu.gpa}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Skills */}
        {skills && skills.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-[0.25em] mb-4">
              Core Competencies
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {skills.map((skill, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-slate-600 rounded-full"></div>
                  <span className="text-sm text-slate-700">{skill}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Certifications */}
      {certifications && certifications.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-[0.25em] mb-4">
            Certifications
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {certifications.map((cert, idx) => (
              <div key={idx}>
                <h3 className="font-semibold text-sm text-slate-900">{cert.name}</h3>
                <p className="text-xs text-slate-600">{cert.issuer} • {cert.date}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {projects && projects.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-[0.25em] mb-4">
            Key Projects
          </h2>
          <div className="space-y-4">
            {projects.map((project, idx) => (
              <div key={idx}>
                <h3 className="font-semibold text-sm text-slate-900">{project.name}</h3>
                <p className="text-sm text-slate-700">{project.description}</p>
                {project.technologies && project.technologies.length > 0 && (
                  <p className="text-xs text-slate-600 mt-1">
                    {project.technologies.join(" | ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
