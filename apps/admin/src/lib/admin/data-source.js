import core from "../../data/admin/core.json";
import content from "../../data/admin/content.json";
import operations from "../../data/admin/operations.json";
import governance from "../../data/admin/governance.json";
import { createInitialState } from "./model.mjs";

export const initialDatabase = createInitialState([core, content, operations, governance]);
