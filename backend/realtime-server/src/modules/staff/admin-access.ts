import type { ClientSession } from "mongodb";
import type { createInternshipDomain } from "../../app/command-dispatcher";
import { DomainError } from "../../shared/errors";
import { id } from "../../shared/ids";

/** Operator-only account changes; the CLI owns configuration and email delivery. */
export function createAdminAccess(domain: ReturnType<typeof createInternshipDomain>) {
  const accounts = domain.collection("accounts"), credentials = domain.collection("test_credentials"), sessions = domain.collection("sessions");
  const settings = domain.collection("settings"), events = domain.collection("events"), audit = domain.collection("staff_audit");
  async function transaction<T>(operation: (session: ClientSession) => Promise<T>): Promise<T> {
    const session = domain.client.startSession();
    try {
      let result!: T;
      await session.withTransaction(async () => {
        // Share the dashboard's membership fence, including its last-admin check.
        await settings.updateOne({ _id: "staff_admin_guard" }, { $inc: { revision: 1 } }, { session });
        result = await operation(session);
      });
      return result;
    } finally { await session.endSession(); }
  }
  async function announce(accountId: string, action: string, session: ClientSession) {
    const createdAt = new Date();
    await audit.insertOne({ _id: id("AUD"), action: `adminAccess.${action}`, actorId: "admin-access CLI", actorName: "Server operator", targetId: accountId, detail: {}, createdAt }, { session });
    await events.insertOne({ _id: id("EVT"), type: "staff.changed", staffAccountIds: [accountId], action, actor: "admin-access CLI", createdAt }, { session });
  }
  return {
    async list() {
      const staff = await accounts.find({ role: "company" }, { projection: { email: 1, name: 1, staffRole: 1, disabled: 1 } }).sort({ email: 1 }).toArray();
      const withPassword = new Set((await credentials.find({ userId: { $in: staff.map(row => row._id) } }, { projection: { userId: 1 } }).toArray()).map(row => row.userId));
      return staff.map(row => ({ _id: row._id, email: row.email, name: row.name, staffRole: row.staffRole, disabled: row.disabled === true, hasPassword: withPassword.has(row._id) }));
    },
    create(email: string, name: string) {
      return transaction(async session => {
        if (await accounts.findOne({ email }, { session })) throw new DomainError("CONFLICT", `An account already exists for ${email}. Use "reset" to recover it.`);
        const account = { _id: id("ACC"), role: "company", staffRole: "admin", name, email, applicationId: null, sessionVersion: 1, disabled: false, createdAt: new Date() };
        await accounts.insertOne(account, { session });
        await announce(account._id, "created", session);
        return account;
      });
    },
    reset(email: string) {
      return transaction(async session => {
        const account = await accounts.findOne({ email }, { session });
        if (!account) throw new DomainError("NOT_FOUND", `No account exists for ${email}. Use "create" instead.`);
        if (account.role !== "company") throw new DomainError("FORBIDDEN", `${email} is an intern account, not staff.`);
        const updated = await accounts.findOneAndUpdate({ _id: account._id }, [{ $set: { staffRole: "admin", disabled: false, updatedAt: new Date(), sessionVersion: { $add: [{ $ifNull: ["$sessionVersion", 1] }, 1] } } }], { returnDocument: "after", session });
        await sessions.updateMany({ userId: account._id }, { $set: { revoked: true } }, { session });
        await announce(account._id, "reset", session);
        return updated!;
      });
    },
    delete(email: string) {
      return transaction(async session => {
        const account = await accounts.findOne({ email }, { session });
        if (!account) throw new DomainError("NOT_FOUND", `No account exists for ${email}.`);
        if (account.role !== "company") throw new DomainError("FORBIDDEN", `${email} is an intern account; this tool only removes staff accounts.`);
        if (account.staffRole === "admin" && account.disabled !== true && await accounts.countDocuments({ role: "company", staffRole: "admin", disabled: { $ne: true } }, { session }) <= 1) {
          throw new DomainError("CONFLICT", "Refusing to delete the last active admin. Create another admin first.");
        }
        await sessions.deleteMany({ userId: account._id }, { session });
        await credentials.deleteMany({ userId: account._id }, { session });
        await accounts.deleteOne({ _id: account._id }, { session });
        await announce(account._id, "deleted", session);
        return account;
      });
    },
  };
}
