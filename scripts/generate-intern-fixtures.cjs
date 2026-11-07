#!/usr/bin/env node
/*
 * Generates Olentra's deterministic, fictional internship demo data.
 * All names, colleges, biographies, contact details, and records are fictional
 * seeds. No external personal data is fetched. Emails and profile links use
 * example.com; phone numbers deliberately use a non-routable dummy prefix.
 * Run: node scripts/generate-intern-fixtures.cjs
 * The existing JSON remains the source for the dashboard's visual settings,
 * chart curves, user, organization, navigation, programs, and headline metrics.
 */
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const fixturePath = path.join(__dirname, "../src/data/intern-dashboard.json");
const data = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const seedApplicants = [
  ["Arjun Sharma", "innovator", "2026-11-02", "Selected", "#d9e5fb"],
  ["Sneha Reddy", "explorer", "2026-11-02", "Shortlisted", "#e6ddff"],
  ["Rahul Verma", "innovator", "2026-11-01", "Applied", "#dcefe8"],
  ["Divya Patel", "explorer", "2026-11-01", "Selected", "#ffe5d9"],
  ["Karthik Rao", "innovator", "2026-10-31", "Applied", "#dce8ff"],
  ["Ananya Singh", "explorer", "2026-10-30", "Joined", "#f5dff3"],
  ["Vikram Nair", "innovator", "2026-10-29", "Shortlisted", "#dceef5"],
  ["Priya Mehta", "explorer", "2026-10-28", "Selected", "#fff0d4"],
  ["Aditya Kumar", "explorer", "2026-10-27", "Joined", "#e0e7fd"],
  ["Ishita Das", "innovator", "2026-10-26", "Shortlisted", "#f3def0"],
  ["Rohan Gupta", "explorer", "2026-10-25", "Joined", "#d8eee6"],
  ["Meera Iyer", "innovator", "2026-10-24", "Applied", "#ffe1dd"],
  ["Nikhil Joshi", "explorer", "2026-10-23", "Joined", "#dce7fa"],
  ["Kavya Menon", "innovator", "2026-10-22", "Selected", "#efe2ff"],
  ["Sai Teja", "explorer", "2026-10-21", "Joined", "#e5f0d9"],
  ["Neha Kapoor", "innovator", "2026-10-20", "Shortlisted", "#fbe7d7"],
];
const firstNames = [
  "Aarav",
  "Aanya",
  "Aditi",
  "Advait",
  "Akash",
  "Akshara",
  "Amrita",
  "Anika",
  "Anirudh",
  "Anjali",
  "Ankit",
  "Anushka",
  "Arnav",
  "Ashwin",
  "Avani",
  "Bhavana",
  "Chaitanya",
  "Charan",
  "Deepak",
  "Deeksha",
  "Dev",
  "Devika",
  "Dhruv",
  "Diya",
  "Esha",
  "Gautam",
  "Gauri",
  "Harini",
  "Harsh",
  "Himanshu",
  "Ira",
  "Ishaan",
  "Jai",
  "Janani",
  "Kabir",
  "Kanishka",
  "Keerthi",
  "Krish",
  "Lavanya",
  "Madhav",
  "Mahima",
  "Manav",
  "Maya",
  "Mihir",
  "Mira",
  "Mohit",
  "Nandini",
  "Naveen",
  "Navya",
  "Nikita",
  "Nisha",
  "Om",
  "Pallavi",
  "Pranav",
  "Prisha",
  "Rachana",
  "Raghav",
  "Reva",
  "Rishabh",
  "Ritika",
  "Riya",
  "Saanvi",
  "Sakshi",
  "Samarth",
  "Sanjana",
  "Sarthak",
  "Shreya",
  "Siddharth",
  "Simran",
  "Soham",
  "Srinidhi",
  "Tanvi",
  "Tarun",
  "Tejas",
  "Trisha",
  "Vaibhav",
  "Varsha",
  "Vedant",
  "Vidya",
  "Yash",
];
const surnames = [
  "Acharya",
  "Agarwal",
  "Arora",
  "Balan",
  "Bansal",
  "Basu",
  "Bhat",
  "Bhatia",
  "Chandra",
  "Chatterjee",
  "Chauhan",
  "Chopra",
  "Dandekar",
  "Desai",
  "Deshmukh",
  "Dewan",
  "Dutta",
  "Gandhi",
  "Ghosh",
  "Goel",
  "Gokhale",
  "Hegde",
  "Jain",
  "Jha",
  "Joshi",
  "Kapoor",
  "Khanna",
  "Kulkarni",
  "Malhotra",
  "Mehta",
  "Menon",
  "Mishra",
  "Mukherjee",
  "Nair",
  "Nanda",
  "Narayan",
  "Nayak",
  "Pandey",
  "Patel",
  "Patil",
  "Pillai",
  "Prasad",
  "Raghavan",
  "Rai",
  "Raman",
  "Rao",
  "Rathore",
  "Reddy",
  "Roy",
  "Saha",
  "Saxena",
  "Sen",
  "Sethi",
  "Shah",
  "Sharma",
  "Shetty",
  "Shukla",
  "Singh",
  "Sinha",
  "Srinivasan",
  "Tandon",
  "Trivedi",
  "Varma",
  "Verma",
];
const colleges = [
  "Asterfield Institute of Technology",
  "Cedarvale School of Engineering",
  "Riverwell Institute of Computing",
  "Maplebridge Technical University",
  "Northhaven College of Technology",
  "Willowcrest Institute of Engineering",
  "Pineford School of Computing",
  "Brightmere Technical Institute",
  "Stonebrook College of Engineering",
  "Silvermead Institute of Technology",
  "Oakridge School of Computing",
  "Lakehaven Engineering College",
];
const locations = [
  "Hyderabad, Telangana",
  "Bengaluru, Karnataka",
  "Chennai, Tamil Nadu",
  "Pune, Maharashtra",
  "Mumbai, Maharashtra",
  "Kochi, Kerala",
  "Ahmedabad, Gujarat",
  "Jaipur, Rajasthan",
  "New Delhi, Delhi",
  "Kolkata, West Bengal",
  "Visakhapatnam, Andhra Pradesh",
  "Coimbatore, Tamil Nadu",
];
const skillSets = [
  ["React", "JavaScript", "HTML & CSS", "Git"],
  ["Python", "Data Analysis", "SQL", "Git"],
  ["UI/UX Design", "Figma", "HTML & CSS", "JavaScript"],
  ["React", "Node.js", "JavaScript", "SQL"],
  ["Python", "Machine Learning", "Data Analysis", "SQL"],
  ["JavaScript", "Node.js", "Git", "HTML & CSS"],
  ["React", "UI/UX Design", "Figma", "JavaScript"],
  ["Python", "JavaScript", "Git", "Machine Learning"],
];
const colors = [
  "#d9e5fb",
  "#e6ddff",
  "#dcefe8",
  "#ffe5d9",
  "#dce8ff",
  "#f5dff3",
  "#dceef5",
  "#fff0d4",
  "#e0e7fd",
  "#f3def0",
  "#d8eee6",
  "#ffe1dd",
];
const stageTargets = {
  Applied: 200,
  "Under Review": 258,
  Shortlisted: 900,
  Selected: 180,
  Joined: 740,
  Rejected: 262,
};
const programTargets = { explorer: 1730, innovator: 810 };
const sourceTargets = {
  LinkedIn: 1040,
  Referral: 620,
  Website: 520,
  Campus: 360,
};
const monthTargets = {
  "06": 132,
  "07": 188,
  "08": 316,
  "09": 436,
  10: 1058,
  11: 410,
};
const formatId = (prefix, number) =>
  `${prefix}-2026-${String(number).padStart(4, "0")}`;
const toISO = (date) => date.toISOString().slice(0, 10);
const plusDays = (date, days) => {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return toISO(value) > "2026-11-02" ? "2026-11-02" : toISO(value);
};
let rng = 20261102;
function nextInt(max) {
  rng ^= rng << 13;
  rng ^= rng >>> 17;
  rng ^= rng << 5;
  return (rng >>> 0) % max;
}
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = nextInt(i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
function allocation(targets, existing, property) {
  const remaining = { ...targets };
  existing.forEach((item) => {
    remaining[property(item)]--;
  });
  const allocated = [];
  Object.entries(remaining).forEach(([key, count]) => {
    assert(count >= 0, `Seed records exceed ${key} target`);
    for (let i = 0; i < count; i++) allocated.push(key);
  });
  return shuffle(allocated);
}
const stageAllocation = allocation(
  stageTargets,
  seedApplicants,
  (item) => item[3],
);
const programAllocation = allocation(
  programTargets,
  seedApplicants,
  (item) => item[1],
);
const monthAllocation = allocation(monthTargets, seedApplicants, (item) =>
  item[2].slice(5, 7),
);
const sourceAllocation = allocation(sourceTargets, [], (item) => item);
const uniqueNames = new Set(seedApplicants.map((item) => item[0]));
const records = [...seedApplicants];
for (let nameIndex = 0; records.length < 2540; nameIndex++) {
  const name = `${firstNames[nameIndex % firstNames.length]} ${surnames[Math.floor(nameIndex / firstNames.length) % surnames.length]}`;
  if (uniqueNames.has(name)) continue;
  uniqueNames.add(name);
  const generatedIndex = records.length - seedApplicants.length;
  const month = monthAllocation[generatedIndex];
  const day =
    month === "11"
      ? 1 + nextInt(2)
      : 1 + nextInt(month === "06" || month === "09" ? 30 : 31);
  records.push([
    name,
    programAllocation[generatedIndex],
    `2026-${month}-${String(day).padStart(2, "0")}`,
    stageAllocation[generatedIndex],
    colors[records.length % colors.length],
  ]);
}
data.applications = records.map(
  ([name, programId, appliedOn, status, avatarColor], index) => {
    const id = formatId("OL", index + 1);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const skills = skillSets[index % skillSets.length];
    const program =
      programId === "explorer" ? "Tech Explorer" : "Tech Innovator";
    const history = [
      {
        id: `${id}-history-1`,
        title: "Application received",
        date: appliedOn,
        detail: `Applied to the ${program} program.`,
      },
    ];
    if (status !== "Applied")
      history.push({
        id: `${id}-history-2`,
        title: "Application reviewed",
        date: plusDays(appliedOn, 1),
        detail:
          "Profile and learning interests reviewed by the internship team.",
      });
    if (!["Applied", "Under Review"].includes(status))
      history.push({
        id: `${id}-history-3`,
        title:
          status === "Joined"
            ? "Selected for the program"
            : `Application ${status.toLowerCase()}`,
        date: plusDays(appliedOn, 2),
        detail:
          status === "Rejected"
            ? "Application closed after the review process."
            : `Application moved to ${status === "Joined" ? "Selected" : status}.`,
      });
    if (status === "Joined")
      history.push({
        id: `${id}-history-4`,
        title: "Intern onboarded",
        date: plusDays(appliedOn, 4),
        detail: "Completed orientation and joined the internship cohort.",
      });
    return {
      id,
      name,
      email: `${slug}.${String(index + 1).padStart(4, "0")}@example.com`,
      programId,
      program,
      appliedOn,
      status,
      initials: name
        .split(" ")
        .map((part) => part[0])
        .join(""),
      avatarColor,
      college: colleges[index % colleges.length],
      phone: `+91 00000 ${String(index + 10000)}`,
      location: locations[index % locations.length],
      skills,
      github: `https://example.com/github/${slug}`,
      linkedin: `https://example.com/linkedin/${slug}`,
      bio: `An aspiring ${skills.includes("UI/UX Design") ? "product designer" : skills.includes("Machine Learning") ? "AI engineer" : "software developer"} interested in practical projects, thoughtful collaboration, and learning with the Olentra community.`,
      resumeSummary: `Computer science student at ${colleges[index % colleges.length]} with hands-on experience in ${skills.slice(0, -1).join(", ")} and ${skills.at(-1)}. Built academic projects and contributed to a collaborative student portfolio.`,
      history,
      notes: [],
      projectIds: [],
      source: sourceAllocation[index],
    };
  },
);
const joinedApplicants = data.applications.filter(
  (applicant) => applicant.status === "Joined",
);
data.interns = joinedApplicants.map((applicant, index) => ({
  id: formatId("INT", index + 1),
  applicationId: applicant.id,
  batch: "Nov 2026",
  joinedOn: plusDays(applicant.appliedOn, 4),
  status: index < 520 ? "Active" : index < 700 ? "Completed" : "Dropped",
  projectIds: [],
}));
const activeInterns = data.interns.filter(
  (intern) => intern.status === "Active",
);
const byApplicant = new Map(
  data.applications.map((applicant) => [applicant.id, applicant]),
);
let teamOffset = 0;
data.projects = [
  {
    id: "PRJ-001",
    name: "AI-Powered Analytics Dashboard",
    description:
      "Transform complex data into clear insights with intelligent analytics, live metrics, and beautiful visualizations.",
    status: "In progress",
    program: "Tech Innovator",
    progress: 78,
    teamSize: 24,
    art: "planet",
    dueOn: "2026-11-30",
    createdOn: "2026-10-05",
    skills: ["React", "Python", "Data Analysis"],
  },
  {
    id: "PRJ-002",
    name: "Next Gen E-commerce Platform",
    description:
      "Create a seamless shopping experience with a modern storefront, secure checkout, and a powerful seller portal.",
    status: "In progress",
    program: "Tech Explorer",
    progress: 62,
    teamSize: 18,
    art: "cube",
    dueOn: "2026-12-10",
    createdOn: "2026-10-12",
    skills: ["React", "Node.js", "UI/UX Design"],
  },
  {
    id: "PRJ-003",
    name: "Supply Chain Optimizer",
    description:
      "Build smarter inventory planning and delivery workflows that connect teams, simplify operations, and reduce waste.",
    status: "In review",
    program: "Tech Innovator",
    progress: 92,
    teamSize: 12,
    art: "sphere",
    dueOn: "2026-11-15",
    createdOn: "2026-09-20",
    skills: ["Python", "SQL", "Machine Learning"],
  },
].map(({ teamSize, ...project }) => {
  const assigned = activeInterns.slice(teamOffset, teamOffset + teamSize);
  teamOffset += teamSize;
  const team = assigned.map((intern) => {
    intern.projectIds.push(project.id);
    byApplicant.get(intern.applicationId).projectIds.push(project.id);
    return intern.applicationId;
  });
  return { ...project, team };
});
const contributionDescriptions = [
  "Added interactive chart filters and improved the applications overview.",
  "Completed the analytics API integration and updated the data model.",
  "Refined the product listing layout and mobile shopping experience.",
  "Built the checkout flow and added form validation.",
  "Improved inventory forecasting and added a stock insights report.",
  "Updated the delivery status dashboard and project documentation.",
];
data.contributions = contributionDescriptions.map((description, index) => {
  const project = data.projects[Math.floor(index / 2)];
  return {
    id: `CONTRIB-${String(index + 1).padStart(3, "0")}`,
    projectId: project.id,
    applicationId: project.team[index % 2],
    description,
    time: [
      "12 min ago",
      "38 min ago",
      "1 hour ago",
      "2 hours ago",
      "3 hours ago",
      "4 hours ago",
    ][index],
    occurredOn: `2026-11-02T${String(14 - index).padStart(2, "0")}:00:00.000Z`,
  };
});
data.certificates = data.interns
  .filter((intern) => intern.status === "Completed")
  .map((intern, index) => {
    const applicant = byApplicant.get(intern.applicationId);
    return {
      id: formatId("CERT", index + 1),
      internId: intern.id,
      applicationId: applicant.id,
      recipient: applicant.name,
      program: applicant.program,
      programId: applicant.programId,
      issuedOn: plusDays(intern.joinedOn, 20 + (index % 14)),
      status: "Issued",
      certificateNumber: `OLENTRA-2026-${String(index + 1).padStart(4, "0")}`,
    };
  });
const completedApplicant = byApplicant.get(data.certificates[0].applicationId);
data.activity = [
  {
    id: "activity-001",
    event: "application",
    title: "New application received",
    detail: "from Arjun Sharma – Tech Innovator",
    time: "2 min ago",
    tone: "blue",
    icon: "application",
    unread: true,
  },
  {
    id: "activity-002",
    event: "shortlisted",
    title: "Application shortlisted",
    detail: "Sneha Reddy – Tech Explorer",
    time: "5 min ago",
    tone: "green",
    icon: "users",
    unread: true,
  },
  {
    id: "activity-003",
    event: "certificate",
    title: "Certificate generated",
    detail: completedApplicant.name,
    time: "12 min ago",
    tone: "orange",
    icon: "certificate",
    unread: true,
  },
  {
    id: "activity-004",
    event: "application",
    title: "New application received",
    detail: "from Divya Patel – Tech Explorer",
    time: "18 min ago",
    tone: "purple",
    icon: "application",
    unread: false,
  },
];
data.settings = {
  ...data.settings,
  programEnabled: true,
  explorerEnabled: true,
  innovatorEnabled: true,
  maxStipend: 20000,
  programName: "Olentra Internship Program",
  defaultBatch: "Nov 2026",
  reviewReminder: true,
  integrations: { github: false, slack: false, googleDrive: false },
};
const skillCounts = {};
data.applications.forEach((applicant) =>
  applicant.skills.forEach((skill) => {
    skillCounts[skill] = (skillCounts[skill] || 0) + 1;
  }),
);
data.analytics = {
  views: 4820,
  previousMonths: ["Dec", "Jan", "Feb", "Mar", "Apr", "May"].map((label) => ({
    label,
    explorer: 0,
    innovator: 0,
  })),
  months: ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"].map((label, index) => {
    const month = String(index + 6).padStart(2, "0");
    const applicants = data.applications.filter(
      (applicant) => applicant.appliedOn.slice(5, 7) === month,
    );
    return {
      label,
      explorer: applicants.filter(
        (applicant) => applicant.programId === "explorer",
      ).length,
      innovator: applicants.filter(
        (applicant) => applicant.programId === "innovator",
      ).length,
    };
  }),
  skills: Object.entries(skillCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count })),
  source: Object.keys(sourceTargets).map((name) => ({
    name,
    count: data.applications.filter((applicant) => applicant.source === name)
      .length,
  })),
  periods: ["3m", "6m", "1y"],
};
// Validate actual records, not merely headline labels.
assert.equal(data.applications.length, 2540);
assert.equal(
  new Set(data.applications.map((applicant) => applicant.id)).size,
  2540,
);
assert.equal(
  new Set(data.applications.map((applicant) => applicant.name)).size,
  2540,
);
assert.equal(
  new Set(data.applications.map((applicant) => applicant.email)).size,
  2540,
);
Object.entries(stageTargets).forEach(([stage, count]) =>
  assert.equal(
    data.applications.filter((applicant) => applicant.status === stage).length,
    count,
    stage,
  ),
);
Object.entries(programTargets).forEach(([program, count]) =>
  assert.equal(
    data.applications.filter((applicant) => applicant.programId === program)
      .length,
    count,
    program,
  ),
);
assert.equal(
  data.applications.filter((applicant) =>
    ["Shortlisted", "Selected", "Joined"].includes(applicant.status),
  ).length,
  1820,
);
assert.equal(
  data.applications.filter((applicant) =>
    ["Selected", "Joined"].includes(applicant.status),
  ).length,
  920,
);
assert.equal(data.interns.length, 740);
assert.equal(
  data.interns.filter((intern) => intern.status === "Active").length,
  520,
);
assert.equal(
  data.interns.filter((intern) => intern.status === "Completed").length,
  180,
);
assert.equal(
  data.interns.filter((intern) => intern.status === "Dropped").length,
  40,
);
data.interns.forEach((intern) =>
  assert.equal(byApplicant.get(intern.applicationId).status, "Joined"),
);
data.projects.forEach((project) =>
  project.team.forEach((applicationId) => {
    assert(byApplicant.get(applicationId).projectIds.includes(project.id));
    assert(
      data.interns.some(
        (intern) =>
          intern.applicationId === applicationId &&
          intern.projectIds.includes(project.id),
      ),
    );
  }),
);
assert.equal(data.certificates.length, 180);
data.certificates.forEach((certificate) => {
  const intern = data.interns.find((item) => item.id === certificate.internId);
  assert.equal(intern.status, "Completed");
  assert.equal(certificate.applicationId, intern.applicationId);
  assert(certificate.issuedOn >= intern.joinedOn);
});
assert(
  !data.certificates.some(
    (certificate) => certificate.recipient === "Rahul Verma",
  ),
);
assert.equal(
  data.analytics.months.reduce(
    (sum, month) => sum + month.explorer + month.innovator,
    0,
  ),
  2540,
);
assert.equal(
  data.analytics.source.reduce((sum, source) => sum + source.count, 0),
  2540,
);
assert(
  data.applications.every((applicant) => applicant.appliedOn <= "2026-11-02"),
);
fs.writeFileSync(fixturePath, JSON.stringify(data, null, 2) + "\n");
console.log(
  `Generated and validated ${data.applications.length} applications, ${data.interns.length} interns, ${data.projects.length} projects, and ${data.certificates.length} certificates.`,
);
console.log(
  `Stages: ${JSON.stringify(stageTargets)}; tracks: ${JSON.stringify(programTargets)}.`,
);
