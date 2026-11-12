export const APPLICATION_EXPORT_COLUMNS = [
  "Application ID",
  "Applicant",
  "Email",
  "Track",
  "College",
  "Applied On",
  "Status",
  "Intro video",
  "LinkedIn",
  "Has video",
];

export function applicationExportRow(application) {
  return [
    application.id,
    application.name,
    application.email,
    application.program,
    application.college || "",
    application.appliedOn,
    application.status,
    application.videoUrl || "",
    application.linkedin || "",
    application.hasVideo ? "Yes" : "No",
  ];
}
