import { createContactHandler } from "../../domain/contact/contact.service";
import type { ContactConfig } from "../../domain/contact/types";
import { MAX_BODY } from "../../domain/contact/validation";
import { logger } from "../../observability/logger";
import { requestId } from "./middleware";

export function createContactRoute(config: ContactConfig) {
  const contact = createContactHandler(config);
  return {
    contact,
    async contactWithObservability(request: Request) {
      const id = requestId(request);
      const response = await contact(request);
      logger.info("Contact request completed", { requestId: id, status: response.status });
      return response;
    },
    maxBodySize: MAX_BODY,
  };
}
