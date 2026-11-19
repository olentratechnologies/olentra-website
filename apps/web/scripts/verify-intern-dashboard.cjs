#!/usr/bin/env node
// Read-only fixture checks. Run: node frontend/scripts/verify-intern-dashboard.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const data = JSON.parse(
  fs.readFileSync(path.join(root, "src/data/intern-dashboard.json"), "utf8"),
);
let checks = 0;
function verify(label, check) {
  try {
    check();
    checks++;
  } catch (error) {
    error.message = `${label}: ${error.message}`;
    throw error;
  }
}
const byId = (records) => new Map(records.map((record) => [record.id, record]));
const applications = byId(data.applications);
const interns = byId(data.interns);
const projects = byId(data.projects);
const internByApplication = new Map(
  data.interns.map((intern) => [intern.applicationId, intern]),
);
const statuses = {
  Applied: 200,
  "Under Review": 258,
  Shortlisted: 900,
  Selected: 180,
  Joined: 740,
  Rejected: 262,
};
const programs = { "software-engineer": 2540 };
const monthNumbers = {
  Jun: "06",
  Jul: "07",
  Aug: "08",
  Sep: "09",
  Oct: "10",
  Nov: "11",
};
const expectedMonths = {
  Jun: 132,
  Jul: 188,
  Aug: 316,
  Sep: 436,
  Oct: 1058,
  Nov: 410,
};
function validDate(value) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value
  );
}

verify("Unique record IDs", () => {
  for (const collection of [
    "applications",
    "interns",
    "projects",
    "certificates",
    "contributions",
    "activity",
  ]) {
    const records = data[collection] || [];
    assert.equal(
      new Set(records.map((record) => record.id)).size,
      records.length,
      collection,
    );
    assert(
      records.every(
        (record) => typeof record.id === "string" && record.id.length > 0,
      ),
      collection,
    );
  }
});
verify("Application totals and unique identities", () => {
  assert.equal(data.applications.length, 2540);
  assert.equal(
    new Set(data.applications.map((application) => application.email)).size,
    2540,
  );
  assert.equal(
    new Set(data.applications.map((application) => application.name)).size,
    2540,
  );
  for (const [status, total] of Object.entries(statuses))
    assert.equal(
      data.applications.filter((application) => application.status === status)
        .length,
      total,
      status,
    );
  for (const [program, total] of Object.entries(programs))
    assert.equal(
      data.applications.filter((application) => application.programId === program)
        .length,
      total,
      program,
    );
  assert.equal(
    Object.values(statuses).reduce((sum, value) => sum + value, 0),
    data.applications.length,
  );
});
verify("Application profile and history integrity", () => {
  data.applications.forEach((application) => {
    assert(validDate(application.appliedOn), application.id);
    assert(application.appliedOn <= "2026-11-02", application.id);
    assert(application.email.endsWith("@example.com"), application.id);
    assert(
      application.college &&
        application.location &&
        application.phone &&
        application.bio &&
        application.resumeSummary,
      application.id,
    );
    assert(
      Array.isArray(application.skills) && application.skills.length,
      application.id,
    );
    assert(
      Array.isArray(application.notes) && Array.isArray(application.projectIds),
      application.id,
    );
    assert(application.history.length > 0, application.id);
    application.history.forEach((event, index) => {
      assert(validDate(event.date), `${application.id} history`);
      assert(
        event.date >= application.appliedOn && event.date <= "2026-11-02",
        application.id,
      );
      if (index)
        assert(
          event.date >= application.history[index - 1].date,
          application.id,
        );
    });
  });
});
verify("Cumulative funnel agrees with records", () => {
  const counts = {
    applications: data.applications.length,
    shortlisted: data.applications.filter((application) =>
      ["Shortlisted", "Selected", "Joined"].includes(application.status),
    ).length,
    selected: data.applications.filter((application) =>
      ["Selected", "Joined"].includes(application.status),
    ).length,
    joined: data.applications.filter(
      (application) => application.status === "Joined",
    ).length,
  };
  assert.deepEqual(counts, {
    applications: 2540,
    shortlisted: 1820,
    selected: 920,
    joined: 740,
  });
  data.metrics.forEach((metric) =>
    assert.equal(metric.value, counts[metric.id], metric.id),
  );
});
verify("Single program agrees with records", () => {
  assert.equal(
    data.programs.reduce((sum, program) => sum + program.share, 0),
    100,
  );
  data.programs.forEach((program) =>
    assert.equal(
      program.share,
      Math.round((programs[program.id] / data.applications.length) * 100),
      program.id,
    ),
  );
});
verify("Intern records require joined applications", () => {
  assert.equal(data.interns.length, 740);
  assert.equal(internByApplication.size, 740);
  for (const [status, total] of Object.entries({
    Active: 520,
    Completed: 180,
    Dropped: 40,
  }))
    assert.equal(
      data.interns.filter((intern) => intern.status === status).length,
      total,
      status,
    );
  data.interns.forEach((intern) => {
    const application = applications.get(intern.applicationId);
    assert(application, intern.id);
    assert.equal(application.status, "Joined", intern.id);
    assert(
      validDate(intern.joinedOn) && intern.joinedOn >= application.appliedOn,
      intern.id,
    );
    assert(intern.batch && Array.isArray(intern.projectIds), intern.id);
  });
  data.applications
    .filter((application) => application.status === "Joined")
    .forEach((application) =>
      assert(internByApplication.has(application.id), application.id),
    );
});
verify("Project memberships resolve in both directions", () => {
  assert.equal(data.projects.length, 3);
  data.projects.forEach((project) => {
    assert(project.progress >= 0 && project.progress <= 100, project.id);
    assert.equal(new Set(project.team).size, project.team.length, project.id);
    project.team.forEach((applicationId) => {
      const application = applications.get(applicationId);
      const intern = internByApplication.get(applicationId);
      assert(application && intern, `${project.id}: ${applicationId}`);
      assert.equal(intern.status, "Active", intern.id);
      assert(application.projectIds.includes(project.id), application.id);
      assert(intern.projectIds.includes(project.id), intern.id);
    });
  });
  [...data.applications, ...data.interns].forEach((record) =>
    record.projectIds.forEach((projectId) => {
      const project = projects.get(projectId);
      assert(project, projectId);
      assert(
        project.team.includes(record.applicationId || record.id),
        record.id,
      );
    }),
  );
});
verify("Contributions belong to assigned project members", () => {
  (data.contributions || []).forEach((contribution) => {
    const project = projects.get(contribution.projectId);
    assert(project, contribution.id);
    assert(project.team.includes(contribution.applicationId), contribution.id);
    assert(applications.has(contribution.applicationId), contribution.id);
    assert(
      contribution.description &&
        !Number.isNaN(Date.parse(contribution.occurredOn)),
      contribution.id,
    );
  });
});
verify("Issued certificates are unique and eligible", () => {
  assert.equal(data.certificates.length, 180);
  assert.equal(
    new Set(data.certificates.map((certificate) => certificate.internId)).size,
    180,
  );
  assert.equal(
    new Set(
      data.certificates.map((certificate) => certificate.certificateNumber),
    ).size,
    180,
  );
  data.certificates.forEach((certificate) => {
    const intern = interns.get(certificate.internId);
    const application = applications.get(certificate.applicationId);
    assert(intern && application, certificate.id);
    assert.equal(intern.status, "Completed", certificate.id);
    assert.equal(
      intern.applicationId,
      certificate.applicationId,
      certificate.id,
    );
    assert.equal(certificate.recipient, application.name, certificate.id);
    assert.equal(certificate.programId, application.programId, certificate.id);
    assert.equal(certificate.program, application.program, certificate.id);
    assert.equal(certificate.status, "Issued", certificate.id);
    assert(
      validDate(certificate.issuedOn) &&
        certificate.issuedOn >= intern.joinedOn,
      certificate.id,
    );
  });
});
verify("Monthly analytics match application dates", () => {
  data.analytics.months.forEach((month) => {
    const records = data.applications.filter((application) => application.appliedOn.slice(5, 7) === monthNumbers[month.label]);
    assert.equal(month.applications, expectedMonths[month.label], month.label);
    assert.equal(month.applications, records.length, month.label);
  });
  assert.equal(data.analytics.months.reduce((sum, month) => sum + month.applications, 0), 2540);
});
verify("Skills and source analytics match applications", () => {
  data.analytics.skills.forEach((skill) =>
    assert.equal(
      skill.count,
      data.applications.filter((application) =>
        application.skills.includes(skill.name),
      ).length,
      skill.name,
    ),
  );
  data.analytics.source.forEach((source) =>
    assert.equal(
      source.count,
      data.applications.filter(
        (application) => application.source === source.name,
      ).length,
      source.name,
    ),
  );
  assert.equal(
    data.analytics.source.reduce((sum, source) => sum + source.count, 0),
    2540,
  );
});
verify("Dashboard route wrappers resolve local component imports", () => {
  for (const route of [
    "",
    "applications",
    "applications/[applicationId]",
    "analytics",
    "interns",
    "projects",
    "certificates",
    "settings",
  ]) {
    const filename = path.join(
      root,
      "src/app/intern/dashboard",
      route,
      "page.jsx",
    );
    assert(fs.existsSync(filename), filename);
    const source = fs.readFileSync(filename, "utf8");
    for (const match of source.matchAll(
      /from\s+["'](@\/components\/[^"']+)["']/g,
    )) {
      const importedPath = path.join(root, "src", match[1].slice(2));
      assert(
        [importedPath, `${importedPath}.jsx`, `${importedPath}.js`].some(
          (candidate) => fs.existsSync(candidate),
        ),
        match[1],
      );
    }
  }
});
console.log(
  `Passed ${checks} internship dashboard fixture checks: 2,540 applications, 740 interns, 3 linked projects, 180 eligible certificates, analytics, and 8 routes.`,
);
