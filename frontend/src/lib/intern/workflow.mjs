export const STORE_KEY = "olentra_intern_workflow_v2";
export const LEGACY_KEY = "olentra_intern_admin_v1";
export const SESSION_KEY = "olentra_intern_session_v2";
export const PENDING_KEY = "olentra_intern_pending_v2";
export const SESSION_DURATION = 8 * 60 * 60 * 1000;

export function emptyStore(epoch = "initial-v2") {
  return {
    version: 2,
    revision: 0,
    epoch,
    applications: {},
    createdApplications: [],
    interns: {},
    projects: {},
    createdProjects: [],
    certificates: [],
    settings: {},
    activity: [],
    readActivity: [],
    accounts: {},
    createdAccounts: [],
    offers: {},
    onboarding: {},
    createdTasks: [],
    tasks: {},
    submissions: [],
    messages: [],
    notifications: [],
    readNotifications: {},
    resetRequests: [],
  };
}

export function normalizeStore(value) {
  const store = emptyStore(value?.epoch || "initial-v2");
  if (value?.version !== 2) return store;
  for (const key of Object.keys(store)) {
    if (Array.isArray(store[key]) && Array.isArray(value[key]))
      store[key] = value[key];
    else if (
      !Array.isArray(store[key]) &&
      store[key] &&
      typeof store[key] === "object" &&
      value[key] &&
      typeof value[key] === "object" &&
      !Array.isArray(value[key])
    )
      store[key] = value[key];
  }
  store.revision = Number.isSafeInteger(value.revision) ? value.revision : 0;
  return store;
}

export function migrateLegacy(legacy) {
  const state = emptyStore("migrated-v2");
  if (legacy?.version !== 1) return state;
  for (const key of ["applications", "interns", "projects", "settings"])
    if (
      legacy[key] &&
      typeof legacy[key] === "object" &&
      !Array.isArray(legacy[key])
    )
      state[key] = legacy[key];
  for (const key of [
    "createdProjects",
    "certificates",
    "activity",
    "readActivity",
  ])
    if (Array.isArray(legacy[key])) state[key] = legacy[key];
  if (state.settings.profile)
    state.accounts["company-admin"] = { ...state.settings.profile };
  return state;
}

const patchRows = (rows, changes) =>
  rows.map((row) => ({ ...row, ...changes[row.id] }));
const publicApplication = (application) => {
  if (!application) return null;
  const { notes, claimToken, internalNotes, ...safe } = application;
  return safe;
};

export function materialize(base, fixtures, state) {
  const applications = patchRows(
    [...base.applications, ...state.createdApplications],
    state.applications,
  );
  const projects = patchRows(
    [...base.projects, ...state.createdProjects],
    state.projects,
  );
  const projectIdsFor = (id) =>
    projects
      .filter((project) => project.team?.includes(id))
      .map((project) => project.id);
  const linkedApplications = applications.map((application) => ({
    ...application,
    projectIds: projectIdsFor(application.id),
  }));
  const interns = patchRows(base.interns || [], state.interns).map(
    (intern) => ({
      ...intern,
      projectIds: projectIdsFor(intern.applicationId),
    }),
  );
  const existing = new Set(interns.map((intern) => intern.applicationId));
  for (const application of applications)
    if (application.status === "Joined" && !existing.has(application.id)) {
      const id = `INT-${application.id}`;
      interns.push({
        id,
        applicationId: application.id,
        batch: state.settings.defaultBatch || base.settings.defaultBatch,
        joinedOn: application.history?.at(-1)?.date || application.appliedOn,
        status: "Active",
        ...state.interns[id],
        projectIds: projectIdsFor(application.id),
      });
    }
  const accounts = patchRows(
    [...(fixtures.demoAccounts || []), ...state.createdAccounts],
    state.accounts,
  );
  const counts = {
    applications: applications.length,
    shortlisted: applications.filter((a) =>
      ["Shortlisted", "Selected", "Joined"].includes(a.status),
    ).length,
    selected: applications.filter((a) =>
      ["Selected", "Joined"].includes(a.status),
    ).length,
    joined: applications.filter((a) => a.status === "Joined").length,
  };
  const programs = base.programs.map((program) => ({
    ...program,
    share: Math.round(
      (applications.filter((a) => a.programId === program.id).length /
        Math.max(1, applications.length)) *
        100,
    ),
  }));
  if (programs.length === 2) programs[1].share = 100 - programs[0].share;
  const offers = (fixtures.offers || []).map((offer) => ({
    ...offer,
    ...state.offers[offer.applicationId],
  }));
  for (const [applicationId, offer] of Object.entries(state.offers))
    if (!offers.some((item) => item.applicationId === applicationId))
      offers.push({ applicationId, ...offer });
  const onboarding = (fixtures.onboarding || []).map((item) => ({
    ...item,
    ...state.onboarding[item.applicationId],
  }));
  for (const [applicationId, value] of Object.entries(state.onboarding))
    if (!onboarding.some((item) => item.applicationId === applicationId))
      onboarding.push({ applicationId, ...value });
  for (const application of applications.filter((a) => a.status === "Joined"))
    if (!onboarding.some((item) => item.applicationId === application.id))
      onboarding.push({
        applicationId: application.id,
        status: "Approved",
        acknowledged: true,
        phone: application.phone,
        college: application.college,
        location: application.location,
        skills: application.skills,
        resumeAttachmentId: application.resumeAttachmentId || null,
      });
  const submissions = [
    ...new Map(
      [...(fixtures.submissions || []), ...state.submissions].map(
        (submission) => [submission.id, submission],
      ),
    ).values(),
  ];
  const tasks = patchRows(
    [...(fixtures.tasks || []), ...state.createdTasks],
    state.tasks,
  ).map((task) => {
    const latest = submissions
      .filter((submission) => submission.taskId === task.id)
      .sort((a, b) => b.version - a.version)[0];
    return {
      ...task,
      status: latest
        ? {
            Submitted: "Under review",
            "Changes requested": "Changes requested",
            Approved: "Approved",
          }[latest.status] || task.status
        : task.status,
    };
  });
  const settings = {
    ...base.settings,
    ...state.settings,
    integrations: {
      ...base.settings.integrations,
      ...state.settings.integrations,
    },
  };
  const company = accounts.find((account) => account.role === "company");
  return {
    ...base,
    applications: linkedApplications,
    projects,
    interns,
    accounts,
    offers,
    onboarding,
    tasks,
    submissions,
    messages: [...(fixtures.messages || []), ...state.messages],
    notifications: [...(fixtures.notifications || []), ...state.notifications],
    resources: fixtures.resources || [],
    certificates: [...base.certificates, ...state.certificates],
    settings,
    programs,
    user: {
      ...base.user,
      ...state.settings.profile,
      ...(company
        ? {
            name: company.name,
            email: company.email,
            firstName: company.name.split(" ")[0],
            initials: company.name
              .split(" ")
              .slice(0, 2)
              .map((part) => part[0])
              .join(""),
          }
        : {}),
    },
    metrics: base.metrics.map((metric) => ({
      ...metric,
      value: counts[metric.id] ?? metric.value,
    })),
    activity: [...state.activity, ...base.activity].map((activity) => ({
      ...activity,
      unread: activity.unread && !state.readActivity.includes(activity.id),
    })),
  };
}

export function validSession(session, data, state, now = Date.now()) {
  const account = data.accounts.find((item) => item.id === session?.accountId);
  return account &&
    session.epoch === state.epoch &&
    session.accountVersion === (account.sessionVersion || 1) &&
    Number(session.expiresAt) > now
    ? account
    : null;
}

export function scopedRecords(data, state, account) {
  const application = data.applications.find(
    (item) => item.id === account?.applicationId,
  );
  const ownTaskProjectIds = new Set(
    data.tasks
      .filter((task) => task.applicationId === account?.applicationId)
      .map((task) => task.projectId),
  );
  const notifications = data.notifications
    .filter((notification) => {
      if (notification.recipientRole !== account?.role) return false;
      if (account.role === "company") return true;
      if (notification.applicationId)
        return notification.applicationId === account.applicationId;
      return (
        application?.status === "Joined" &&
        (notification.audience === "all-interns" ||
          notification.audience === application?.programId)
      );
    })
    .map((notification) => ({
      ...notification,
      unread: !(state.readNotifications[account?.id] || []).includes(
        notification.id,
      ),
    }));
  return {
    application: publicApplication(application),
    intern:
      data.interns.find(
        (item) => item.applicationId === account?.applicationId,
      ) || null,
    offer:
      data.offers.find(
        (item) => item.applicationId === account?.applicationId,
      ) || null,
    onboarding: data.onboarding.find(
      (item) => item.applicationId === account?.applicationId,
    ) || {
      applicationId: account?.applicationId,
      status: "Not started",
      acknowledged: false,
    },
    projects: data.projects
      .filter(
        (project) =>
          project.team?.includes(account?.applicationId) ||
          ownTaskProjectIds.has(project.id),
      )
      .map((project) => ({
        ...project,
        memberCount: project.team.length,
        team: [account.applicationId],
      })),
    tasks: data.tasks.filter(
      (task) => task.applicationId === account?.applicationId,
    ),
    submissions: data.submissions.filter(
      (submission) => submission.applicationId === account?.applicationId,
    ),
    certificates: data.certificates.filter(
      (certificate) => certificate.applicationId === account?.applicationId,
    ),
    messages: data.messages.filter(
      (message) => message.applicationId === account?.applicationId,
    ),
    notifications,
    resources: data.resources,
  };
}

export function reduceAction(base, fixtures, original, actorId, action) {
  const state = structuredClone(original);
  const data = materialize(base, fixtures, state);
  const actor = data.accounts.find((account) => account.id === actorId);
  const p = action.payload || {};
  const now = action.now || new Date().toISOString();
  const day = now.slice(0, 10);
  let counter = 0;
  const id = (prefix) => `${prefix}-${action.id}-${++counter}`;
  const findApplication = (applicationId) =>
    data.applications.find((application) => application.id === applicationId);
  const findIntern = (applicationId) =>
    data.interns.find((intern) => intern.applicationId === applicationId);
  const company = () => {
    if (actor?.role !== "company")
      throw new Error("Sign in as Company Admin to make this change.");
  };
  const owner = (applicationId) => {
    if (actor?.role !== "intern" || actor.applicationId !== applicationId)
      throw new Error("This record belongs to another account.");
  };
  const activeIntern = (applicationId) => {
    owner(applicationId);
    if (
      findApplication(applicationId)?.status !== "Joined" ||
      findIntern(applicationId)?.status !== "Active"
    )
      throw new Error("Work submissions are available to active interns only.");
  };
  const updateApplication = (applicationId, patch) => {
    state.applications[applicationId] = {
      ...state.applications[applicationId],
      ...patch,
    };
  };
  const activity = (
    title,
    detail,
    applicationId,
    icon = "application",
    tone = "blue",
  ) =>
    state.activity.unshift({
      id: id("ACT"),
      title,
      detail,
      applicationId,
      icon,
      tone,
      occurredOn: now,
      time: "Just now",
      unread: true,
    });
  const notification = (
    recipientRole,
    applicationId,
    title,
    body,
    href,
    extra = {},
  ) =>
    state.notifications.push({
      id: id("NTF"),
      recipientRole,
      applicationId,
      title,
      body,
      href,
      createdOn: now,
      ...extra,
    });
  const internNotice = (applicationId, title, body, path = "/application") =>
    notification("intern", applicationId, title, body, `/intern/portal${path}`);
  const companyNotice = (applicationId, title, body) =>
    notification(
      "company",
      applicationId,
      title,
      body,
      applicationId
        ? `/intern/dashboard/applications/${applicationId}`
        : "/intern/dashboard",
    );
  const history = (application, title, detail) => [
    ...(application.history || []),
    { id: id("HST"), title, detail, date: now },
  ];
  let result;
  try {
    switch (action.type) {
      case "SUBMIT_APPLICATION": {
        if (actor)
          throw new Error("Sign out before submitting a new application.");
        const name = String(p.name || "").trim();
        const email = String(p.email || "")
          .trim()
          .toLowerCase();
        if (
          name.length < 2 ||
          name.length > 120 ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        )
          throw new Error("Enter your full name and a valid email address.");
        if (
          data.applications.some(
            (application) => application.email.toLowerCase() === email,
          )
        )
          throw new Error(
            "An application already exists for this email. Sign in to view it.",
          );
        const program = data.programs.find((item) => item.id === p.programId);
        if (
          !program ||
          !data.settings.programEnabled ||
          !data.settings[`${program.id}Enabled`]
        )
          throw new Error(
            "This internship track is not accepting applications right now.",
          );
        if (!p.resumeAttachmentId)
          throw new Error("Attach a resume before applying.");
        const application = {
          id: id("OL-DEMO"),
          name,
          email,
          programId: program.id,
          program: program.name,
          appliedOn: day,
          status: "Applied",
          initials: name
            .split(" ")
            .slice(0, 2)
            .map((part) => part[0])
            .join(""),
          avatarColor: "#d9e5fb",
          college: "",
          phone: "",
          location: "",
          skills: [],
          linkedin: String(p.linkedin || ""),
          github: "",
          bio: "",
          resumeSummary: "A new Olentra internship applicant.",
          resumeAttachmentId: p.resumeAttachmentId,
          history: [
            {
              id: id("HST"),
              title: "Application received",
              date: now,
              detail: `Applied to ${program.name}.`,
            },
          ],
          notes: [],
          projectIds: [],
          source: "Website",
          claimToken: id("CLAIM"),
        };
        state.createdApplications.push(application);
        companyNotice(
          application.id,
          "New application received",
          `${name} applied to ${program.name}.`,
        );
        activity(
          "New application received",
          `${name} · ${program.name}`,
          application.id,
        );
        result = application;
        break;
      }
      case "REGISTER": {
        const application = findApplication(p.applicationId);
        if (
          !application ||
          !application.claimToken ||
          application.claimToken !== p.claimToken
        )
          throw new Error(
            "Submit an application in this tab before creating an account.",
          );
        if (
          data.accounts.some(
            (account) =>
              account.email.toLowerCase() === application.email.toLowerCase(),
          )
        )
          throw new Error("An account already exists. Sign in instead.");
        if (!/^[a-f0-9]{64}$/.test(p.passwordHash || ""))
          throw new Error("Choose a valid demo password.");
        const account = {
          id: id("ACC"),
          role: "intern",
          name: application.name,
          email: application.email,
          applicationId: application.id,
          passwordHash: p.passwordHash,
          sessionVersion: 1,
          createdOn: now,
        };
        state.createdAccounts.push(account);
        result = account;
        internNotice(
          application.id,
          "Welcome to Olentra",
          "Your application is saved. Follow your progress here.",
        );
        break;
      }
      case "REQUEST_RESET": {
        const account = data.accounts.find(
          (item) =>
            item.email.toLowerCase() === String(p.email).trim().toLowerCase() &&
            item.role === p.role,
        );
        if (!account)
          throw new Error("No demo account matches that email and login type.");
        const request = {
          id: id("RST"),
          accountId: account.id,
          email: account.email,
          code: "246810",
          expiresAt: new Date(now).getTime() + 15 * 60 * 1000,
          used: false,
        };
        state.resetRequests = [
          ...state.resetRequests.filter(
            (item) => item.accountId !== account.id,
          ),
          request,
        ];
        result = {
          resetId: request.id,
          code: request.code,
          email: request.email,
        };
        break;
      }
      case "RESET_PASSWORD": {
        const request = state.resetRequests.find(
          (item) => item.id === p.resetId,
        );
        if (
          !request ||
          request.used ||
          request.code !== p.code ||
          request.expiresAt <= new Date(now).getTime()
        )
          throw new Error("That demo verification code is invalid or expired.");
        if (!/^[a-f0-9]{64}$/.test(p.passwordHash || ""))
          throw new Error("Choose a valid demo password.");
        const account = data.accounts.find(
          (item) => item.id === request.accountId,
        );
        state.accounts[account.id] = {
          ...state.accounts[account.id],
          passwordHash: p.passwordHash,
          sessionVersion: (account.sessionVersion || 1) + 1,
        };
        request.used = true;
        result = true;
        break;
      }
      case "UPDATE_APPLICATION": {
        company();
        const application = findApplication(p.id);
        if (!application) throw new Error("Application not found.");
        const patch = { ...p.patch };
        if (
          patch.status &&
          ![
            "Applied",
            "Under Review",
            "Shortlisted",
            "Selected",
            "Rejected",
            "Declined",
            "Joined",
          ].includes(patch.status)
        )
          throw new Error("Choose a valid application status.");
        if (patch.status === "Joined" && application.status !== "Joined")
          throw new Error(
            "Approve submitted onboarding to activate this intern.",
          );
        if (
          application.status === "Joined" &&
          patch.status &&
          patch.status !== "Joined"
        )
          throw new Error("Manage enrolled interns from the Interns page.");
        if (patch.status && patch.status !== application.status) {
          patch.history = history(
            application,
            patch.status,
            `Application moved to ${patch.status.toLowerCase()}.`,
          );
          internNotice(
            application.id,
            "Application status updated",
            `Your application is now ${patch.status.toLowerCase()}.`,
          );
          activity(
            "Application status updated",
            `${application.name} · ${patch.status}`,
            application.id,
          );
        }
        delete patch.id;
        delete patch.email;
        delete patch.claimToken;
        updateApplication(p.id, patch);
        result = true;
        break;
      }
      case "SEND_OFFER": {
        company();
        const application = findApplication(p.applicationId);
        if (!application || application.status !== "Selected")
          throw new Error("Select this applicant before sending an offer.");
        if (
          data.offers.some(
            (offer) =>
              offer.applicationId === application.id &&
              offer.status === "Accepted",
          )
        )
          throw new Error("This offer has already been accepted.");
        if (!p.startOn || !p.endOn || p.endOn < p.startOn)
          throw new Error("Choose a valid internship start and end date.");
        const stipend =
          application.programId === "explorer" ? 0 : Number(p.stipend);
        if (
          !Number.isInteger(stipend) ||
          stipend < 0 ||
          stipend > Number(data.settings.maxStipend)
        )
          throw new Error("The stipend must be within the program limit.");
        const offer = {
          id: id("OFFER"),
          applicationId: application.id,
          status: "Sent",
          startOn: p.startOn,
          endOn: p.endOn,
          stipend,
          message: String(p.message || "Welcome to Olentra!").trim(),
          sentOn: now,
        };
        state.offers[application.id] = offer;
        internNotice(
          application.id,
          "Your internship offer is ready",
          "Review your offer and let us know your decision.",
        );
        activity("Internship offer sent", application.name, application.id);
        result = offer;
        break;
      }
      case "ACCEPT_OFFER":
      case "DECLINE_OFFER": {
        owner(p.applicationId);
        const application = findApplication(p.applicationId);
        const offer = data.offers.find(
          (item) => item.applicationId === p.applicationId,
        );
        if (
          !offer ||
          offer.status !== "Sent" ||
          application?.status !== "Selected"
        )
          throw new Error("This offer is no longer awaiting a decision.");
        const accepted = action.type === "ACCEPT_OFFER";
        state.offers[p.applicationId] = {
          ...offer,
          status: accepted ? "Accepted" : "Declined",
          decidedOn: now,
          reason: String(p.reason || ""),
        };
        updateApplication(application.id, {
          ...(accepted ? {} : { status: "Declined" }),
          history: history(
            application,
            accepted ? "Offer accepted" : "Offer declined",
            accepted
              ? "Onboarding is now available."
              : String(p.reason || "The offer was declined."),
          ),
        });
        if (accepted)
          state.onboarding[application.id] = {
            applicationId: application.id,
            status: "Draft",
            acknowledged: false,
          };
        companyNotice(
          application.id,
          accepted ? "Offer accepted" : "Offer declined",
          application.name,
        );
        activity(
          accepted ? "Offer accepted" : "Offer declined",
          application.name,
          application.id,
        );
        result = true;
        break;
      }
      case "SAVE_ONBOARDING":
      case "SUBMIT_ONBOARDING": {
        owner(p.applicationId);
        const application = findApplication(p.applicationId);
        const offer = data.offers.find(
          (item) => item.applicationId === application?.id,
        );
        const existing = data.onboarding.find(
          (item) => item.applicationId === application?.id,
        );
        if (
          offer?.status !== "Accepted" ||
          application?.status === "Joined" ||
          existing?.status === "Approved"
        )
          throw new Error("Accept your offer before completing onboarding.");
        if (existing?.status === "Submitted")
          throw new Error("Your onboarding is already waiting for approval.");
        const details = {
          ...existing,
          ...(action.type === "SAVE_ONBOARDING" ? p.details : {}),
          applicationId: application.id,
          status: "Draft",
        };
        const profile = {
          phone: details.phone || application.phone,
          college: details.college || application.college,
          location: details.location || application.location,
          skills: details.skills || application.skills,
          resumeAttachmentId:
            details.resumeAttachmentId || application.resumeAttachmentId,
        };
        if (action.type === "SUBMIT_ONBOARDING") {
          if (
            !profile.phone?.trim() ||
            !profile.college?.trim() ||
            !profile.location?.trim() ||
            !profile.resumeAttachmentId ||
            !details.acknowledged
          )
            throw new Error(
              "Complete your profile, resume, and program acknowledgment before submitting.",
            );
          details.status = "Submitted";
          details.submittedOn = now;
          companyNotice(
            application.id,
            "Onboarding ready for approval",
            `${application.name} completed the onboarding checklist.`,
          );
          updateApplication(application.id, {
            ...profile,
            history: history(
              application,
              "Onboarding submitted",
              "The company team will review your onboarding details.",
            ),
          });
        } else updateApplication(application.id, profile);
        state.onboarding[application.id] = { ...details, ...profile };
        result = true;
        break;
      }
      case "APPROVE_ONBOARDING": {
        company();
        const application = findApplication(p.applicationId);
        const onboarding = data.onboarding.find(
          (item) => item.applicationId === p.applicationId,
        );
        if (
          onboarding?.status === "Approved" &&
          application?.status === "Joined"
        ) {
          result = findIntern(application.id);
          break;
        }
        if (!application || onboarding?.status !== "Submitted")
          throw new Error(
            "This applicant must submit onboarding before you can approve it.",
          );
        if (
          application.status !== "Selected" ||
          !data.offers.some(
            (offer) =>
              offer.applicationId === application.id &&
              offer.status === "Accepted",
          )
        )
          throw new Error(
            "Only selected applicants with an accepted offer can be onboarded.",
          );
        state.onboarding[application.id] = {
          ...onboarding,
          status: "Approved",
          approvedOn: now,
        };
        updateApplication(application.id, {
          status: "Joined",
          history: history(
            application,
            "Intern onboarded",
            "Onboarding approved. Your internship workspace is ready.",
          ),
        });
        const intern = {
          id: `INT-${application.id}`,
          applicationId: application.id,
          batch: data.settings.defaultBatch,
          joinedOn: day,
          status: "Active",
          projectIds: [],
        };
        state.interns[intern.id] = intern;
        internNotice(
          application.id,
          "Welcome to your internship",
          "Your onboarding is approved. Your workspace is ready.",
          "",
        );
        activity(
          "Intern onboarded",
          application.name,
          application.id,
          "users",
          "green",
        );
        result = intern;
        break;
      }
      case "UPDATE_PROFILE": {
        owner(actor?.applicationId);
        const application = findApplication(actor.applicationId);
        const fields = [
          "name",
          "phone",
          "college",
          "location",
          "skills",
          "github",
          "linkedin",
          "bio",
          "resumeAttachmentId",
        ];
        const patch = Object.fromEntries(
          fields
            .filter((key) => p[key] !== undefined)
            .map((key) => [key, p[key]]),
        );
        if (patch.name !== undefined && String(patch.name).trim().length < 2)
          throw new Error("Enter your full name.");
        for (const key of ["github", "linkedin"])
          if (patch[key]) {
            const url = new URL(patch[key]);
            if (!["http:", "https:"].includes(url.protocol))
              throw new Error("Use an http or https profile link.");
          }
        updateApplication(application.id, patch);
        if (patch.name)
          state.accounts[actor.id] = {
            ...state.accounts[actor.id],
            name: String(patch.name).trim(),
          };
        result = true;
        break;
      }
      case "CREATE_PROJECT": {
        company();
        const input = p.project;
        if (!input?.name?.trim() || !input.description?.trim())
          throw new Error("Enter a project name and description.");
        const team = [...new Set(input.team || [])];
        if (
          team.some(
            (applicationId) => findIntern(applicationId)?.status !== "Active",
          )
        )
          throw new Error("Assign active interns to project teams.");
        const project = {
          id: id("PRJ"),
          createdOn: day,
          dueOn: input.dueOn || day,
          art: "planet",
          progress: 0,
          status: "In progress",
          program: "Tech Innovator",
          ...input,
          team,
        };
        state.createdProjects.push(project);
        team.forEach((applicationId) =>
          internNotice(
            applicationId,
            "You joined a project",
            project.name,
            `/projects/${project.id}`,
          ),
        );
        activity("Project created", project.name, null, "briefcase", "purple");
        result = project;
        break;
      }
      case "UPDATE_PROJECT": {
        company();
        const project = data.projects.find((item) => item.id === p.id);
        if (!project) throw new Error("Project not found.");
        const patch = { ...p.patch };
        delete patch.id;
        if (
          patch.progress !== undefined &&
          (!Number.isFinite(Number(patch.progress)) ||
            Number(patch.progress) < 0 ||
            Number(patch.progress) > 100)
        )
          throw new Error("Progress must be between 0 and 100.");
        if (patch.team) {
          patch.team = [...new Set(patch.team)];
          if (
            patch.team.some(
              (applicationId) =>
                !project.team.includes(applicationId) &&
                findIntern(applicationId)?.status !== "Active",
            )
          )
            throw new Error("New team members must be active interns.");
          for (const applicationId of project.team.filter(
            (member) => !patch.team.includes(member),
          ))
            if (
              data.tasks.some(
                (task) =>
                  task.projectId === project.id &&
                  task.applicationId === applicationId &&
                  task.status !== "Approved",
              )
            )
              throw new Error(
                "Finish this intern's assigned tasks before removing them from the project.",
              );
          patch.team
            .filter((member) => !project.team.includes(member))
            .forEach((applicationId) =>
              internNotice(
                applicationId,
                "You joined a project",
                project.name,
                `/projects/${project.id}`,
              ),
            );
        }
        state.projects[p.id] = { ...state.projects[p.id], ...patch };
        activity("Project updated", project.name, null, "briefcase", "purple");
        result = true;
        break;
      }
      case "CREATE_TASK": {
        company();
        const project = data.projects.find((item) => item.id === p.projectId);
        if (
          !project?.team?.includes(p.applicationId) ||
          findIntern(p.applicationId)?.status !== "Active"
        )
          throw new Error("Choose an active intern on this project team.");
        if (!p.title?.trim() || !p.description?.trim() || !p.dueOn)
          throw new Error("Enter the task title, description, and due date.");
        const task = {
          id: id("TASK"),
          projectId: p.projectId,
          applicationId: p.applicationId,
          title: p.title.trim(),
          description: p.description.trim(),
          dueOn: p.dueOn,
          required: Boolean(p.required),
          status: "Todo",
          createdOn: now,
        };
        state.createdTasks.push(task);
        internNotice(
          p.applicationId,
          "A new task is ready",
          task.title,
          `/projects/${p.projectId}`,
        );
        activity(
          "Task assigned",
          task.title,
          p.applicationId,
          "briefcase",
          "purple",
        );
        result = task;
        break;
      }
      case "UPDATE_TASK": {
        company();
        const task = data.tasks.find((item) => item.id === p.id);
        if (!task) throw new Error("Task not found.");
        if (findIntern(task.applicationId)?.status === "Completed")
          throw new Error("Tasks are read-only after internship completion.");
        if (
          p.patch.applicationId &&
          p.patch.applicationId !== task.applicationId
        )
          throw new Error("Create a new task to change its assignee.");
        const patch = Object.fromEntries(
          ["title", "description", "dueOn", "required"]
            .filter((key) => p.patch[key] !== undefined)
            .map((key) => [key, p.patch[key]]),
        );
        for (const key of ["title", "description", "dueOn"])
          if (patch[key] !== undefined && !String(patch[key]).trim())
            throw new Error("Task details cannot be empty.");
        state.tasks[task.id] = { ...state.tasks[task.id], ...patch };
        result = true;
        break;
      }
      case "START_TASK":
      case "SUBMIT_WORK": {
        const task = data.tasks.find((item) => item.id === p.taskId);
        if (!task) throw new Error("Task not found.");
        activeIntern(task.applicationId);
        if (
          !data.projects
            .find((item) => item.id === task.projectId)
            ?.team?.includes(actor.applicationId)
        )
          throw new Error("You are no longer assigned to this project.");
        if (["Under review", "Approved"].includes(task.status))
          throw new Error("This task is already submitted or approved.");
        if (action.type === "START_TASK") {
          state.tasks[task.id] = {
            ...state.tasks[task.id],
            status: "In progress",
          };
          result = true;
          break;
        }
        const notes = String(p.notes || "").trim();
        const workUrl = String(p.url || "").trim();
        const attachmentId =
          typeof p.attachmentId === "string"
            ? p.attachmentId.trim() || null
            : null;
        if (!notes && !workUrl && !attachmentId)
          throw new Error(
            "Add submission notes, a work link, or an attachment.",
          );
        if (workUrl) {
          const url = new URL(workUrl);
          if (!["http:", "https:"].includes(url.protocol))
            throw new Error("Use an http or https work link.");
        }
        const submission = {
          id: id("SUB"),
          taskId: task.id,
          applicationId: actor.applicationId,
          version:
            data.submissions.filter((item) => item.taskId === task.id).length +
            1,
          notes,
          url: workUrl,
          attachmentId,
          submittedOn: now,
          status: "Submitted",
          feedback: "",
          reviewedOn: null,
        };
        state.submissions.push(submission);
        companyNotice(
          actor.applicationId,
          "Work ready to review",
          `${actor.name} submitted ${task.title}.`,
        );
        activity(
          "Work submitted",
          `${actor.name} · ${task.title}`,
          actor.applicationId,
          "briefcase",
          "purple",
        );
        result = submission;
        break;
      }
      case "REVIEW_SUBMISSION": {
        company();
        const submission = data.submissions.find((item) => item.id === p.id);
        if (!submission || submission.status !== "Submitted")
          throw new Error("This submission has already been reviewed.");
        if (
          data.submissions.some(
            (item) =>
              item.taskId === submission.taskId &&
              item.version > submission.version,
          )
        )
          throw new Error("Review the latest submission version.");
        if (!["Approved", "Changes requested"].includes(p.decision))
          throw new Error("Choose a review decision.");
        if (p.decision === "Changes requested" && !p.feedback?.trim())
          throw new Error(
            "Explain the changes you would like the intern to make.",
          );
        const reviewed = {
          ...submission,
          status: p.decision,
          feedback: p.feedback?.trim() || "",
          reviewedOn: now,
          reviewerAccountId: actor.id,
        };
        const index = state.submissions.findIndex(
          (item) => item.id === submission.id,
        );
        if (index >= 0) state.submissions[index] = reviewed;
        else state.submissions.push(reviewed);
        internNotice(
          submission.applicationId,
          p.decision === "Approved"
            ? "Your work was approved"
            : "Feedback on your work",
          p.feedback?.trim() || "Your submission has been approved.",
          "/submissions",
        );
        activity(
          "Submission reviewed",
          `${p.decision} · version ${submission.version}`,
          submission.applicationId,
          "briefcase",
          "green",
        );
        result = reviewed;
        break;
      }
      case "UPDATE_INTERN": {
        company();
        const intern = data.interns.find((item) => item.id === p.id);
        if (!intern) throw new Error("Intern not found.");
        if (
          intern.status === "Completed" &&
          p.patch.status &&
          p.patch.status !== "Completed"
        )
          throw new Error(
            "A completed internship cannot be reactivated or dropped.",
          );
        if (
          p.patch.status &&
          !["Active", "Completed", "Dropped"].includes(p.patch.status)
        )
          throw new Error("Choose a valid intern status.");
        if (
          p.patch.status === "Completed" &&
          data.tasks.some(
            (task) =>
              task.applicationId === intern.applicationId &&
              task.required &&
              task.status !== "Approved",
          )
        )
          throw new Error(
            "Approve every required task before completing this internship.",
          );
        state.interns[p.id] = {
          ...state.interns[p.id],
          ...p.patch,
          ...(p.patch.status === "Completed" ? { completedOn: day } : {}),
        };
        internNotice(
          intern.applicationId,
          "Internship status updated",
          `Your internship is ${String(p.patch.status || intern.status).toLowerCase()}.`,
          "",
        );
        activity(
          "Intern record updated",
          `${findApplication(intern.applicationId)?.name} · ${p.patch.status || intern.status}`,
          intern.applicationId,
          "users",
          "green",
        );
        result = true;
        break;
      }
      case "GENERATE_CERTIFICATES": {
        company();
        const generated = [];
        for (const intern of data.interns.filter(
          (item) =>
            p.internIds.includes(item.id) && item.status === "Completed",
        )) {
          if (
            data.certificates.some(
              (certificate) => certificate.internId === intern.id,
            )
          )
            continue;
          if (
            data.tasks.some(
              (task) =>
                task.applicationId === intern.applicationId &&
                task.required &&
                task.status !== "Approved",
            )
          )
            continue;
          const applicant = findApplication(intern.applicationId);
          const certificate = {
            id: id("CERT"),
            certificateNumber: id("OLENTRA"),
            internId: intern.id,
            applicationId: applicant.id,
            recipient: applicant.name,
            program: applicant.program,
            programId: applicant.programId,
            issuedOn: day,
            status: "Issued",
          };
          generated.push(certificate);
          internNotice(
            applicant.id,
            "Your certificate is ready",
            "Congratulations on completing your Olentra internship.",
            "/certificates",
          );
        }
        state.certificates.push(...generated);
        if (generated.length)
          activity(
            "Certificates generated",
            `${generated.length} certificates issued.`,
            null,
            "certificate",
            "orange",
          );
        result = generated;
        break;
      }
      case "SEND_MESSAGE": {
        const application = findApplication(p.applicationId);
        if (!application) throw new Error("Application not found.");
        if (actor?.role !== "company") owner(application.id);
        if (
          !p.subject?.trim() ||
          !p.body?.trim() ||
          p.subject.length > 140 ||
          p.body.length > 3000
        )
          throw new Error(
            "Enter a subject and a message of up to 3,000 characters.",
          );
        const message = {
          id: id("MSG"),
          applicationId: application.id,
          senderAccountId: actor.id,
          senderRole: actor.role,
          subject: p.subject.trim(),
          body: p.body.trim(),
          createdOn: now,
        };
        state.messages.push(message);
        if (actor.role === "company")
          internNotice(
            application.id,
            "A message from Olentra",
            message.subject,
          );
        else
          companyNotice(
            application.id,
            "An intern replied",
            `${actor.name} · ${message.subject}`,
          );
        activity("Message sent", message.subject, application.id);
        result = message;
        break;
      }
      case "ANNOUNCEMENT": {
        company();
        if (!p.subject?.trim() || !p.message?.trim())
          throw new Error("Enter the notification subject and message.");
        notification(
          "intern",
          null,
          p.subject.trim(),
          p.message.trim(),
          "/intern/portal/application",
          { audience: p.audience || "all-interns" },
        );
        activity("Program announcement", p.subject.trim(), null, "send");
        result = true;
        break;
      }
      case "MARK_READ": {
        if (!actor) throw new Error("Sign in to manage notifications.");
        const allowed = new Set(
          scopedRecords(data, state, actor).notifications.map(
            (item) => item.id,
          ),
        );
        state.readNotifications[actor.id] = [
          ...new Set([
            ...(state.readNotifications[actor.id] || []),
            ...(p.ids || []).filter((item) => allowed.has(item)),
          ]),
        ];
        result = true;
        break;
      }
      case "LEGACY_READ":
        company();
        state.readActivity = [
          ...new Set([
            ...state.readActivity,
            ...data.activity.map((item) => item.id),
          ]),
        ];
        result = true;
        break;
      case "ADD_ACTIVITY":
        company();
        activity(p.title, p.detail, p.applicationId, p.icon, p.tone);
        result = true;
        break;
      case "UPDATE_SETTINGS": {
        company();
        const patch = p.patch;
        if (
          patch.maxStipend !== undefined &&
          (!Number.isInteger(Number(patch.maxStipend)) ||
            Number(patch.maxStipend) < 0 ||
            Number(patch.maxStipend) > 1000000)
        )
          throw new Error("Enter a valid whole stipend amount.");
        state.settings = {
          ...state.settings,
          ...patch,
          integrations: {
            ...state.settings.integrations,
            ...patch.integrations,
          },
        };
        if (patch.profile)
          state.accounts[actor.id] = {
            ...state.accounts[actor.id],
            name: patch.profile.name || actor.name,
            email: patch.profile.email || actor.email,
          };
        result = true;
        break;
      }
      case "RESET_DEMO":
        company();
        return {
          state: { ...emptyStore(action.id), revision: original.revision + 1 },
          result: { ok: true, data: true },
        };
      default:
        throw new Error("This demo action is not available.");
    }
    state.activity = state.activity.slice(0, 200);
    state.revision = original.revision + 1;
    return { state, result: { ok: true, data: result } };
  } catch (error) {
    return {
      state: original,
      result: {
        ok: false,
        error: error.message || "This change could not be saved.",
      },
    };
  }
}
